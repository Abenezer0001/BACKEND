import { Router } from 'express';
import WaiterCallController from '../controllers/WaiterCallController';

const router = Router();

// Create a new waiter call
router.post(
  '/',
  WaiterCallController.createWaiterCallValidation,
  WaiterCallController.createWaiterCall
);

// Get waiter calls for a restaurant
router.get(
  '/restaurant/:restaurantId',
  WaiterCallController.getWaiterCallsValidation,
  WaiterCallController.getWaiterCalls
);

// Get active calls count for a restaurant
router.get(
  '/restaurant/:restaurantId/active-count',
  WaiterCallController.getActiveCallsCount
);

// Get waiter calls by table ID
router.get(
  '/table/:tableId',
  WaiterCallController.getWaiterCallsByTableValidation,
  WaiterCallController.getWaiterCallsByTable
);

// Get waiter call by ID
router.get(
  '/:callId',
  WaiterCallController.getWaiterCallById
);

// Resolve a waiter call
router.patch(
  '/:callId/resolve',
  WaiterCallController.resolveWaiterCallValidation,
  WaiterCallController.resolveWaiterCall
);

// Cancel a waiter call
router.patch(
  '/:callId/cancel',
  WaiterCallController.cancelWaiterCall
);

export default router;