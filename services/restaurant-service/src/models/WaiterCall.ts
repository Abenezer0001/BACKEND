import mongoose, { Schema, Document } from 'mongoose';

export enum WaiterCallReason {
  NEED_ASSISTANCE = 'NEED_ASSISTANCE',
  NEED_REFILL = 'NEED_REFILL',
  NEED_UTENSILS = 'NEED_UTENSILS',
  OTHER = 'OTHER'
}

export enum WaiterCallStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED'
}

export interface IWaiterCall extends Document {
  tableId: mongoose.Types.ObjectId;
  tableNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  venueId: mongoose.Types.ObjectId;
  reason: WaiterCallReason;
  additionalInfo?: string;
  status: WaiterCallStatus;
  userId?: mongoose.Types.ObjectId | string; // Can be ObjectId or device string for guest users
  deviceId?: string; // Used for guest users
  isGuest?: boolean;
  resolvedBy?: mongoose.Types.ObjectId; // Staff member who resolved the call
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WaiterCallSchema: Schema = new Schema({
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
  reason: {
    type: String,
    enum: Object.values(WaiterCallReason),
    required: true
  },
  additionalInfo: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: Object.values(WaiterCallStatus),
    default: WaiterCallStatus.ACTIVE,
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
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
WaiterCallSchema.index({ restaurantId: 1, status: 1 });
WaiterCallSchema.index({ venueId: 1, status: 1 });
WaiterCallSchema.index({ tableId: 1, status: 1 });
WaiterCallSchema.index({ createdAt: -1 });

// Virtual to calculate duration since call was made
WaiterCallSchema.virtual('duration').get(function() {
  const now = new Date();
  const created = this.createdAt;
  return Math.floor((now.getTime() - created.getTime()) / 1000); // Duration in seconds
});

// Pre-save hook to set resolvedAt when status changes to RESOLVED
WaiterCallSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === WaiterCallStatus.RESOLVED && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

// Pre-update hook for findOneAndUpdate
WaiterCallSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  
  if (update && update.$set && update.$set.status === WaiterCallStatus.RESOLVED) {
    if (!update.$set.resolvedAt) {
      update.$set.resolvedAt = new Date();
    }
  }
  
  next();
});

export default mongoose.model<IWaiterCall>('WaiterCall', WaiterCallSchema);