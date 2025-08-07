import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/paymentRoutes';
import stripeConnectBusinessRoutes from './routes/stripeConnectBusinessRoutes';
import { errorHandler } from './middlewares/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PAYMENT_SERVICE_PORT || 3005;

// Set up middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// IMPORTANT: Special handling for Stripe webhooks - must come BEFORE any other body parsers
// This ensures the raw body is available for signature verification

// Create a raw body parser middleware for Stripe webhooks - need to use application/json as Stripe sends JSON with the correct content-type header
const rawBodyParser = express.raw({ type: 'application/json' });

// Create a middleware to preserve the raw body in the request object - this ensures the raw buffer is available for signature verification
const webhookMiddleware = (req: any, res: any, next: any) => {
  if (req.originalUrl.includes('/webhook')) {
    console.log('📦 Preserving raw body for webhook verification');
    // Save the raw body buffer before Express processes it
    if (Buffer.isBuffer(req.body)) {
      console.log('✅ Raw body is a Buffer - ideal for signature verification');
      req.rawBody = req.body;
      
      // For logging only - don't use this parsed JSON for signature verification
      try {
        const jsonBody = JSON.parse(req.body.toString('utf8'));
        console.log(`📊 Webhook event type: ${jsonBody.type || 'unknown'}`);
      } catch (err) {
        console.log('⚠️ Could not parse webhook body to JSON for logging');
      }
    } else {
      console.log(`⚠️ Raw body is not a Buffer but ${typeof req.body}`);
    }
  }
  next();
};

// Register ALL webhook routes with the raw body parser BEFORE the json parser
app.post('/api/payments/webhook', rawBodyParser, webhookMiddleware);
app.post('/payments/webhook', rawBodyParser, webhookMiddleware);
app.post('/api/stripe-connect/connect/webhook', rawBodyParser, webhookMiddleware);
app.post('/stripe-connect/connect/webhook', rawBodyParser, webhookMiddleware);
app.post('/webhook', rawBodyParser, webhookMiddleware);
app.post('/api/webhook', rawBodyParser, webhookMiddleware);

console.log('Stripe webhook handlers configured with proper raw body preservation');


// Regular JSON body parser for other routes
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.path}`);
  next();
});

// Routes - mount at BOTH /api/payments AND /payments to support both formats
app.use('/api/payments', paymentRoutes);
app.use('/api/stripe-connect', stripeConnectBusinessRoutes);

// Add a second mount point without the /api prefix to support frontend requests to /payments/*
app.use('/payments', paymentRoutes);
app.use('/stripe-connect', stripeConnectBusinessRoutes);

// Log route registration
console.log('Payment routes registered at /api/payments AND /payments');
console.log('Stripe Connect routes registered at /api/stripe-connect AND /stripe-connect');
console.log('All payment routes are now accessible with and without the /api prefix');


// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});

export default app;