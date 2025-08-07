import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  stripeSessionId: string;
  customSessionId?: string; // Store custom frontend session IDs
  paymentIntentId?: string;
  orderId?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
  stripeSessionId: {
    type: String,
    required: true,
    unique: true
  },
  customSessionId: {
    type: String,
    sparse: true,
    index: true
  },
  paymentIntentId: {
    type: String,
    sparse: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster lookup
PaymentSchema.index({ stripeSessionId: 1 });
PaymentSchema.index({ paymentIntentId: 1 });
PaymentSchema.index({ orderId: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);