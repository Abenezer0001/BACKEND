import express from 'express';
import { StripeConnectBusinessController } from '../controllers/StripeConnectBusinessController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();
const controller = new StripeConnectBusinessController();

// Business Stripe Connect onboarding routes
router.post('/business/onboard', 
  authenticate, 
  controller.createBusinessAccount.bind(controller)
);

router.get('/business/status', 
  authenticate, 
  controller.getAccountStatus.bind(controller)
);

router.get('/business/:businessId/status', 
  authenticate, 
  controller.getAccountStatus.bind(controller)
);

router.post('/business/refresh-onboarding', 
  authenticate, 
  controller.refreshOnboardingLink.bind(controller)
);

router.post('/business/:businessId/refresh-onboarding', 
  authenticate, 
  controller.refreshOnboardingLink.bind(controller)
);

// Stripe dashboard access
router.post('/business/dashboard-link', 
  authenticate, 
  controller.createDashboardLink.bind(controller)
);

router.post('/business/:businessId/dashboard-link', 
  authenticate, 
  controller.createDashboardLink.bind(controller)
);

// Business earnings and analytics
router.get('/business/earnings', 
  authenticate, 
  controller.getBusinessEarnings.bind(controller)
);

router.get('/business/:businessId/earnings', 
  authenticate, 
  controller.getBusinessEarnings.bind(controller)
);

// Process order payments with platform fee
router.post('/business/process-payment', 
  authenticate, 
  controller.processOrderPayment.bind(controller)
);

// Stripe Connect webhook endpoint
router.post('/connect/webhook', 
  controller.handleConnectWebhook.bind(controller)
);

export default router;