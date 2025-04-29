import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createWebSocketServer } from './config/websocket';
import WebSocketService from './services/WebSocketService';
import KafkaConsumerService from './services/KafkaConsumerService';
import createOrderRoutes from './routes/orderRoutes';
import kafkaService from './config/kafka';

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize WebSocket server
const io = createWebSocketServer(server);
const wsService = new WebSocketService(io);

// Set up routes with WebSocket service
const orderRouter = createOrderRoutes(wsService);
app.use('/api', orderRouter);

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL as string, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as any);
    console.log('MongoDB cronnected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on pddort ${PORT}`);
    console.log(`WebSocket server initialized`);
  });
  // Initialize Kafka consumer
const kafkaConsumer = new KafkaConsumerService(io);
kafkaConsumer.initialize().catch(err => {
  console.error('Failed to initialize Kafka consumer:', err);
});

// Create and apply routes with WebSocket service
const orderRoutes = createOrderRoutes(wsService);
app.use('/api', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inseat-orders';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start server
    const PORT = process.env.PORT || 5002;
    server.listen(PORT, () => {
      console.log(`Order service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...');
  
  // Close Kafka connections
  await kafkaService.disconnectAll();
  
  // Close server
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connection
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
