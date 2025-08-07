import { Router } from 'express';
import * as stockController from '../controllers/stockController';
// import { authenticateToken } from '../middleware/authMiddleware'; // Example: if auth is needed

const router = Router();

// This route would typically be protected and only accessible by other internal services (e.g., order-service)
// or through a secure gateway with proper authorization.
router.post(
  '/stock/deduct-for-sale',
  // authenticateToken, // Potentially add authentication/authorization middleware here
  stockController.deductStockForSaleHandler
);

export default router;
