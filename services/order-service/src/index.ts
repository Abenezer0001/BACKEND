import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import WebSocketService from './services/WebSocketService';
import KafkaProducerService from './services/KafkaProducerService';
import KafkaConsumerService from './services/KafkaConsumerService';
import LiveOrderMonitor from './services/LiveOrderMonitor';
import orderRoutes from './routes/orderRoutes';
import logger from './utils/logger';

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Handle room joining
  socket.on('join_room', (room) => {
    socket.join(room);
    logger.info(`Client ${socket.id} joined room: ${room}`);
  });
  
  // Handle room leaving
  socket.on('leave_room', (room) => {
    socket.leave(room);
    logger.info(`Client ${socket.id} left room: ${room}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat');
    logger.info('Connected to MongoDB');
    
    // Initialize WebSocket service
    const wsService = WebSocketService.getInstance();
    wsService.setServer(io);
    
    // Initialize Kafka producer
    await KafkaProducerService.initialize();
    
    // Initialize order monitoring
    const monitor = LiveOrderMonitor.getInstance();
    await monitor.initialize();
    
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
    await KafkaConsumerService.disconnect();
    
    // Stop Kafka producer
    await KafkaProducerService.disconnect();
    
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