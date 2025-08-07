import mongoose from 'mongoose';
import { initializeAnalyticsService } from './src/server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.ANALYTICS_PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat';

async function startAnalyticsService() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    // Initialize and start analytics service
    const app = initializeAnalyticsService();
    
    app.listen(PORT, () => {
      console.log(`🚀 Analytics Service running on port ${PORT}`);
      console.log(`📊 Analytics API available at http://localhost:${PORT}/analytics`);
      console.log(`💓 Health check at http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error('❌ Failed to start Analytics Service:', error);
    
    // Start service without database connection for testing endpoints
    console.log('⚠️  Starting service without database connection...');
    const app = initializeAnalyticsService();
    
    app.listen(PORT, () => {
      console.log(`🚀 Analytics Service running on port ${PORT} (Database disconnected)`);
      console.log(`📊 Analytics API available at http://localhost:${PORT}/analytics`);
      console.log(`💓 Health check at http://localhost:${PORT}/health`);
    });
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Analytics Service...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startAnalyticsService();