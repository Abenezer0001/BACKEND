import express from 'express';
import { CashierController } from '../controllers/cashierController';
import { authenticateFlexible } from '../middleware/auth';
import { requireBusinessRole, requireBusinessScope } from '../middleware/businessRbacMiddleware';

const router = express.Router();
const cashierController = new CashierController();

// Apply authentication middleware to all routes
router.use(authenticateFlexible);
// Allow restaurant_admin access to cashier management
router.use(requireBusinessRole(['restaurant_admin', 'system_admin']));
// Apply business scoping to ensure restaurant admins only see their own business resources
router.use(requireBusinessScope());

// Cashier CRUD operations
router.get('/', cashierController.getCashiers.bind(cashierController));
router.get('/stats', cashierController.getStats.bind(cashierController));
router.get('/:id', cashierController.getCashier.bind(cashierController));
router.post('/', cashierController.createCashier.bind(cashierController));
router.put('/:id', cashierController.updateCashier.bind(cashierController));
router.delete('/:id', cashierController.deleteCashier.bind(cashierController));

// Cashier venue management
router.post('/:id/venues', cashierController.assignVenuesToCashier.bind(cashierController));
// Note: removeCashierFromVenue method doesn't exist, will need to be implemented or use assignVenuesToCashier

// Cashier schedule and performance
router.put('/:id/schedule', cashierController.updateCashierSchedule.bind(cashierController));
router.get('/:id/performance', cashierController.getCashierPerformance.bind(cashierController));
router.post('/:id/reset-password', cashierController.resetCashierPassword.bind(cashierController));

export default router; 