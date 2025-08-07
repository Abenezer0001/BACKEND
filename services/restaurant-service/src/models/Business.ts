import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBusiness extends Document {
  name: string; // e.g., "Awesome Cinemas Group", "Foodie Ventures Inc."
  legalName?: string;
  registrationNumber?: string;
  contactInfo: {
    email: string;
    phone?: string;
    address?: string; // HQ Address
  };
  ownerId: Types.ObjectId; // Ref to User model (the Business Owner)
  restaurants?: any[]; // Virtual populate field for restaurants
  isActive: boolean;
  loyaltyProgramEnabled: boolean; // Loyalty program opt-in
  stripeConnectAccount?: {
    accountId: string;
    accountStatus: 'pending' | 'active' | 'inactive' | 'rejected';
    onboardingCompleted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    onboardingUrl?: string;
    detailsSubmitted: boolean;
    requirementsDue?: string[];
    lastStatusCheck: Date;
  };
  platformSettings?: {
    platformFeePercentage: number; // Default 5%
    enableAutomaticPayouts: boolean;
    payoutSchedule: 'daily' | 'weekly' | 'monthly';
  };
  settings?: Record<string, any>; // Business-level settings (future)
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  legalName: { 
    type: String, 
    trim: true 
  },
  registrationNumber: { 
    type: String, 
    trim: true 
  },
  contactInfo: {
    email: { 
      type: String, 
      required: true, 
      trim: true 
    },
    phone: { 
      type: String, 
      trim: true 
    },
    address: { 
      type: String, 
      trim: true 
    },
  },
  ownerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  },
  loyaltyProgramEnabled: {
    type: Boolean,
    default: false
  },
  stripeConnectAccount: {
    accountId: { type: String, sparse: true },
    accountStatus: { 
      type: String, 
      enum: ['pending', 'active', 'inactive', 'rejected'],
      default: 'pending'
    },
    onboardingCompleted: { type: Boolean, default: false },
    chargesEnabled: { type: Boolean, default: false },
    payoutsEnabled: { type: Boolean, default: false },
    onboardingUrl: { type: String },
    detailsSubmitted: { type: Boolean, default: false },
    requirementsDue: [{ type: String }],
    lastStatusCheck: { type: Date, default: Date.now }
  },
  platformSettings: {
    platformFeePercentage: { type: Number, default: 5.0 },
    enableAutomaticPayouts: { type: Boolean, default: true },
    payoutSchedule: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly'], 
      default: 'weekly' 
    }
  },
  settings: { 
    type: Schema.Types.Mixed 
  },
}, {
  timestamps: true
});

// Virtual to populate restaurants
BusinessSchema.virtual('restaurants', {
  ref: 'Restaurant',
  localField: '_id',
  foreignField: 'businessId'
});

// Ensure virtual fields are serialized
BusinessSchema.set('toJSON', { virtuals: true });
BusinessSchema.set('toObject', { virtuals: true });

// Index for efficient lookup by owner
BusinessSchema.index({ ownerId: 1 });
BusinessSchema.index({ name: 1 });
BusinessSchema.index({ isActive: 1 });

export default mongoose.model<IBusiness>('Business', BusinessSchema); 