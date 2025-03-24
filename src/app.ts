import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import { WebSocketManager } from './config/websocket';
import { LiveOrderMonitor } from './services/LiveOrderMonitor';
import apiRoutes from '../services/index';
import events from 'events';

// Increase max listeners to avoid memory leak warning
events.defaultMaxListeners = 20;


const app = express();
const server = http.createServer(app);

// Initialize WebSocket
WebSocketManager.initialize(server);

// Middleware
app.use(cors());
app.use(express.json());
app.disable('x-powered-by');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Initialize LiveOrderMonitor
LiveOrderMonitor.getInstance().start();

// Routes
app.use('/api', apiRoutes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  
  // Stop LiveOrderMonitor
  LiveOrderMonitor.getInstance().stop();
  
  // Cleanup WebSocketManager
  WebSocketManager.getInstance().cleanup();
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    // Close MongoDB connection
    mongoose.connection.close().then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close if it takes too long
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { app, server };
