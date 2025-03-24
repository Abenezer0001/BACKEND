import { Router } from 'express';
import NotificationController from '../controllers/NotificationController';

const router = Router();

router.post('/', NotificationController.createNotification);
router.get('/', NotificationController.getNotifications);

export default router;
