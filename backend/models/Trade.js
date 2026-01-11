/**
 * Trade Model - Stores historical trade data
 */
export class TradeModel {
  constructor(db) {
    this.collection = db.collection('trades');
  }

  /**
   * Save trades for a market
   */
  async saveTrades(ticker, trades) {
    if (trades.length === 0) return;

    // Add metadata to each trade
    const tradesWithMetadata = trades.map(trade => ({
      ...trade,
      ticker,
      savedAt: new Date()
    }));

    // Use insertMany with ordered: false to handle duplicates gracefully
    try {
      await this.collection.insertMany(tradesWithMetadata, { ordered: false });
    } catch (error) {
      // Ignore duplicate key errors
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  /**
   * Get trades for a market
   */
  async getTrades(ticker, filters = {}) {
    const query = { ticker: ticker };

    if (filters.minTs) {
      query.created_time = { ...query.created_time, $gte: new Date(filters.minTs * 1000) };
    }

    if (filters.maxTs) {
      query.created_time = { ...query.created_time, $lte: new Date(filters.maxTs * 1000) };
    }

    return await this.collection
      .find(query)
      .sort({ created_time: -1 })
      .limit(filters.limit || 500)
      .toArray();
  }

  /**
   * Get recent trades across all markets
   */
  async getRecentTrades(limit = 100) {
    return await this.collection
      .find({})
      .sort({ created_time: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get trade statistics for a market
   */
  async getTradeStats(ticker) {
    const pipeline = [
      { $match: { ticker: ticker } },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          totalVolume: { $sum: '$count' },
          avgPrice: { $avg: '$yes_price' },
          minPrice: { $min: '$yes_price' },
          maxPrice: { $max: '$yes_price' },
          firstTrade: { $min: '$created_time' },
          lastTrade: { $max: '$created_time' }
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || {
      totalTrades: 0,
      totalVolume: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0
    };
  }
}
