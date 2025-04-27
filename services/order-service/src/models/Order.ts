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
  userId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  total: {
    type: Number,
    required: true,
    min: 0
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
    enum: ['DINE_IN', 'TAKEOUT', 'DELIVERY'],
    required: true,
    index: true
  },
  paymentMethod: {
    type: String
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    additionalInfo: String
  },
  paidAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  statusHistory: {
    type: [StatusHistorySchema],
    default: []
  },
  alerts: {
    type: [OrderAlertSchema],
    default: []
  }
}, {
  timestamps: true
});

OrderSchema.pre('save', async function(this: IOrder, next) {
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
