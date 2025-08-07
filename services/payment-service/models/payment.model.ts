import { Schema, model } from 'mongoose';

interface IPayment {
    userId: string;
    amount: number;
    status: string;
}

const paymentSchema = new Schema<IPayment>({
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true }
});

const Payment = model<IPayment>('Payment', paymentSchema);

export default Payment;
