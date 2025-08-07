/**
 * Test script for WebSocket order notifications
 * Run with: npx ts-node services/order-service/src/testWebSocket.ts
 */
import mongoose from 'mongoose';
import { IOrder } from './models/Order';
import OrderModel from './models/Order';
import webSocketService from './services/WebSocketService';
import logger from './utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  logger.error('MongoDB URI not found in environment variables');
  process.exit(1);
}

// Restaurant ID to use for test (change as needed)
const TEST_RESTAURANT_ID = '6835b1712a4880e9431bd665';

/**
 * Create a test order and broadcast it via WebSocket
 */
async function createTestOrder() {
  try {
    logger.info('[Test] Creating test order...');
    
    // Create a test order document
    const testOrder: Partial<IOrder> = {
      restaurantId: TEST_RESTAURANT_ID,
      userId: 'test-user-id',
      items: [
        {
          menuItemId: 'test-menu-item-id',
          name: 'Test Item',
          quantity: 1,
          price: 9.99,
          options: []
        }
      ],
      total: 9.99,
      status: 'pending',
      paymentStatus: 'pending',
      orderNumber: `TEST-${Date.now().toString().slice(-6)}`,
      customerName: 'Test Customer',
      isGuest: true,
      tableNumber: 'T1',
    };
    
    // Save the order to the database
    const newOrder = new OrderModel(testOrder);
    const savedOrder = await newOrder.save();
    
    logger.info(`[Test] Test order created with ID: ${savedOrder._id}`);
    logger.info(`[Test] Order details: ${JSON.stringify(savedOrder)}`);
    
    // Broadcast the order via WebSocket
    logger.info('[Test] Broadcasting order via WebSocket...');
    webSocketService.notifyNewOrder(savedOrder);
    
    // Wait a bit and then update the order
    setTimeout(async () => {
      logger.info('[Test] Updating order status to "preparing"...');
      savedOrder.status = 'preparing';
      await savedOrder.save();
      webSocketService.notifyOrderUpdated(savedOrder);
      
      // Wait again and cancel the order
      setTimeout(async () => {
        logger.info('[Test] Cancelling order...');
        savedOrder.status = 'cancelled';
        await savedOrder.save();
        webSocketService.notifyOrderCancelled(savedOrder);
        
        // Exit after all tests are complete
        setTimeout(() => {
          logger.info('[Test] Test completed, disconnecting from MongoDB...');
          mongoose.disconnect();
          process.exit(0);
        }, 2000);
      }, 5000);
    }, 5000);
    
  } catch (error) {
    logger.error('[Test] Error creating test order:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

/**
 * Connect to MongoDB and run the test
 */
async function runTest() {
  try {
    logger.info(`[Test] Connecting to MongoDB at ${MONGO_URI}...`);
    
    await mongoose.connect(MONGO_URI);
    logger.info('[Test] Connected to MongoDB successfully');
    
    // Run the test
    await createTestOrder();
    
  } catch (error) {
    logger.error('[Test] Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Run the test
runTest();
