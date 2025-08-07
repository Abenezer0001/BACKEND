import express from 'express';
import DemoController from '../controllers/DemoController';
import { 
  validateDemoAccountRequest, 
  rateLimitDemoRequests, 
  addDemoSecurityHeaders, 
  logDemoRequest 
} from '../middleware/demoValidation';
// import { isAdmin, isAuthenticated } from '../middleware/authMiddleware';

const router = express.Router();

// Apply security headers and logging to all demo routes
router.use(addDemoSecurityHeaders);
router.use(logDemoRequest);

// Public routes with validation and rate limiting
router.post('/create-account', 
  rateLimitDemoRequests,
  validateDemoAccountRequest,
  DemoController.createDemoAccount
);

router.post('/request', DemoController.createDemoRequest);
router.post('/validate', DemoController.validateDemoCredentials);
router.get('/customer/:demoId', DemoController.getCustomerDemoInfo);

// Admin-only routes
router.get('/list', /* isAuthenticated, isAdmin, */ DemoController.listDemoRequests);

export default router; 