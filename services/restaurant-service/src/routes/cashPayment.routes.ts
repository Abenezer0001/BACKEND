import { Router } from 'express';
import CashPaymentController from '../controllers/CashPaymentController';
import { authenticateOptional } from '../middleware/optionalAuth';

const router = Router();

// Create a new cash payment request
router.post(
  '/',
  CashPaymentController.createCashPaymentRequestValidation,
  CashPaymentController.createCashPaymentRequest
);

// Get cash payment requests for a restaurant
router.get(
  '/restaurant/:restaurantId',
  CashPaymentController.getCashPaymentRequestsValidation,
  CashPaymentController.getCashPaymentRequests
);

// Get active cash payment requests count for a restaurant
router.get(
  '/restaurant/:restaurantId/active-count',
  CashPaymentController.getActiveCashPaymentCount
);

// Get cash payment request by table ID (for customer UI)
router.get(
  '/table/:tableId',
  authenticateOptional,
  CashPaymentController.getCashPaymentRequestByTableValidation,
  CashPaymentController.getCashPaymentRequestByTable
);

// Get cash payment request by ID
router.get(
  '/:requestId',
  CashPaymentController.getCashPaymentRequestById
);

// Mark cash payment as collected
router.patch(
  '/:requestId/collect',
  CashPaymentController.collectCashPaymentValidation,
  CashPaymentController.collectCashPayment
);

// Cancel a cash payment request
router.patch(
  '/:requestId/cancel',
  CashPaymentController.cancelCashPaymentRequest
);

export default router;