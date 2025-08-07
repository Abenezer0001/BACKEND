// Manual test script for Stripe Connect routes
// This tests the route functionality without needing the full app to run

const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = {
    userId: '64f123456789abcdef123456',
    email: 'test-business@example.com',
    role: 'business_owner',
    businessId: '64f123456789abcdef123456'
  };
  next();
};

// Test route to verify setup
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Manual route testing server is running',
    timestamp: new Date().toISOString()
  });
});

// Mock Stripe Connect routes for testing
app.post('/api/stripe-connect/business/onboard', mockAuth, (req, res) => {
  console.log('📥 POST /api/stripe-connect/business/onboard');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user);
  
  res.json({
    success: true,
    message: 'Mock Stripe Connect account creation',
    data: {
      accountId: 'acct_mock_' + Date.now(),
      onboardingUrl: 'https://connect.stripe.com/setup/test',
      accountStatus: 'pending',
      businessId: req.user.businessId
    }
  });
});

app.get('/api/stripe-connect/business/status', mockAuth, (req, res) => {
  console.log('📥 GET /api/stripe-connect/business/status');
  console.log('User:', req.user);
  
  res.json({
    success: true,
    data: {
      accountId: 'acct_mock_123456',
      accountStatus: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
      onboardingCompleted: false,
      requirements: {
        currentlyDue: ['business_profile.url', 'company.tax_id'],
        eventuallyDue: [],
        pastDue: [],
        pendingVerification: [],
        disabledReason: null
      }
    }
  });
});

app.post('/api/stripe-connect/business/dashboard-link', mockAuth, (req, res) => {
  console.log('📥 POST /api/stripe-connect/business/dashboard-link');
  console.log('User:', req.user);
  
  res.json({
    success: true,
    data: {
      dashboardUrl: 'https://dashboard.stripe.com/test/connect/accounts/acct_mock_123456'
    }
  });
});

app.get('/api/stripe-connect/business/earnings', mockAuth, (req, res) => {
  console.log('📥 GET /api/stripe-connect/business/earnings');
  console.log('Query params:', req.query);
  console.log('User:', req.user);
  
  res.json({
    success: true,
    data: {
      totalRevenue: 1500.75,
      platformFees: 75.04,
      netEarnings: 1425.71,
      payoutsPending: 500.00,
      payoutsCompleted: 925.71,
      transactionCount: 25
    }
  });
});

app.post('/api/payments/create-checkout-session-with-platform-fee', mockAuth, (req, res) => {
  console.log('📥 POST /api/payments/create-checkout-session-with-platform-fee');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user);
  
  const { lineItems, platformFeePercentage = 5.0 } = req.body;
  const totalAmount = lineItems.reduce((sum, item) => {
    return sum + (item.price_data?.unit_amount || 0) * (item.quantity || 1);
  }, 0);
  const platformFee = Math.round((totalAmount * platformFeePercentage) / 100);
  
  res.json({
    success: true,
    url: 'https://checkout.stripe.com/pay/cs_mock_' + Date.now(),
    sessionId: 'cs_mock_' + Date.now(),
    orderId: req.body.orderId,
    platformFee: {
      amount: platformFee / 100,
      percentage: platformFeePercentage,
      businessReceives: (totalAmount - platformFee) / 100
    }
  });
});

app.post('/api/stripe-connect/business/process-payment', mockAuth, (req, res) => {
  console.log('📥 POST /api/stripe-connect/business/process-payment');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user);
  
  const { amount, platformFeePercentage = 5.0 } = req.body;
  const amountCents = Math.round(amount * 100);
  const platformFee = Math.round((amountCents * platformFeePercentage) / 100);
  
  res.json({
    success: true,
    message: 'Payment processed successfully',
    data: {
      paymentIntentId: 'pi_mock_' + Date.now(),
      clientSecret: 'pi_mock_' + Date.now() + '_secret_mock',
      applicationFeeAmount: platformFee / 100,
      businessReceives: (amountCents - platformFee) / 100,
      platformFee: platformFee / 100,
      status: 'requires_confirmation'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = 3333;
app.listen(PORT, () => {
  console.log('🚀 Manual route testing server running on port', PORT);
  console.log('💰 Platform Fee System Routes Available:');
  console.log('   POST /api/stripe-connect/business/onboard');
  console.log('   GET  /api/stripe-connect/business/status');
  console.log('   POST /api/stripe-connect/business/dashboard-link');
  console.log('   GET  /api/stripe-connect/business/earnings');
  console.log('   POST /api/payments/create-checkout-session-with-platform-fee');
  console.log('   POST /api/stripe-connect/business/process-payment');
  console.log('');
  console.log('🔧 Test with: curl -X POST http://localhost:3333/test');
});

module.exports = app;