import express from 'express';
import { ScheduleController } from '../controllers/scheduleController';
import { authenticateJWT } from '../../../auth-service/src/middleware/auth';
import { requirePermission } from '../../../auth-service/src/middleware/rbacMiddleware';
import { requireBusinessRole, requireBusinessScope } from '../../../auth-service/src/middleware/businessRbacMiddleware';

const router = express.Router();
const scheduleController = new ScheduleController();

// Apply authentication middleware to all routes
router.use(authenticateJWT);
// Allow restaurant_admin access to schedule management
router.use(requireBusinessRole(['restaurant_admin', 'system_admin']));
// Apply business scoping to ensure restaurant admins only see their own business resources
router.use(requireBusinessScope());

// Schedule CRUD operations
router.get('/', requirePermission('schedule', 'read'), (req, res) => scheduleController.getSchedules(req, res));
router.get('/:id', requirePermission('schedule', 'read'), (req, res) => scheduleController.getSchedule(req, res));
router.post('/', requirePermission('schedule', 'create'), (req, res) => scheduleController.createSchedule(req, res));
router.put('/:id', requirePermission('schedule', 'update'), (req, res) => scheduleController.updateSchedule(req, res));
router.delete('/:id', requirePermission('schedule', 'delete'), (req, res) => scheduleController.deleteSchedule(req, res));

// Schedule workflow management
router.patch('/:id/approve', requirePermission('schedule', 'update'), (req, res) => scheduleController.approveSchedule(req, res));
router.patch('/:id/activate', requirePermission('schedule', 'update'), (req, res) => scheduleController.activateSchedule(req, res));

// Availability checking
router.post('/check-availability', requirePermission('schedule', 'read'), (req, res) => scheduleController.checkAvailability(req, res));

// Menu item availability management
router.patch('/menu-item/:menuItemId/availability', requirePermission('schedule', 'update'), (req, res) => scheduleController.updateMenuItemAvailability(req, res));

export default router; 