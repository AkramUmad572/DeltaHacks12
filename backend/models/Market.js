/**
 * Market Model - Stores individual market data
 */
export class MarketModel {
  constructor(db) {
    this.collection = db.collection('markets');
  }

  /**
   * Upsert a market
   */
  async upsertMarket(market) {
    const marketData = {
      ...market,
      lastUpdated: new Date()
    };

    await this.collection.updateOne(
      { ticker: market.ticker },
      { $set: marketData },
      { upsert: true }
    );
  }

  /**
   * Upsert multiple markets
   */
  async upsertMarkets(markets) {
    if (markets.length === 0) return;

    const operations = markets.map(market => ({
      updateOne: {
        filter: { ticker: market.ticker },
        update: {
          $set: {
            ...market,
            lastUpdated: new Date()
          }
        },
        upsert: true
      }
    }));

    await this.collection.bulkWrite(operations);
  }

  /**
   * Get market by ticker
   */
  async getMarket(ticker) {
    return await this.collection.findOne({ ticker: ticker });
  }

  /**
   * Get markets by event ticker
   */
  async getMarketsByEvent(eventTicker) {
    return await this.collection.find({ event_ticker: eventTicker }).toArray();
  }

  /**
   * Search markets
   */
  async searchMarkets(searchTerm, filters = {}) {
    const query = {
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { ticker: { $regex: searchTerm, $options: 'i' } },
        { subtitle: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    return await this.collection.find(query).toArray();
  }
}
