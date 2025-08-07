const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

console.log('Attempting to connect to MongoDB...');
console.log('MongoDB URL:', MONGO_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

async function testConnection() {
  try {
    await mongoose.connect(MONGO_URL, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    console.log('✅ Connected to MongoDB successfully');
    
    // Get user collection
    const users = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
    console.log('Found users:', users.length);
    
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`- ${user.email} (role: ${user.role}, roles: ${user.roles ? user.roles.length : 0})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Let's try a different approach - start the server and test the login endpoint directly
    console.log('\n🔄 MongoDB connection failed. Let\'s try testing the existing server...');
    process.exit(1);
  }
}

testConnection();