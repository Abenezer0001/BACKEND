import mongoose, { Schema, Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export interface IOrderItem extends Document {
  menuItem: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  modifiers: {
    groupId: mongoose.Types.ObjectId;
    selections: {
      optionId: mongoose.Types.ObjectId;
      name: string;
      quantity: number;
      price: number;
    }[];
  }[];
  specialInstructions?: string;
  subtotal: number;
  status?: string;
}

export interface IStatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface IOrderAlert {
  type: string;
  message: string;
  timestamp: string;
  acknowledged?: boolean;
}

export interface IOrder extends Document {
  orderNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  tableId?: mongoose.Types.ObjectId;
  tableNumber?: string;
  userId?: mongoose.Types.ObjectId | string; // Can be ObjectId or device string for guest users
  deviceId?: string; // Used for guest users
  isGuest?: boolean; // Flag to indicate if this is a guest user
  items: IOrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  tax: number;
  tip?: number;
  service_charge?: number;
  total: number;
  loyaltyDiscount?: {
    applied: boolean;
    discountPercent: number;
    discountAmount: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    timeBonusPercent: number;
    frequencyBonusPercent: number;
    isFirstTime: boolean;
  };
  specialInstructions?: string;
  cancellationReason?: string;
  estimatedPreparationTime?: number;
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  paymentMethod?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    additionalInfo?: string;
  };
  paidAt?: Date;
  completedAt?: Date;
  statusHistory?: IStatusHistoryEntry[];
  alerts?: IOrderAlert[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema: Schema = new Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  modifiers: [{
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ModifierGroup'
    },
    selections: [{
      optionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ModifierOption'
      },
      name: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }]
  }],
  specialInstructions: {
    type: String,
    trim: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    default: 'pending'
  }
});

const StatusHistorySchema: Schema = new Schema({
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  note: {
    type: String
  }
});

const OrderAlertSchema: Schema = new Schema({
  type: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: String,
    required: true
  },
  acknowledged: {
    type: Boolean,
    default: false
  }
});

const OrderSchema: Schema = new Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  },
  tableNumber: {
    type: String,
    trim: true
  },
  userId: {
    // Support both ObjectId (for regular users) and String (for guest users)
    type: Schema.Types.Mixed,
    ref: 'User',
    required: function(this: any) {
      // Only required if deviceId is not present
      return !this.deviceId;
    },
    // Add a validator to ensure value is either ObjectId or a string starting with "device_"
    validate: {
      validator: function(v: any) {
        // Accept if it's a valid ObjectId or a string starting with "device_"
        return (mongoose.Types.ObjectId.isValid(v) || 
                (typeof v === 'string' && v.startsWith('device_')));
      },
      message: 'userId must be either a valid ObjectId or a device ID string'
    }
  },
  deviceId: {
    type: String,
    required: function(this: any) {
      return !this.userId; // Only required if no userId is provided
    }
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  items: [OrderItemSchema],
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    index: true
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  tip: {
    type: Number,
    min: 0,
    default: 0
  },
  service_charge: {
    type: Number,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  loyaltyDiscount: {
    applied: {
      type: Boolean,
      default: false
    },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100
    },
    discountAmount: {
      type: Number,
      min: 0
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum']
    },
    timeBonusPercent: {
      type: Number,
      min: 0
    },
    frequencyBonusPercent: {
      type: Number,
      min: 0
    },
    isFirstTime: {
      type: Boolean,
      default: false
    }
  },
  specialInstructions: {
    type: String,
    trim: true
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  estimatedPreparationTime: {
    type: Number,
    min: 0
  },
  orderType: {
    type: String,
    enum: ['DINE_IN', 'TAKEAWAY'],
    required: true
  }
}, {
  timestamps: true
});

// Generate order number before saving
OrderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    this.orderNumber = `${year}${month}${day}-${random}`;
  }
  next();
});

OrderSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate() as any;
  
  if (update && update.$set && update.$set.status) {
    const orderId = this.getQuery()['_id'];
    const order = await mongoose.model('Order').findById(orderId);
    
    if (order && order.status !== update.$set.status) {
      const historyEntry = {
        status: update.$set.status,
        timestamp: new Date(),
        note: update.$set.statusNote || ''
      };
      
      if (!update.$push) update.$push = {};
      update.$push.statusHistory = historyEntry;
      
      if (update.$set.status === OrderStatus.COMPLETED && !update.$set.completedAt) {
        update.$set.completedAt = new Date();
      }
    }
  }
  
  if (update && update.$set && update.$set.paymentStatus === PaymentStatus.PAID) {
    if (!update.$set.paidAt) {
      update.$set.paidAt = new Date();
    }
  }
  
  next();
});

export default mongoose.model<IOrder>('Order', OrderSchema); 