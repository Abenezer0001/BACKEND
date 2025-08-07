import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import WebSocketService from './services/WebSocketService';
// import kafkaProducerService from './services/KafkaProducer';
// import { KafkaConsumerService } from './services/KafkaConsumerService';
import LiveOrderMonitor from './services/LiveOrderMonitor';
import orderRoutes from './routes/orderRoutes';
import logger from './utils/logger';

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Don't create a Socket.IO server here - it will be provided by the main application

// Apply middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Register routes
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'order-service' });
});

// The Socket.IO connection handling will be managed by the main application
// We will only export a function to initialize our WebSocketService with the provided Socket.IO instance
export const setSocketIOInstance = (socketIO: Server) => {
  logger.info('Received Socket.IO instance from main application');
  
  // Initialize WebSocket service with this instance
  try {
    WebSocketService.setServer(socketIO);
    logger.info('WebSocket service initialized with main Socket.IO instance');
  } catch (error) {
    logger.error('Error initializing WebSocket service:', error);
  }
};

// Initialize services
async function initializeServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat');
    logger.info('Connected to MongoDB');
    
    // Initialize Kafka producer
    // await kafkaProducerService.initializeProducer();
    
    // Initialize order monitoring
    const monitor = LiveOrderMonitor.getInstance();
    await monitor.initialize();
    
    // WebSocket service will be initialized when setSocketIOInstance is called
    logger.info('WebSocket service will be initialized when Socket.IO instance is provided');
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  
  try {
    // Stop Kafka consumer
    // await KafkaConsumerService.disconnect();
    
    // Stop Kafka producer
    // await kafkaProducerService.disconnect();
    
    // Stop order monitoring
    const monitor = LiveOrderMonitor.getInstance();
    await monitor.stop();
    
    // Close MongoDB connection
    await mongoose.disconnect();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
const PORT = process.env.PORT || 5002;

server.listen(PORT, async () => {
  logger.info(`Order service running on port ${PORT}`);
  await initializeServices();
});

export default server; 