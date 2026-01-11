/**
 * Analytics Model - Tracks user interactions and app usage
 */
export class AnalyticsModel {
  constructor(db) {
    this.collection = db.collection('analytics');
  }

  /**
   * Track a user action
   */
  async trackEvent(type, data = {}) {
    const event = {
      type, // 'search', 'market_view', 'analysis_run', 'chat_message', etc.
      data,
      timestamp: new Date(),
      sessionId: data.sessionId || null
    };

    await this.collection.insertOne(event);
    return event;
  }

  /**
   * Track market search
   */
  async trackSearch(query, resultsCount, category = null) {
    return await this.trackEvent('search', {
      query,
      resultsCount,
      category
    });
  }

  /**
   * Track market view
   */
  async trackMarketView(ticker, marketTitle) {
    return await this.trackEvent('market_view', {
      ticker,
      marketTitle
    });
  }

  /**
   * Track analysis run
   */
  async trackAnalysisRun(ticker, suspicionScore, riskLevel) {
    return await this.trackEvent('analysis_run', {
      ticker,
      suspicionScore,
      riskLevel
    });
  }

  /**
   * Track chat message
   */
  async trackChatMessage(messageLength, hasContext) {
    return await this.trackEvent('chat_message', {
      messageLength,
      hasContext
    });
  }

  /**
   * Get analytics statistics
   */
  async getStats(timeRange = 24) {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - timeRange);

    const pipeline = [
      { $match: { timestamp: { $gte: hoursAgo } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit = 10) {
    const pipeline = [
      { $match: { type: 'search' } },
      { $group: { _id: '$data.query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  /**
   * Get most viewed markets
   */
  async getMostViewedMarkets(limit = 10) {
    const pipeline = [
      { $match: { type: 'market_view' } },
      { $group: { _id: '$data.ticker', count: { $sum: 1 }, title: { $first: '$data.marketTitle' } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }
}
