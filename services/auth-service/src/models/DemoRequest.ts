import mongoose, { Document, Schema } from 'mongoose';

export interface IDemoRequest extends Document {
  fullName: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  restaurantName: string;
  restaurantId?: mongoose.Types.ObjectId; // Reference to the demo restaurant
  adminDemoLink?: string;
  customerDemoLink?: string;
  status: 'pending' | 'processed' | 'completed';
  adminDemoPassword?: string; // Temporary password for demo admin access
  createdAt: Date;
  expiresAt: Date; // When demo access expires
}

const DemoRequestSchema = new Schema<IDemoRequest>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phoneNumber: { type: String, required: true },
    companyName: { type: String, required: true },
    restaurantName: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    adminDemoLink: { type: String },
    customerDemoLink: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'processed', 'completed'], 
      default: 'pending' 
    },
    adminDemoPassword: { type: String },
    expiresAt: { 
      type: Date, 
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from creation
    }
  },
  { timestamps: true }
);

export default mongoose.model<IDemoRequest>('DemoRequest', DemoRequestSchema); 