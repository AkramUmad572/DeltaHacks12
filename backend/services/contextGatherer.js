import { MarketApi, EventsApi } from 'kalshi-typescript';

/**
 * Context Gatherer Service
 * Intelligently gathers market data, trades, and patterns based on user queries
 */

// Normalize market data
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

/**
 * Parse user query to extract relevant information
 */
export function parseQuery(query) {
  const lowerQuery = query.toLowerCase();
  const parsed = {
    marketTickers: [],
    eventNames: [],
    eventTickers: [],
    timeRanges: [],
    metrics: [],
    categories: []
  };

  // Extract market tickers (format: TICKER-* or mentions of tickers)
  const tickerPattern = /\b([A-Z]{2,}-[A-Z0-9]+)\b/g;
  const tickerMatches = query.match(tickerPattern);
  if (tickerMatches) {
    parsed.marketTickers = tickerMatches;
  }

  // Extract event names (common patterns)
  const eventKeywords = ['election', 'president', 'trump', 'biden', 'bitcoin', 'crypto', 'stock', 'market'];
  eventKeywords.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      parsed.eventNames.push(keyword);
    }
  });

  // Extract time ranges
  const timePatterns = [
    /(last|past|previous)\s+(\d+)\s*(hour|day|week|month|year)s?/i,
    /(\d+)\s*(hour|day|week|month|year)s?\s+ago/i,
    /(today|yesterday|this week|this month)/i
  ];
  timePatterns.forEach(pattern => {
    const match = query.match(pattern);
    if (match) {
      parsed.timeRanges.push(match[0]);
    }
  });

  // Extract metrics
  const metrics = ['volume', 'price', 'trades', 'orderbook', 'open interest', 'volatility'];
  metrics.forEach(metric => {
    if (lowerQuery.includes(metric)) {
      parsed.metrics.push(metric);
    }
  });

  // Extract categories
  const categories = ['politics', 'crypto', 'sports', 'economics', 'climate', 'world', 'science', 'companies', 'entertainment', 'health', 'elections'];
  categories.forEach(cat => {
    if (lowerQuery.includes(cat)) {
      parsed.categories.push(cat);
    }
  });

  return parsed;
}

/**
 * Gather market data for a specific ticker
 */
export async function gatherMarketData(marketApi, ticker) {
  try {
    const response = await marketApi.getMarket(ticker);
    return normalizeMarket(response.data.market);
  } catch (error) {
    console.error(`Error fetching market ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Gather trade history for a market
 */
export async function gatherTradeHistory(marketApi, ticker, limit = 100) {
  try {
    const response = await marketApi.getTrades(
      parseInt(limit),
      undefined,
      ticker
    );

    const trades = (response.data.trades || []).map(trade => ({
      ...trade,
      yes_price: (trade.yes_price || 0) / 100,
      no_price: (trade.no_price || 0) / 100,
    }));

    return trades;
  } catch (error) {
    console.error(`Error fetching trades for ${ticker}:`, error.message);
    return [];
  }
}

/**
 * Gather orderbook data for a market
 */
export async function gatherOrderbook(marketApi, ticker, depth = 10) {
  try {
    const response = await marketApi.getMarketOrderbook(ticker, parseInt(depth));
    return response.data.orderbook || {};
  } catch (error) {
    console.error(`Error fetching orderbook for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Search for markets by query string
 */
export async function searchMarkets(marketApi, query, limit = 20) {
  try {
    const response = await marketApi.getMarkets(
      parseInt(limit),
      undefined,
      undefined,
      undefined,
      undefined, undefined, undefined, undefined, undefined, undefined,
      undefined
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

    return filteredMarkets.slice(0, limit);
  } catch (error) {
    console.error(`Error searching markets:`, error.message);
    return [];
  }
}

/**
 * Gather events data
 */
export async function gatherEvents(eventsApi, query, limit = 10) {
  try {
    const response = await eventsApi.getEvents(
      parseInt(limit),
      undefined,
      true, // withNestedMarkets
      false,
      undefined,
      undefined
    );

    const events = response.data.events || [];
    const searchTerm = query.toLowerCase();

    const filteredEvents = events.filter(event => {
      return (
        event.title?.toLowerCase().includes(searchTerm) ||
        event.sub_title?.toLowerCase().includes(searchTerm) ||
        event.category?.toLowerCase().includes(searchTerm) ||
        event.event_ticker?.toLowerCase().includes(searchTerm)
      );
    });

    return filteredEvents.map(event => ({
      ...event,
      markets: (event.markets || []).map(normalizeMarket)
    }));
  } catch (error) {
    console.error(`Error fetching events:`, error.message);
    return [];
  }
}

/**
 * Main function to gather all relevant context based on user query
 */
export async function gatherContext(marketApi, eventsApi, query, getAllEventsFn) {
  const parsed = parseQuery(query);
  const context = {
    query: query,
    parsed: parsed,
    markets: [],
    trades: [],
    orderbooks: [],
    events: [],
    patterns: null,
    summary: ''
  };

  // If specific tickers mentioned, gather their data
  if (parsed.marketTickers.length > 0) {
    for (const ticker of parsed.marketTickers.slice(0, 5)) { // Limit to 5 tickers
      const market = await gatherMarketData(marketApi, ticker);
      if (market) {
        context.markets.push(market);
        
        // Gather trades and orderbook for this market
        const trades = await gatherTradeHistory(marketApi, ticker, 50);
        const orderbook = await gatherOrderbook(marketApi, ticker, 10);
        
        context.trades.push({ ticker, trades });
        if (orderbook) {
          context.orderbooks.push({ ticker, orderbook });
        }
      }
    }
  } else {
    // Search for markets based on query
    const markets = await searchMarkets(marketApi, query, 5);
    context.markets = markets;

    // For the first market found, get detailed data
    if (markets.length > 0) {
      const firstMarket = markets[0];
      const trades = await gatherTradeHistory(marketApi, firstMarket.ticker, 50);
      const orderbook = await gatherOrderbook(marketApi, firstMarket.ticker, 10);
      
      context.trades.push({ ticker: firstMarket.ticker, trades });
      if (orderbook) {
        context.orderbooks.push({ ticker: firstMarket.ticker, orderbook });
      }
    }
  }

  // Gather events if event-related query
  if (parsed.eventNames.length > 0 || parsed.categories.length > 0 || query.length > 10) {
    if (getAllEventsFn) {
      // Use cached events for better performance
      const allEvents = await getAllEventsFn();
      const searchTerm = query.toLowerCase();
      const filteredEvents = allEvents.filter(event => {
        return (
          event.title?.toLowerCase().includes(searchTerm) ||
          event.sub_title?.toLowerCase().includes(searchTerm) ||
          event.category?.toLowerCase().includes(searchTerm) ||
          event.event_ticker?.toLowerCase().includes(searchTerm)
        );
      });
      context.events = filteredEvents.slice(0, 10).map(event => ({
        ...event,
        markets: (event.markets || []).map(normalizeMarket)
      }));
    } else if (eventsApi) {
      const events = await gatherEvents(eventsApi, query, 5);
      context.events = events;
    }
  } else if (getAllEventsFn) {
    // Use cached events for general queries
    const allEvents = await getAllEventsFn();
    context.events = allEvents.slice(0, 10).map(event => ({
      ...event,
      markets: (event.markets || []).map(normalizeMarket)
    }));
  }

  // Generate summary
  context.summary = generateContextSummary(context);

  return context;
}

/**
 * Generate a human-readable summary of the gathered context
 */
function generateContextSummary(context) {
  const parts = [];

  if (context.markets.length > 0) {
    parts.push(`Found ${context.markets.length} market(s)`);
    context.markets.forEach(m => {
      parts.push(`- ${m.ticker}: ${m.title} (Volume: ${m.volume || 0}, Status: ${m.status})`);
    });
  }

  if (context.trades.length > 0) {
    const totalTrades = context.trades.reduce((sum, t) => sum + t.trades.length, 0);
    parts.push(`Retrieved ${totalTrades} recent trades`);
  }

  if (context.orderbooks.length > 0) {
    parts.push(`Retrieved orderbook data for ${context.orderbooks.length} market(s)`);
  }

  if (context.events.length > 0) {
    parts.push(`Found ${context.events.length} related event(s)`);
  }

  return parts.join('\n');
}
