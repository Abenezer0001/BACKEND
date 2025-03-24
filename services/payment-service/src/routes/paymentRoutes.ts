import { Router } from 'express';
import PaymentController from '../controllers/PaymentController';

const router = Router();

router.post('/', PaymentController.processPayment);
router.get('/:id', PaymentController.getPaymentStatus);

export default router;
