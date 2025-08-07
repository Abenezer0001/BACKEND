import { Schema, model } from 'mongoose';

interface INotification {
    userId: string;
    message: string;
    timestamp: Date;
}

const notificationSchema = new Schema<INotification>({
    userId: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Notification = model<INotification>('Notification', notificationSchema);

export default Notification;
