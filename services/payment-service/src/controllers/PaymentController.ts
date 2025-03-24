import { Request, Response } from 'express';
import Payment from '../models/payment.model';

class PaymentController {
    async processPayment(req: Request, res: Response) {
        // Payment processing logic
    }

    async getPaymentStatus(req: Request, res: Response) {
        // Get payment status logic
    }
}

export default new PaymentController();
