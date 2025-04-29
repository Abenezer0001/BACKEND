import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import events, { EventEmitter } from 'events';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import http from 'http';
import winston from 'winston';
import expressWinston from 'express-winston';
import helmet from 'helmet';

// Import services and configurations
import { WebSocketManager } from './config/websocket';
// import { LiveOrderMonitor } from './services/LiveOrderMonitor';
import { initSocketIO, closeSocketIO } from './socketio';
// Remove problematic imports
// import { ApiRoutes } from './routes/api.routes';
// import { AuthRoutes } from './routes/auth.routes';
// import { AdminRoutes } from './routes/admin.routes';
import { seedRolesAndPermissions } from '@services/auth-service/src/seed';
import { initializePassport } from '@services/auth-service/src/config/passport';
// Import order service
import { initializeOrderService, shutdownOrderService } from '@services/order-service/src/server';

// Load environment variables from .env file
dotenv.config();

// Increase max listeners to avoid memory leak warning
events.defaultMaxListeners = 20;

// Initialize the app
const app = express();
const server = createServer(app);
const eventEmitter = new EventEmitter();

// Initialize WebSocket server
const webSocketManager = WebSocketManager.getInstance(server);
// Export the WebSocket server for external use
export { webSocketManager };

// Initialize WebSocket server with our singleton approach
const io = initSocketIO(server);

// Export app and server but not io (use getSocketIO() instead)
export { app, server };

// Now we can safely import services
import apiRoutes from '../services/index';
import adminRoutes from '@services/auth-service/src/routes/adminRoutes';
import authRoutes from '@services/auth-service/src/routes/authRoutes';

// Configure middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.disable('x-powered-by');

// Set up security headers
app.use(helmet());

// Add debug logging for Passport initialization
console.log('==========================================');
console.log('INITIALIZING PASSPORT');
console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID || 'NOT SET');
console.log('Google Callback URL:', process.env.GOOGLE_CALLBACK_URL || 'NOT SET');

// Initialize passport with the function instead of using the import directly
const passport = initializePassport();
app.use(passport.initialize());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to MongoDB');
    // Seed the database with initial roles and permissions for auth service
    try {
      await seedRolesAndPermissions();
    } catch (error) {
      console.error('Error seeding database:', error);
    }

    // Initialize order service after MongoDB connection is established
    try {
      initializeOrderService(app, io);
      console.log('Order service initialized');
    } catch (error) {
      console.error('Failed to initialize order service:', error);
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Initialize LiveOrderMonitor
// LiveOrderMonitor.getInstance().start();

// Routes
// Apply routes
app.use('/api', apiRoutes);

// Auth service routes
app.use('/api/admin', adminRoutes);

// Add request logging middleware for auth-related routes
app.use('/api/auth', (req, res, next) => {
  console.log(`Auth Request: ${req.method} ${req.path}`, { 
    body: req.method === 'POST' ? { ...req.body, password: req.body.password ? '[REDACTED]' : undefined } : undefined,
    cookies: req.cookies ? { ...req.cookies, access_token: req.cookies.access_token ? '[PRESENT]' : '[MISSING]', refresh_token: req.cookies.refresh_token ? '[PRESENT]' : '[MISSING]' } : 'No cookies'
  });
  next();
});

// Connect auth routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'inseat-backend' });
});

// Swagger Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'INSEAT API Documentation',
      version: '1.0.0',
      description: 'Documentation for the INSEAT API',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/services/auth-service/src/routes/*.ts', './services/order-service/src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Enhanced error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error occurred:', err);
  
  // Check for status code on error object
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Special handling for authentication errors
  const responseBody: any = {
    success: false,
    message: message
  };
  
  // Add needsRefresh flag if present
  if (err.needsRefresh) {
    responseBody.needsRefresh = true;
  }
  
  // In development, include more error details
  if (process.env.NODE_ENV !== 'production') {
    responseBody.error = err.stack;
  }
  
  res.status(statusCode).json(responseBody);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`INSEAT Backend running on port ${PORT}`);
  console.log(`CORS origins: ${process.env.CORS_ORIGINS || 'default CORS origins'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  
  // Stop LiveOrderMonitor
  // LiveOrderMonitor.getInstance().stop();
  
  // Cleanup WebSocketManager
  WebSocketManager.getInstance().cleanup();
  // Close SocketIO connections
  await closeSocketIO();
  
  // Shutdown order service
  await shutdownOrderService();
  
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
