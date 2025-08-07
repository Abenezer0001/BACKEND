import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import analyticsRoutes from './routes/analyticsRoutes';
import { errorHandler } from './middleware/validation';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://your-frontend-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Routes
app.use('/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize analytics service
export const initializeAnalyticsService = () => {
  console.log('🔍 Analytics Service initialized');
  console.log('   - /api/analytics/sales/dashboard - Sales dashboard data');
  console.log('   - /api/analytics/sales/restaurants - Restaurant sales data');
  console.log('   - /api/analytics/orders/overview - Order performance overview');
  console.log('   - /api/analytics/orders/hourly-distribution - Hourly order distribution');
  console.log('   - /api/analytics/menu/overview - Menu overview stats');
  console.log('   - /api/analytics/menu/top-selling - Top selling items');
  console.log('   - /api/analytics/dashboard/overview - Dashboard overview');
  console.log('   - /api/analytics/dashboard/monthly-orders - Monthly order data');
  console.log('   - /api/analytics/dashboard/best-sellers - Best selling items');
  return app;
};

export default app;
