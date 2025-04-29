import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { seedRolesAndPermissions } from './seed';
import { JWT_SECRET } from './config';
import { initializePassport } from './config/passport';

// Import routes
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';

// Load environment variables
dotenv.config();

// Create Express server
const app = express();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inseat-auth';
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    // Seed the database with initial roles and permissions
    try {
      await seedRolesAndPermissions();
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',  // Frontend Vite dev server
    'http://localhost:8080'   // Alternative dev server
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Passport
initializePassport();
app.use(passport.initialize());

// Add request logging middleware for auth-related routes
app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
  console.log(`Auth Request: ${req.method} ${req.path}`, { 
    body: req.method === 'POST' ? { ...req.body, password: req.body.password ? '[REDACTED]' : undefined } : undefined,
    cookies: req.cookies ? { ...req.cookies, access_token: req.cookies.access_token ? '[PRESENT]' : '[MISSING]', refresh_token: req.cookies.refresh_token ? '[PRESENT]' : '[MISSING]' } : 'No cookies'
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

// Enhanced error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
  console.log(`CORS origins: ${process.env.CORS_ORIGINS || 'default CORS origins'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
