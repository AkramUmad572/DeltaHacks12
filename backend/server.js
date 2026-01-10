import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Configuration, MarketApi, EventsApi, SearchApi } from 'kalshi-typescript';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Kalshi SDK configuration
let config;
let marketApi;
let eventsApi;
let searchApi;
let isAuthenticated = false;

// Cache for events (refresh every 5 minutes)
let eventsCache = {
  data: [],
  lastFetch: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

function initializeKalshiClient() {
  const apiKeyId = process.env.KALSHI_API_KEY_ID;
  const privateKeyPath = process.env.KALSHI_PRIVATE_KEY_PATH;
  const privateKeyPem = process.env.KALSHI_PRIVATE_KEY_PEM;

  if (!apiKeyId) {
    console.log('⚠️  No KALSHI_API_KEY_ID found - running in unauthenticated mode');
    console.log('   Public endpoints work fine without auth!');
    
    config = new Configuration({
      basePath: 'https://api.elections.kalshi.com/trade-api/v2'
    });
  } else {
    const configOptions = {
      apiKey: apiKeyId,
      basePath: 'https://api.elections.kalshi.com/trade-api/v2'
    };

    if (privateKeyPath && fs.existsSync(privateKeyPath)) {
      configOptions.privateKeyPath = privateKeyPath;
    } else if (privateKeyPem) {
      configOptions.privateKeyPem = privateKeyPem;
    }

    config = new Configuration(configOptions);
    isAuthenticated = true;
  }

  marketApi = new MarketApi(config);
  eventsApi = new EventsApi(config);
  searchApi = new SearchApi(config);
}

initializeKalshiClient();

// Normalize market data for frontend
function normalizeMarket(market) {
  return {
    ...market,
    yes_ask: (market.yes_ask || 0) / 100,
    no_ask: (market.no_ask || 0) / 100,
    yes_bid: (market.yes_bid || 0) / 100,
    no_bid: (market.no_bid || 0) / 100,
    last_price: (market.last_price || 0) / 100,
  };
}

// Fetch ALL events with pagination (cached)
async function getAllEvents(forceRefresh = false) {
  const now = Date.now();
  
  if (!forceRefresh && eventsCache.data.length > 0 && (now - eventsCache.lastFetch) < eventsCache.ttl) {
    return eventsCache.data;
  }

  console.log('📥 Fetching all events from Kalshi...');
  
  let allEvents = [];
  let cursor = undefined;
  let pageCount = 0;
  const maxPages = 10; // Safety limit

  try {
    do {
      const response = await eventsApi.getEvents(
        200, // max limit
        cursor,
        true, // withNestedMarkets
        false,
        undefined,
        undefined
      );

      const events = response.data.events || [];
      allEvents = allEvents.concat(events);
      cursor = response.data.cursor;
      pageCount++;

      console.log(`  Page ${pageCount}: ${events.length} events (total: ${allEvents.length})`);
    } while (cursor && pageCount < maxPages);

    // Normalize all markets
    allEvents = allEvents.map(event => ({
      ...event,
      markets: (event.markets || []).map(normalizeMarket)
    }));

    eventsCache.data = allEvents;
    eventsCache.lastFetch = now;

    console.log(`✅ Cached ${allEvents.length} events`);
    return allEvents;
  } catch (error) {
    console.error('Error fetching all events:', error.message);
    return eventsCache.data; // Return stale cache on error
  }
}

// Get categories from events
function getCategories(events) {
  const categoryMap = {};
  
  for (const event of events) {
    const cat = event.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { name: cat, count: 0 };
    }
    categoryMap[cat].count++;
  }

  return Object.values(categoryMap).sort((a, b) => b.count - a.count);
}

// ============== API ENDPOINTS ==============

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const events = await getAllEvents();
    const categories = getCategories(events);
    
    res.json({ categories });
  } catch (error) {
    console.error('Error getting categories:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get series list (with optional category filter)
app.get('/api/series', async (req, res) => {
  try {
    const { category, tags, includeProductMetadata } = req.query;
    
    const response = await marketApi.getSeriesList(
      category || undefined,
      tags || undefined,
      includeProductMetadata === 'true'
    );

    res.json({
      series: response.data.series || []
    });
  } catch (error) {
    console.error('Error fetching series:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get tags for categories
app.get('/api/tags', async (req, res) => {
  try {
    const response = await searchApi.getTagsForSeriesCategories();
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching tags:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// MAIN SEARCH - Search across ALL events and markets
app.get('/api/search', async (req, res) => {
  try {
    const { query, category, limit = 50 } = req.query;

    const allEvents = await getAllEvents();
    
    let filteredEvents = allEvents;

    // Filter by category if provided
    if (category && category !== 'All') {
      filteredEvents = filteredEvents.filter(e => 
        e.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search query if provided
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filteredEvents = filteredEvents.filter(event => {
        // Search in event fields
        const eventMatch = 
          event.title?.toLowerCase().includes(searchTerm) ||
          event.sub_title?.toLowerCase().includes(searchTerm) ||
          event.category?.toLowerCase().includes(searchTerm) ||
          event.event_ticker?.toLowerCase().includes(searchTerm) ||
          event.series_ticker?.toLowerCase().includes(searchTerm);

        // Also search in market titles
        const marketMatch = (event.markets || []).some(market =>
          market.title?.toLowerCase().includes(searchTerm) ||
          market.subtitle?.toLowerCase().includes(searchTerm) ||
          market.ticker?.toLowerCase().includes(searchTerm) ||
          market.yes_sub_title?.toLowerCase().includes(searchTerm) ||
          market.no_sub_title?.toLowerCase().includes(searchTerm)
        );

        return eventMatch || marketMatch;
      });
    }

    // Limit results
    const limitedEvents = filteredEvents.slice(0, parseInt(limit));

    res.json({
      events: limitedEvents,
      total: filteredEvents.length,
      returned: limitedEvents.length,
      query: query || null,
      category: category || 'All'
    });
  } catch (error) {
    console.error('Error searching:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get events by category
app.get('/api/events/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 50 } = req.query;

    const allEvents = await getAllEvents();
    
    let filteredEvents = allEvents;
    
    if (category && category !== 'All') {
      filteredEvents = allEvents.filter(e => 
        e.category?.toLowerCase() === category.toLowerCase()
      );
    }

    res.json({
      events: filteredEvents.slice(0, parseInt(limit)),
      total: filteredEvents.length,
      category
    });
  } catch (error) {
    console.error('Error fetching category events:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get popular/trending suggestions
app.get('/api/suggestions', async (req, res) => {
  try {
    const allEvents = await getAllEvents();
    
    // Get events with highest volume/open interest
    const suggestions = allEvents
      .filter(e => e.markets && e.markets.length > 0)
      .map(event => {
        const totalVolume = event.markets.reduce((sum, m) => sum + (m.volume || 0), 0);
        const totalOpenInterest = event.markets.reduce((sum, m) => sum + (m.open_interest || 0), 0);
        return { ...event, totalVolume, totalOpenInterest };
      })
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 20)
      .map(e => ({
        title: e.title,
        category: e.category,
        event_ticker: e.event_ticker,
        sub_title: e.sub_title,
        volume: e.totalVolume,
        marketCount: e.markets?.length || 0
      }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting suggestions:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all events (paginated, from cache)
app.get('/api/events', async (req, res) => {
  try {
    const { limit = 50, offset = 0, category, withNestedMarkets } = req.query;

    let events = await getAllEvents();
    
    if (category && category !== 'All') {
      events = events.filter(e => e.category?.toLowerCase() === category.toLowerCase());
    }

    const paginatedEvents = events.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      events: paginatedEvents,
      total: events.length,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search events (legacy endpoint - redirects to /api/search)
app.get('/api/events/search', async (req, res) => {
  try {
    const { query, limit = 50 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const allEvents = await getAllEvents();
    const searchTerm = query.toLowerCase();

    const filteredEvents = allEvents.filter(event => {
      const eventMatch = 
        event.title?.toLowerCase().includes(searchTerm) ||
        event.sub_title?.toLowerCase().includes(searchTerm) ||
        event.category?.toLowerCase().includes(searchTerm) ||
        event.event_ticker?.toLowerCase().includes(searchTerm);

      const marketMatch = (event.markets || []).some(market =>
        market.title?.toLowerCase().includes(searchTerm) ||
        market.subtitle?.toLowerCase().includes(searchTerm) ||
        market.ticker?.toLowerCase().includes(searchTerm)
      );

      return eventMatch || marketMatch;
    });

    res.json({
      events: filteredEvents.slice(0, parseInt(limit)),
      total: filteredEvents.length,
      query
    });
  } catch (error) {
    console.error('Error searching events:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get single event
app.get('/api/events/:eventTicker', async (req, res) => {
  try {
    const { eventTicker } = req.params;

    const response = await eventsApi.getEvent(eventTicker, true);
    const event = response.data.event;
    
    if (event.markets) {
      event.markets = event.markets.map(normalizeMarket);
    }

    res.json({
      event,
      markets: (response.data.markets || []).map(normalizeMarket)
    });
  } catch (error) {
    console.error('Error fetching event:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all markets (paginated)
app.get('/api/markets', async (req, res) => {
  try {
    const { limit = 100, cursor, status, eventTicker, seriesTicker } = req.query;

    const response = await marketApi.getMarkets(
      parseInt(limit),
      cursor || undefined,
      eventTicker || undefined,
      seriesTicker || undefined,
      undefined, undefined, undefined, undefined, undefined, undefined,
      status || undefined
    );

    const markets = (response.data.markets || []).map(normalizeMarket);

    res.json({
      markets,
      cursor: response.data.cursor,
      total: markets.length
    });
  } catch (error) {
    console.error('Error fetching markets:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search markets
app.get('/api/markets/search', async (req, res) => {
  try {
    const { query, limit = 200, status } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const response = await marketApi.getMarkets(
      parseInt(limit),
      undefined,
      undefined,
      undefined,
      undefined, undefined, undefined, undefined, undefined, undefined,
      status || undefined
    );

    const markets = response.data.markets || [];
    const searchTerm = query.toLowerCase();
    
    const filteredMarkets = markets.filter(market => {
      return (
        market.title?.toLowerCase().includes(searchTerm) ||
        market.ticker?.toLowerCase().includes(searchTerm) ||
        market.subtitle?.toLowerCase().includes(searchTerm) ||
        market.rules_primary?.toLowerCase().includes(searchTerm)
      );
    }).map(normalizeMarket);

    res.json({
      markets: filteredMarkets,
      total: filteredMarkets.length,
      query
    });
  } catch (error) {
    console.error('Error fetching markets:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get single market
app.get('/api/markets/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const response = await marketApi.getMarket(ticker);
    
    res.json({
      market: normalizeMarket(response.data.market)
    });
  } catch (error) {
    console.error('Error fetching market:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get market trades
app.get('/api/markets/:ticker/trades', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { limit = 100, cursor } = req.query;

    const response = await marketApi.getTrades(
      parseInt(limit),
      cursor || undefined,
      ticker
    );

    const trades = (response.data.trades || []).map(trade => ({
      ...trade,
      yes_price: (trade.yes_price || 0) / 100,
      no_price: (trade.no_price || 0) / 100,
    }));

    res.json({
      trades,
      cursor: response.data.cursor
    });
  } catch (error) {
    console.error('Error fetching trades:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get market orderbook
app.get('/api/markets/:ticker/orderbook', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { depth = 10 } = req.query;

    const response = await marketApi.getMarketOrderbook(ticker, parseInt(depth));

    res.json({
      orderbook: response.data.orderbook
    });
  } catch (error) {
    console.error('Error fetching orderbook:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Refresh cache endpoint
app.post('/api/refresh', async (req, res) => {
  try {
    await getAllEvents(true);
    res.json({ status: 'ok', message: 'Cache refreshed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    authenticated: isAuthenticated,
    sdk: 'kalshi-typescript',
    cachedEvents: eventsCache.data.length,
    cacheAge: eventsCache.lastFetch ? Math.round((Date.now() - eventsCache.lastFetch) / 1000) + 's' : 'not cached'
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Using Kalshi TypeScript SDK`);
  console.log(`🔐 Authentication: ${isAuthenticated ? 'Enabled' : 'Not needed for public data'}`);
  
  // Pre-fetch events on startup
  console.log('');
  await getAllEvents();
});
