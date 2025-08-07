import express from 'express';
import { authenticateFlexible } from '../middleware/auth';
import { requireBusinessRole, requireBusinessScope } from '../middleware/businessRbacMiddleware';
import { ScheduleController } from '../../../restaurant-service/src/controllers/scheduleController';

const router = express.Router();
const scheduleController = new ScheduleController();

// Apply authentication middleware to all routes
router.use(authenticateFlexible);
// Allow restaurant_admin access to schedule management
router.use(requireBusinessRole(['restaurant_admin', 'system_admin']));
// Apply business scoping to ensure restaurant admins only see their own business resources
router.use(requireBusinessScope());

// Schedule CRUD operations  
router.get('/', (req, res) => scheduleController.getSchedules(req as any, res));
router.get('/:id', (req, res) => scheduleController.getSchedule(req as any, res));
router.post('/', (req, res) => scheduleController.createSchedule(req as any, res));
router.put('/:id', (req, res) => scheduleController.updateSchedule(req as any, res));
router.delete('/:id', (req, res) => scheduleController.deleteSchedule(req as any, res));

export default router;
