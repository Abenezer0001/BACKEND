import mongoose, { Schema, Document } from 'mongoose';

export interface IStaff extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'server' | 'bartender' | 'busser' | 'food_runner' | 'host' | 'kitchen';

  // Stripe Connect account for tip payouts
  stripeAccountId?: string;
  accountStatus: 'pending' | 'active' | 'restricted';

  // QR code for customer tipping
  qrCode: string;
  qrCodeExpiry: Date;

  // Tip settings
  tipSettings: {
    instantPayouts: boolean;
    minimumPayout: number; // in cents
    preferredPayoutSchedule: 'instant' | 'daily' | 'weekly';
    participateInTipPool: boolean;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITipTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  customerId?: string;
  orderId?: mongoose.Types.ObjectId;

  // Payment details
  amount: number; // in cents
  currency: string;
  stripePaymentIntentId: string;
  paymentMethodId: string;

  // Tip context
  tipType: 'direct' | 'pooled' | 'percentage' | 'auto_gratuity';
  source: 'qr_code' | 'pos_system' | 'mobile_app' | 'website';
  tableNumber?: string;
  shiftId?: mongoose.Types.ObjectId;

  // Processing
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processingFee: number;
  netAmount: number;

  // Metadata
  customerFeedback?: string;
  rating?: number;
  metadata: any;

  createdAt: Date;
  processedAt?: Date;
}

export interface ITipPool extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  shiftId: mongoose.Types.ObjectId;
  date: Date;

  participants: Array<{
    staffId: mongoose.Types.ObjectId;
    role: string;
    hoursWorked: number;
    salesAmount: number;
    points: number;
    percentage: number;
  }>;

  distributionMethod: 'equal' | 'hours' | 'sales' | 'points' | 'custom';
  totalAmount: number;
  distributedAmount: number;

  status: 'active' | 'distributed' | 'closed';
  createdAt: Date;
  distributedAt?: Date;
}

const StaffSchema: Schema = new Schema({
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['server', 'bartender', 'busser', 'food_runner', 'host', 'kitchen'],
    required: true
  },
  stripeAccountId: {
    type: String,
    sparse: true
  },
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'restricted'],
    default: 'pending'
  },
  qrCode: {
    type: String,
    required: true,
    unique: true
  },
  qrCodeExpiry: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
  },
  tipSettings: {
    instantPayouts: {
      type: Boolean,
      default: false
    },
    minimumPayout: {
      type: Number,
      default: 500 // $5.00 in cents
    },
    preferredPayoutSchedule: {
      type: String,
      enum: ['instant', 'daily', 'weekly'],
      default: 'daily'
    },
    participateInTipPool: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const TipTransactionSchema: Schema = new Schema({
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  staffId: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true
  },
  customerId: {
    type: String,
    index: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  paymentMethodId: {
    type: String,
    required: true
  },
  tipType: {
    type: String,
    enum: ['direct', 'pooled', 'percentage', 'auto_gratuity'],
    required: true
  },
  source: {
    type: String,
    enum: ['qr_code', 'pos_system', 'mobile_app', 'website'],
    required: true
  },
  tableNumber: {
    type: String,
    trim: true
  },
  shiftId: {
    type: Schema.Types.ObjectId,
    ref: 'Shift'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  processingFee: {
    type: Number,
    required: true,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  customerFeedback: {
    type: String,
    trim: true,
    maxlength: 500
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const TipPoolSchema: Schema = new Schema({
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  shiftId: {
    type: Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  participants: [{
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    role: {
      type: String,
      required: true
    },
    hoursWorked: {
      type: Number,
      required: true,
      min: 0
    },
    salesAmount: {
      type: Number,
      required: true,
      min: 0
    },
    points: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  }],
  distributionMethod: {
    type: String,
    enum: ['equal', 'hours', 'sales', 'points', 'custom'],
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  distributedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'distributed', 'closed'],
    default: 'active',
    index: true
  },
  distributedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
StaffSchema.index({ restaurantId: 1, employeeId: 1 }, { unique: true });
StaffSchema.index({ qrCode: 1 });
StaffSchema.index({ email: 1 });

TipTransactionSchema.index({ restaurantId: 1, createdAt: -1 });
TipTransactionSchema.index({ staffId: 1, status: 1 });
TipTransactionSchema.index({ stripePaymentIntentId: 1 });
TipTransactionSchema.index({ customerId: 1, createdAt: -1 });

TipPoolSchema.index({ restaurantId: 1, date: -1 });
TipPoolSchema.index({ status: 1, date: -1 });

export const Staff = mongoose.model<IStaff>('Staff', StaffSchema);
export const TipTransaction = mongoose.model<ITipTransaction>('TipTransaction', TipTransactionSchema);
export const TipPool = mongoose.model<ITipPool>('TipPool', TipPoolSchema);

export default Staff;