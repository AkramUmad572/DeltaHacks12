import { connectToMongoDB, checkMongoDBHealth, closeMongoDB } from './db/mongodb.js';

async function testConnection() {
  try {
    console.log('🧪 Testing MongoDB Atlas connection...\n');
    
    // Connect to MongoDB
    const { db } = await connectToMongoDB();
    
    // Test health check
    const health = await checkMongoDBHealth();
    console.log('📊 Health Check:', health);
    
    // Test a simple query
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections in database:', collections.map(c => c.name));
    
    // Test insert (optional - creates a test document)
    const testCollection = db.collection('test');
    const result = await testCollection.insertOne({
      test: true,
      timestamp: new Date(),
      message: 'MongoDB connection test successful!'
    });
    console.log('\n✅ Test document inserted:', result.insertedId);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('🧹 Test document cleaned up');
    
    console.log('\n🎉 MongoDB Atlas connection test PASSED!');
    console.log('✅ Your database is ready to use!');
    
  } catch (error) {
    console.error('\n❌ Connection test FAILED:');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Check your MONGODB_URI in backend/.env');
    console.error('2. Verify your IP address is whitelisted in MongoDB Atlas');
    console.error('3. Check your username and password are correct');
    process.exit(1);
  } finally {
    await closeMongoDB();
    process.exit(0);
  }
}

testConnection();
