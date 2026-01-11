import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kalshi-detector';
const DB_NAME = process.env.MONGODB_DB_NAME || 'kalshi-detector';

let client = null;
let db = null;

/**
 * Connect to MongoDB Atlas
 */
export async function connectToMongoDB() {
  try {
    if (client && db) {
      return { client, db };
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`📊 Database: ${DB_NAME}`);
    
    // Create indexes for better query performance
    await createIndexes();
    
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

/**
 * Create indexes for optimized queries
 */
async function createIndexes() {
  try {
    // Events collection indexes
    const eventsCollection = db.collection('events');
    await eventsCollection.createIndex({ event_ticker: 1 }, { unique: true });
    await eventsCollection.createIndex({ category: 1 });
    await eventsCollection.createIndex({ 'markets.ticker': 1 });
    await eventsCollection.createIndex({ lastUpdated: 1 });

    // Markets collection indexes
    const marketsCollection = db.collection('markets');
    await marketsCollection.createIndex({ ticker: 1 }, { unique: true });
    await marketsCollection.createIndex({ event_ticker: 1 });
    await marketsCollection.createIndex({ category: 1 });
    await marketsCollection.createIndex({ lastUpdated: 1 });

    // Analyses collection indexes
    const analysesCollection = db.collection('analyses');
    await analysesCollection.createIndex({ ticker: 1, timestamp: -1 });
    await analysesCollection.createIndex({ suspicionScore: -1 });
    await analysesCollection.createIndex({ riskLevel: 1 });
    await analysesCollection.createIndex({ timestamp: -1 });

    // Trades collection indexes
    const tradesCollection = db.collection('trades');
    await tradesCollection.createIndex({ ticker: 1, created_time: -1 });
    await tradesCollection.createIndex({ created_time: -1 });

    // Analytics collection indexes
    const analyticsCollection = db.collection('analytics');
    await analyticsCollection.createIndex({ timestamp: -1 });
    await analyticsCollection.createIndex({ type: 1, timestamp: -1 });

    console.log('📇 Database indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
}

/**
 * Get database instance
 */
export function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectToMongoDB() first.');
  }
  return db;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('🔌 MongoDB connection closed');
  }
}

/**
 * Health check for MongoDB
 */
export async function checkMongoDBHealth() {
  try {
    if (!db) {
      return { status: 'disconnected', error: 'Database not connected' };
    }
    await db.admin().ping();
    return { status: 'connected', database: DB_NAME };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
