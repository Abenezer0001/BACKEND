import mongoose, { Schema, Document } from 'mongoose';

export enum CashPaymentStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED', 
  CANCELLED = 'CANCELLED'
}

export interface ICashPaymentRequest extends Document {
  tableId: mongoose.Types.ObjectId;
  tableNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  venueId: mongoose.Types.ObjectId;
  totalAmount: number;
  orderIds: mongoose.Types.ObjectId[]; // Associated order IDs
  status: CashPaymentStatus;
  userId?: mongoose.Types.ObjectId | string; // Can be ObjectId or device string for guest users
  deviceId?: string; // Used for guest users
  isGuest?: boolean;
  collectedBy?: mongoose.Types.ObjectId; // Staff member who collected payment
  collectedAt?: Date;
  additionalInfo?: string; // Special instructions or notes
  createdAt: Date;
  updatedAt: Date;
}

const CashPaymentRequestSchema: Schema = new Schema({
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true,
    index: true
  },
  tableNumber: {
    type: String,
    required: true,
    trim: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  orderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  }],
  status: {
    type: String,
    enum: Object.values(CashPaymentStatus),
    default: CashPaymentStatus.PENDING,
    index: true
  },
  userId: {
    type: Schema.Types.Mixed,
    ref: 'User',
    validate: {
      validator: function(v: any) {
        if (!v) return true; // Optional field
        return (mongoose.Types.ObjectId.isValid(v) || 
                (typeof v === 'string' && v.startsWith('device_')));
      },
      message: 'userId must be either a valid ObjectId or a device ID string'
    }
  },
  deviceId: {
    type: String,
    trim: true
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  collectedAt: {
    type: Date
  },
  additionalInfo: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for better query performance
CashPaymentRequestSchema.index({ restaurantId: 1, status: 1 });
CashPaymentRequestSchema.index({ venueId: 1, status: 1 });
CashPaymentRequestSchema.index({ tableId: 1, status: 1 });
CashPaymentRequestSchema.index({ createdAt: -1 });

// Virtual to calculate duration since request was made
CashPaymentRequestSchema.virtual('duration').get(function() {
  const now = new Date();
  const created = this.createdAt;
  return Math.floor((now.getTime() - created.getTime()) / 1000); // Duration in seconds
});

// Pre-save hook to set collectedAt when status changes to COLLECTED
CashPaymentRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === CashPaymentStatus.COLLECTED && !this.collectedAt) {
    this.collectedAt = new Date();
  }
  next();
});

// Pre-update hook for findOneAndUpdate
CashPaymentRequestSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  
  if (update && update.$set && update.$set.status === CashPaymentStatus.COLLECTED) {
    if (!update.$set.collectedAt) {
      update.$set.collectedAt = new Date();
    }
  }
  
  next();
});

export default mongoose.model<ICashPaymentRequest>('CashPaymentRequest', CashPaymentRequestSchema);