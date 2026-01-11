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

// Lock to prevent concurrent calls to getAllEvents
let isFetching = false;
let fetchPromise = null;

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

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch ALL events with pagination (cached)
async function getAllEvents(forceRefresh = false) {
  const now = Date.now();
  
  // Return cached data if still valid
  if (!forceRefresh && eventsCache.data.length > 0 && (now - eventsCache.lastFetch) < eventsCache.ttl) {
    return eventsCache.data;
  }

  // If already fetching, wait for the existing fetch to complete
  if (isFetching && fetchPromise) {
    return fetchPromise;
  }

  // Start new fetch
  fetchPromise = (async () => {
    if (isFetching) {
      // Another call started while we were waiting, use that one
      return fetchPromise;
    }

    isFetching = true;
    console.log('📥 Fetching all events from Kalshi...');
    
    let allEvents = [];
    let cursor = undefined;
    let pageCount = 0;
    const maxPages = 10; // Safety limit
    const delayBetweenRequests = 500; // 500ms delay between requests to avoid rate limiting

    try {
      do {
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
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
            success = true;

            console.log(`  Page ${pageCount}: ${events.length} events (total: ${allEvents.length})`);
            
            // Add delay between requests to avoid rate limiting (except for last request)
            if (cursor && pageCount < maxPages) {
              await delay(delayBetweenRequests);
            }
          } catch (error) {
            // Handle rate limiting (429) with exponential backoff
            if (error.response?.status === 429 || error.message?.includes('429')) {
              retries--;
              if (retries > 0) {
                const backoffDelay = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
                console.log(`  ⚠️  Rate limited (429), retrying in ${backoffDelay}ms... (${retries} retries left)`);
                await delay(backoffDelay);
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
        }
      } while (cursor && pageCount < maxPages);

      // Normalize all markets
      allEvents = allEvents.map(event => ({
        ...event,
        markets: (event.markets || []).map(normalizeMarket)
      }));

      eventsCache.data = allEvents;
      eventsCache.lastFetch = Date.now();

      console.log(`✅ Cached ${allEvents.length} events`);
      return allEvents;
    } catch (error) {
      console.error('Error fetching all events:', error.message);
      // Return stale cache if available, otherwise empty array
      return eventsCache.data.length > 0 ? eventsCache.data : [];
    } finally {
      isFetching = false;
      fetchPromise = null;
    }
  })();

  return fetchPromise;
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

// Get trending markets based on volume changes, probability movement, and activity
app.get('/api/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const allEvents = await getAllEvents();
    
    // Extract all markets from events and calculate trending scores
    const allMarkets = [];
    
    for (const event of allEvents) {
      if (event.markets && event.markets.length > 0) {
        for (const market of event.markets) {
          // Calculate trending score based on multiple factors
          const volume = market.volume || 0;
          const openInterest = market.open_interest || 0;
          const yesBid = market.yes_bid || 0;
          const lastPrice = market.last_price || 0;
          
          // Score factors:
          // 1. High volume (weight: 40%)
          // 2. High open interest (weight: 30%)
          // 3. Price movement indicator (weight: 20%) - markets closer to 50% are more volatile
          // 4. Recent activity (weight: 10%) - using volume as proxy
          
          const volumeScore = Math.min(volume / 10000, 1) * 40; // Normalize to 0-40
          const openInterestScore = Math.min(openInterest / 50000, 1) * 30; // Normalize to 0-30
          const priceVolatility = Math.abs((yesBid || lastPrice) - 0.5) * 2; // Distance from 50%
          const volatilityScore = (1 - priceVolatility) * 20; // Higher score for markets near 50%
          const activityScore = Math.min(volume / 5000, 1) * 10; // Normalize to 0-10
          
          const trendingScore = volumeScore + openInterestScore + volatilityScore + activityScore;
          
          allMarkets.push({
            ticker: market.ticker,
            title: market.yes_sub_title || market.subtitle || market.title || event.title,
            category: event.category || 'Uncategorized',
            event_title: event.title,
            trendingScore,
            volume,
            openInterest,
            yesBid: yesBid || lastPrice,
            event_ticker: event.event_ticker
          });
        }
      }
    }
    
    // Sort by trending score and return top markets
    const trendingMarkets = allMarkets
      .filter(m => m.trendingScore > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, parseInt(limit))
      .map(m => ({
        ticker: m.ticker,
        title: m.title,
        category: m.category,
        event_title: m.event_title,
        volume: m.volume,
        openInterest: m.openInterest,
        yesBid: m.yesBid,
        event_ticker: m.event_ticker
      }));

    res.json({ 
      markets: trendingMarkets,
      total: trendingMarkets.length
    });
  } catch (error) {
    console.error('Error getting trending markets:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get trending events (high volume/activity) - using Kalshi API
app.get('/api/trending-events', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('📊 Fetching trending events...');
    const allEvents = await getAllEvents();
    console.log(`   Total events from Kalshi: ${allEvents.length}`);
    
    // Calculate trending score based on volume and activity
    const eventsWithScores = allEvents
      .filter(e => e.markets && e.markets.length > 0)
      .map(event => {
        const totalVolume = event.markets.reduce((sum, m) => sum + (m.volume || 0), 0);
        const totalOpenInterest = event.markets.reduce((sum, m) => sum + (m.open_interest || 0), 0);
        
        // Trending score: prioritize high volume and open interest
        const trendingScore = totalVolume * 2 + totalOpenInterest;
        
        return { ...event, trendingScore, totalVolume, totalOpenInterest };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, parseInt(limit));

    // Remove scoring fields before returning
    const cleanEvents = eventsWithScores.map(({ trendingScore, totalVolume, totalOpenInterest, ...event }) => event);

    console.log(`   Returning ${cleanEvents.length} trending events`);
    res.json({ 
      events: cleanEvents,
      total: allEvents.length,
      returned: cleanEvents.length
    });
  } catch (error) {
    console.error('Error getting trending events:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get breaking news events (high recent activity) - using Kalshi API
app.get('/api/breaking-events', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔥 Fetching breaking news events...');
    const allEvents = await getAllEvents();
    console.log(`   Total events from Kalshi: ${allEvents.length}`);
    
    // Breaking news: high volume indicates recent activity/interest
    const eventsWithScores = allEvents
      .filter(e => e.markets && e.markets.length > 0)
      .map(event => {
        const totalVolume = event.markets.reduce((sum, m) => sum + (m.volume || 0), 0);
        const totalOpenInterest = event.markets.reduce((sum, m) => sum + (m.open_interest || 0), 0);
        
        // Breaking news score: prioritize very high volume (recent activity)
        const breakingScore = totalVolume * 3 + totalOpenInterest;
        
        return { ...event, breakingScore, totalVolume, totalOpenInterest };
      })
      .sort((a, b) => b.breakingScore - a.breakingScore)
      .slice(0, parseInt(limit));

    // Remove scoring fields before returning
    const cleanEvents = eventsWithScores.map(({ breakingScore, totalVolume, totalOpenInterest, ...event }) => event);

    console.log(`   Returning ${cleanEvents.length} breaking news events`);
    res.json({ 
      events: cleanEvents,
      total: allEvents.length,
      returned: cleanEvents.length
    });
  } catch (error) {
    console.error('Error getting breaking events:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get new events (recently created) - using Kalshi API
app.get('/api/new-events', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('✨ Fetching new events...');
    const allEvents = await getAllEvents();
    console.log(`   Total events from Kalshi: ${allEvents.length}`);
    
    // New markets: low volume but some open interest (recently created, not yet heavily traded)
    const eventsWithScores = allEvents
      .filter(e => e.markets && e.markets.length > 0)
      .map(event => {
        const totalVolume = event.markets.reduce((sum, m) => sum + (m.volume || 0), 0);
        const totalOpenInterest = event.markets.reduce((sum, m) => sum + (m.open_interest || 0), 0);
        
        // New markets score: prioritize low volume but growing open interest
        // This identifies markets that are new (haven't traded much) but are gaining interest
        const newnessScore = totalOpenInterest * 2 - (totalVolume * 0.3);
        
        return { ...event, newnessScore, totalVolume, totalOpenInterest };
      })
      .filter(e => e.newnessScore > 0) // Only include markets with positive score
      .sort((a, b) => b.newnessScore - a.newnessScore)
      .slice(0, parseInt(limit));

    // Remove scoring fields before returning
    const cleanEvents = eventsWithScores.map(({ newnessScore, totalVolume, totalOpenInterest, ...event }) => event);

    console.log(`   Returning ${cleanEvents.length} new events`);
    res.json({ 
      events: cleanEvents,
      total: allEvents.length,
      returned: cleanEvents.length
    });
  } catch (error) {
    console.error('Error getting new events:', error.message);
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
