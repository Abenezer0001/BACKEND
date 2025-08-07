import express, { Router } from 'express';
import { createCheckoutSession, createCheckoutSessionWithPlatformFee, checkSessionStatus, handleWebhook, updateOrderPaymentStatus } from '../controllers/paymentController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// Create a checkout session
router.post('/create-checkout-session', authenticate, createCheckoutSession);

// Create a checkout session with platform fee for Stripe Connect businesses
router.post('/create-checkout-session-with-platform-fee', authenticate, createCheckoutSessionWithPlatformFee);

// Check session status - support both formats - NO AUTHENTICATION REQUIRED
// These endpoints need to be accessible after Stripe redirects back to the application
router.get('/sessions/:sessionId', checkSessionStatus);

// Add support for the alternative endpoint format the frontend might be using
router.get('/check-session/:sessionId', checkSessionStatus);

// Log session status routes
console.log('Session status routes configured WITHOUT authentication requirement');

// Stripe webhook - no authentication needed as it's called by Stripe
// Note: express.raw middleware is already applied in server.ts for this route
router.post('/webhook', handleWebhook);

// Also handle Stripe webhooks at the root level - Stripe CLI sends to these paths
router.post('/', (req, res, next) => {
  console.log('Received webhook at root route, forwarding to webhook handler');
  handleWebhook(req, res, next);
});

// Log webhook route configuration
console.log('Webhook routes configured at multiple paths');


// Update order payment status directly
router.patch('/orders/:orderId/payment-status', authenticate, updateOrderPaymentStatus);

export default router;
