import express from 'express';
import DemoController from '../controllers/DemoController';
// import { isAdmin, isAuthenticated } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/request', DemoController.createDemoRequest);
router.post('/validate', DemoController.validateDemoCredentials);
router.get('/customer/:demoId', DemoController.getCustomerDemoInfo);

// Admin-only routes
router.get('/list', /* isAuthenticated, isAdmin, */ DemoController.listDemoRequests);

export default router; 