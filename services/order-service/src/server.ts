import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { createOrderRoutes } from './routes/orderRoutes';
import { initializeWebSocketServer } from './websocket/WebSocketServer';
import { OrderController } from './controllers/OrderController';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wsService = initializeWebSocketServer(server);

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
});

export { server, app, wsService };
