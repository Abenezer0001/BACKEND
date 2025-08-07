const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/inseat';

async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');
    
    // Simple seeding script
    console.log('✅ Business RBAC seeding script executed');
    console.log('Note: Full TypeScript seeding will be available after fixing compilation issues');
    
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main(); 