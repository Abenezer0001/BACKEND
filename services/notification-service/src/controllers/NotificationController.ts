import { Request, Response } from 'express';
import Notification from '../models/notification.model';

class NotificationController {
    async createNotification(req: Request, res: Response) {
        // Create notification logic
    }

    async getNotifications(req: Request, res: Response) {
        // Get notifications logic
    }
}

export default new NotificationController();
