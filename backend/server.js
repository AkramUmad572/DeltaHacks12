import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Configuration, MarketApi, EventsApi } from 'kalshi-typescript';
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

// Score an event based on search relevance
function scoreEventRelevance(event, searchTerm) {
  let score = 0;
  const lowerTerm = searchTerm.toLowerCase();
  const words = lowerTerm.split(/\s+/).filter(w => w.length > 0);
  
  // Helper to check if text matches and calculate score
  const scoreMatch = (text, baseScore, exactBonus = 0) => {
    if (!text) return 0;
    const lowerText = text.toLowerCase();
    
    // Exact match gets highest score
    if (lowerText === lowerTerm) {
      return baseScore * 3 + exactBonus;
    }
    
    // Starts with search term
    if (lowerText.startsWith(lowerTerm)) {
      return baseScore * 2 + exactBonus;
    }
    
    // Word boundary match (whole word)
    const wordBoundaryRegex = new RegExp(`\\b${lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordBoundaryRegex.test(lowerText)) {
      return baseScore * 1.5;
    }
    
    // Contains search term
    if (lowerText.includes(lowerTerm)) {
      return baseScore;
    }
    
    // Multi-word: check if all words are present
    if (words.length > 1) {
      const allWordsPresent = words.every(word => lowerText.includes(word));
      if (allWordsPresent) {
        return baseScore * 0.8;
      }
    }
    
    return 0;
  };
  
  // Score event title (highest priority)
  score += scoreMatch(event.title, 100, 50);
  
  // Score event subtitle
  score += scoreMatch(event.sub_title, 30);
  
  // Score market titles (check all markets, take best match)
  let bestMarketScore = 0;
  if (event.markets && event.markets.length > 0) {
    for (const market of event.markets) {
      const marketScore = 
        scoreMatch(market.title, 40) +
        scoreMatch(market.subtitle, 25) +
        scoreMatch(market.yes_sub_title, 20) +
        scoreMatch(market.no_sub_title, 20);
      bestMarketScore = Math.max(bestMarketScore, marketScore);
    }
    score += bestMarketScore;
  }
  
  // Score tickers (lower priority)
  score += scoreMatch(event.event_ticker, 10) * 0.5;
  score += scoreMatch(event.series_ticker, 10) * 0.5;
  
  // Category matching is deprioritized to prevent false positives
  // Only exact category matches get a minimal score (e.g., searching "Politics" when category is "Politics")
  // This prevents "Trump" from matching all "Politics" category items
  if (event.category) {
    const categoryLower = event.category.toLowerCase();
    if (categoryLower === lowerTerm) {
      score += 5; // Exact category match only, very low score
    }
    // No partial category matching - too broad and causes false positives
  }
  
  return score;
}

// MAIN SEARCH - Search across ALL events and markets with relevance scoring
app.get('/api/search', async (req, res) => {
  try {
    const { query, category, limit = 50 } = req.query;

    const allEvents = await getAllEvents();
    
    let eventsToSearch = allEvents;

    // Filter by category if provided
    if (category && category !== 'All') {
      eventsToSearch = eventsToSearch.filter(e => 
        e.category?.toLowerCase() === category.toLowerCase()
      );
    }

    let scoredEvents = eventsToSearch;

    // Score and filter by search query if provided
    if (query && query.trim()) {
      const searchTerm = query.trim();
      
      // Score all events
      scoredEvents = eventsToSearch
        .map(event => ({
          event,
          score: scoreEventRelevance(event, searchTerm)
        }))
        .filter(item => item.score > 0) // Only keep events with non-zero scores
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .map(item => item.event); // Extract events
    }

    // Limit results
    const limitedEvents = scoredEvents.slice(0, parseInt(limit));

    res.json({
      events: limitedEvents,
      total: scoredEvents.length,
      returned: limitedEvents.length,
      query: query || null,
      category: category || 'All'
    });
  } catch (error) {
    console.error('Error searching:', error.message);
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

// Get single market
app.get('/api/markets/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const response = await marketApi.getMarket(ticker);
    res.json({ market: normalizeMarket(response.data.market) });
  } catch (error) {
    console.error('Error fetching market:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get market full details (with trades and orderbook)
app.get('/api/markets/:ticker/full', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const [marketRes, tradesRes, orderbookRes] = await Promise.all([
      marketApi.getMarket(ticker),
      marketApi.getTrades(500, undefined, ticker).catch(() => ({ data: { trades: [] } })),
      marketApi.getMarketOrderbook(ticker, 20).catch(() => ({ data: { orderbook: { yes: [], no: [] } } }))
    ]);

    res.json({
      market: normalizeMarket(marketRes.data.market),
      trades: tradesRes.data.trades || [],
      orderbook: orderbookRes.data.orderbook || { yes: [], no: [] }
    });
  } catch (error) {
    console.error('Error fetching market details:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Analyze market for suspicious trading activity
app.get('/api/markets/:ticker/analyze', async (req, res) => {
  try {
    const { ticker } = req.params;

    // Fetch market data, trades, and orderbook in parallel
    const [marketRes, tradesRes, orderbookRes] = await Promise.all([
      marketApi.getMarket(ticker),
      marketApi.getTrades(500, undefined, ticker).catch(() => ({ data: { trades: [] } })),
      marketApi.getMarketOrderbook(ticker, 20).catch(() => ({ data: { orderbook: { yes: [], no: [] } } }))
    ]);

    const market = marketRes.data.market;
    const trades = tradesRes.data.trades || [];
    const orderbook = orderbookRes.data.orderbook || { yes: [], no: [] };

    // Simple analysis placeholder - you can expand this
    const analysis = {
      suspicionScore: Math.floor(Math.random() * 100), // Placeholder
      riskLevel: 'LOW',
      confidence: 85,
      summary: 'Analysis not yet implemented',
      metrics: {
        totalTrades: trades.length,
        avgTradeSize: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.count || 0), 0) / trades.length : 0,
        timeSpan: trades.length > 0 ? 'N/A' : 'N/A',
        signalsAnalyzed: 0,
        signalsTriggered: 0
      },
      signals: [],
      allSignals: []
    };

    res.json({
      ticker,
      market: normalizeMarket(market),
      analysis,
      tradesAnalyzed: trades.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing market:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});
