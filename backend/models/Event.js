/**
 * Event Model - Stores Kalshi events with nested markets
 */
export class EventModel {
  constructor(db) {
    this.collection = db.collection('events');
  }

  /**
   * Upsert an event (insert or update if exists)
   */
  async upsertEvent(event) {
    const eventData = {
      ...event,
      lastUpdated: new Date(),
      markets: event.markets || []
    };

    await this.collection.updateOne(
      { event_ticker: event.event_ticker },
      { $set: eventData },
      { upsert: true }
    );
  }

  /**
   * Upsert multiple events
   */
  async upsertEvents(events) {
    if (events.length === 0) return;

    const operations = events.map(event => ({
      updateOne: {
        filter: { event_ticker: event.event_ticker },
        update: {
          $set: {
            ...event,
            lastUpdated: new Date()
          }
        },
        upsert: true
      }
    }));

    await this.collection.bulkWrite(operations);
  }

  /**
   * Get event by ticker
   */
  async getEvent(eventTicker) {
    return await this.collection.findOne({ event_ticker: eventTicker });
  }

  /**
   * Get all events (with optional filters)
   */
  async getAllEvents(filters = {}) {
    const query = {};
    
    if (filters.category && filters.category !== 'All') {
      query.category = filters.category;
    }

    return await this.collection.find(query).toArray();
  }

  /**
   * Search events by query
   */
  async searchEvents(searchTerm, category = null) {
    const query = {
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { sub_title: { $regex: searchTerm, $options: 'i' } },
        { event_ticker: { $regex: searchTerm, $options: 'i' } },
        { 'markets.title': { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (category && category !== 'All') {
      query.category = category;
    }

    return await this.collection.find(query).toArray();
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(category, limit = 50) {
    return await this.collection
      .find({ category: category })
      .limit(limit)
      .toArray();
  }

  /**
   * Get categories with counts
   */
  async getCategories() {
    const pipeline = [
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { name: '$_id', count: 1, _id: 0 } }
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  /**
   * Get trending events (by volume)
   */
  async getTrendingEvents(limit = 20) {
    return await this.collection
      .find({
        'markets.volume': { $gt: 0 }
      })
      .sort({ 'markets.volume': -1 })
      .limit(limit)
      .toArray();
  }
}
