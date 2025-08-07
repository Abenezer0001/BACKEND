import express from 'express';
import { KitchenController } from '../controllers/kitchenController';
import { authenticateFlexible } from '../middleware/auth';
import { requireBusinessRole, requireBusinessScope } from '../middleware/businessRbacMiddleware';

const router = express.Router();
const kitchenController = new KitchenController();

// Apply authentication middleware to all routes
router.use(authenticateFlexible);
// Allow restaurant_admin access to kitchen management
router.use(requireBusinessRole(['restaurant_admin', 'system_admin']));
// Apply business scoping to ensure restaurant admins only see their own business resources
router.use(requireBusinessScope());

// Kitchen CRUD operations
router.get('/', kitchenController.getKitchens.bind(kitchenController));
router.get('/restaurant/:restaurantId', kitchenController.getKitchens.bind(kitchenController));
router.get('/venue/:venueId', kitchenController.getKitchens.bind(kitchenController));
router.get('/:id', kitchenController.getKitchen.bind(kitchenController));
router.post('/', kitchenController.createKitchen.bind(kitchenController));
router.put('/:id', kitchenController.updateKitchen.bind(kitchenController));
router.delete('/:id', kitchenController.deleteKitchen.bind(kitchenController));

// Kitchen staff management
router.post('/:id/staff', kitchenController.addStaffToKitchen.bind(kitchenController));
router.delete('/:id/staff/:staffId', kitchenController.removeStaffFromKitchen.bind(kitchenController));

// Kitchen status management
router.patch('/:id/status', kitchenController.updateKitchenStatus.bind(kitchenController));

export default router; 