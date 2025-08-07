import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupOrderItem {
  itemId: string;
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  customizations: any[];
  addedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId[];
  addedAt: Date;
  lastModified: Date;
  modifiedBy: mongoose.Types.ObjectId;
}

export interface IGroupOrderParticipant {
  participantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  email?: string;
  name: string;
  isAnonymous: boolean;
  joinedAt: Date;
  status: 'active' | 'left';
  lastActivity: Date;
  spendingLimit?: number;
  currentSpent: number;
}

export interface IPaymentAssignment {
  userId: mongoose.Types.ObjectId;
  amount: number;
  items?: string[];
  percentage?: number;
  paymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface ISpendingLimit {
  participantId: mongoose.Types.ObjectId;
  limit: number;
  spent: number;
  isActive: boolean;
}

export interface IGroupOrder extends Document {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  joinCode: string;
  inviteCode: string;
  restaurantId: mongoose.Types.ObjectId;
  tableId?: mongoose.Types.ObjectId;

  // Session management
  createdBy: mongoose.Types.ObjectId;
  status: 'active' | 'submitted' | 'completed' | 'cancelled' | 'expired';
  expiresAt: Date;

  // Participants
  participants: IGroupOrderParticipant[];
  maxParticipants: number;

  // Cart items with ownership
  items: IGroupOrderItem[];

  // Order totals
  totals: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    serviceFee: number;
    tip: number;
    total: number;
  };

  // Payment splitting configuration
  paymentStructure: 'pay_all' | 'equal_split' | 'pay_own' | 'custom_split';
  paymentSplit: {
    method: 'single' | 'equal' | 'individual' | 'percentage';
    assignments: IPaymentAssignment[];
    completedPayments: number;
    totalPayments: number;
  };

  // Spending limits
  spendingLimits: ISpendingLimit[];
  spendingLimitRequired: boolean;

  // Delivery information
  deliveryInfo?: {
    address: string;
    instructions?: string;
    scheduledFor?: Date;
    contactPhone?: string;
  };
  
  // Order submission details
  orderNumber?: string;
  submittedAt?: Date;
  submittedBy?: mongoose.Types.ObjectId;
  notes?: string;

  // Settings
  settings: {
    allowItemModification: boolean;
    requireApprovalForItems: boolean;
    allowAnonymousParticipants: boolean;
  };

  // Version for optimistic locking
  version: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  generateJoinCode(): string;
  generateUniqueJoinCode(): Promise<string>;
  addParticipant(name: string, email?: string, userId?: mongoose.Types.ObjectId): IGroupOrderParticipant;
  removeParticipant(participantId: mongoose.Types.ObjectId): void;
  updateSpendingLimit(participantId: mongoose.Types.ObjectId, limit: number): void;
  calculateTotals(): void;
  isExpired(): boolean;
}

export interface IOrderSession extends Document {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  inviteCode: string;
  groupOrderId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  // Invite management
  inviteToken: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  expiresAt: Date;

  createdAt: Date;
}

const GroupOrderItemSchema: Schema = new Schema({
  itemId: {
    type: String,
    required: true
    // Removed unique: true - uniqueness will be handled at application level
  },
  menuItemId: {
    type: Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  customizations: [{
    type: Schema.Types.Mixed
  }],
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  addedAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const ParticipantSchema: Schema = new Schema({
  participantId: {
    type: Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'left'],
    default: 'active'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  spendingLimit: {
    type: Number,
    min: 0
  },
  currentSpent: {
    type: Number,
    default: 0,
    min: 0
  }
});

const PaymentAssignmentSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  items: [{
    type: String
  }],
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  paymentIntentId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
});

const SpendingLimitSchema: Schema = new Schema({
  participantId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  limit: {
    type: Number,
    required: true,
    min: 0
  },
  spent: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const GroupOrderSchema: Schema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  joinCode: {
    type: String,
    required: false, // Will be set by pre-save middleware
    unique: true,
    sparse: true, // Allow multiple null values during creation
    index: true,
    minlength: 6,
    maxlength: 6,
    uppercase: true
  },
  inviteCode: {
    type: String,
    required: false, // Will be set by pre-save middleware
    unique: true,
    sparse: true, // Allow multiple null values during creation
    index: true,
    minlength: 6,
    maxlength: 6,
    uppercase: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  tableId: {
    type: Schema.Types.ObjectId,
    ref: 'Table',
    required: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'submitted', 'completed', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  maxParticipants: {
    type: Number,
    default: 8,
    min: 2,
    max: 20
  },
  participants: [ParticipantSchema],
  items: {
    type: [GroupOrderItemSchema],
    default: [],
    validate: {
      validator: function(items: IGroupOrderItem[]) {
        // Allow empty arrays
        if (items.length === 0) return true;
        
        // Check for unique itemIds within this group order
        const itemIds = items.map(item => item.itemId).filter(id => id != null);
        const uniqueItemIds = new Set(itemIds);
        return itemIds.length === uniqueItemIds.size;
      },
      message: 'Items must have unique itemIds within the group order'
    }
  },
  totals: {
    subtotal: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    tip: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 }
  },
  paymentStructure: {
    type: String,
    enum: ['pay_all', 'equal_split', 'pay_own', 'custom_split'],
    default: 'equal_split'
  },
  paymentSplit: {
    method: {
      type: String,
      enum: ['single', 'equal', 'individual', 'percentage'],
      default: 'equal'
    },
    assignments: [PaymentAssignmentSchema],
    completedPayments: { type: Number, default: 0, min: 0 },
    totalPayments: { type: Number, default: 0, min: 0 }
  },
  spendingLimits: [SpendingLimitSchema],
  spendingLimitRequired: { type: Boolean, default: false },
  deliveryInfo: {
    address: { type: String, trim: true },
    instructions: { type: String, trim: true },
    scheduledFor: { type: Date },
    contactPhone: { type: String, trim: true }
  },
  orderNumber: {
    type: String,
    sparse: true,
    index: true
  },
  submittedAt: {
    type: Date
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  },
  settings: {
    allowItemModification: { type: Boolean, default: true },
    requireApprovalForItems: { type: Boolean, default: false },
    allowAnonymousParticipants: { type: Boolean, default: true }
  },
  version: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  optimisticConcurrency: true
});

const OrderSessionSchema: Schema = new Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  groupOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'GroupOrder',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inviteToken: {
    type: String,
    required: true,
    unique: true
  },
  maxUses: {
    type: Number,
    min: 1
  },
  currentUses: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
GroupOrderSchema.index({ createdBy: 1, status: 1 });
GroupOrderSchema.index({ restaurantId: 1, status: 1 });
GroupOrderSchema.index({ expiresAt: 1 });
GroupOrderSchema.index({ 'participants.userId': 1 });

// Index for finding group orders by item details (sparse to handle empty arrays)
GroupOrderSchema.index({ 'items.menuItemId': 1 }, { sparse: true });
GroupOrderSchema.index({ 'items.addedBy': 1 }, { sparse: true });

// Compound index for sessionId and status for efficient lookups
GroupOrderSchema.index({ sessionId: 1, status: 1 });

// Index for efficient participant lookups
GroupOrderSchema.index({ 'participants.participantId': 1 }, { sparse: true });

OrderSessionSchema.index({ groupOrderId: 1 });
OrderSessionSchema.index({ createdBy: 1 });
OrderSessionSchema.index({ isActive: 1, expiresAt: 1 });

// Pre-save middleware to generate unique codes, update totals and validate itemId uniqueness
GroupOrderSchema.pre('save', async function(next) {
  // Generate unique joinCode and inviteCode if not provided
  if (!this.joinCode || !this.inviteCode) {
    try {
      const code = await this.generateUniqueJoinCode();
      if (!this.joinCode) this.joinCode = code;
      if (!this.inviteCode) this.inviteCode = code;
    } catch (error: any) {
      return next(error);
    }
  }
  
  // Ensure both codes are set
  if (!this.joinCode || !this.inviteCode) {
    const error = new Error('Failed to generate required joinCode and inviteCode');
    return next(error);
  }
  
  // Validate itemId uniqueness within this group order
  const itemIds = this.items.map((item: IGroupOrderItem) => item.itemId);
  const uniqueItemIds = new Set(itemIds);
  
  if (itemIds.length !== uniqueItemIds.size) {
    const error = new Error('Duplicate itemId found within group order');
    return next(error);
  }
  
  this.calculateTotals();
  next();
});

// Instance methods
GroupOrderSchema.methods.calculateTotals = function() {
  const subtotal = this.items.reduce((sum: number, item: IGroupOrderItem) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const tax = Math.round(subtotal * 0.08); // 8% tax
  const serviceFee = Math.round(subtotal * 0.03); // 3% service fee
  const deliveryFee = 500; // $5.00 delivery fee in cents

  this.totals = {
    subtotal,
    tax,
    deliveryFee,
    serviceFee,
    tip: this.totals.tip || 0,
    total: subtotal + tax + deliveryFee + serviceFee + (this.totals.tip || 0)
  };
};

// Generate unique join code (synchronous version for backward compatibility)
GroupOrderSchema.methods.generateJoinCode = function(): string {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (code.length < 6);
  
  this.joinCode = code;
  this.inviteCode = code;
  return code;
};

// Generate unique join code with database uniqueness check (async version)
GroupOrderSchema.methods.generateUniqueJoinCode = async function(): Promise<string> {
  const maxAttempts = 10;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    let code;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (code.length < 6);
    
    try {
      // Check if this code already exists in the database
      const existingOrder = await GroupOrder.findOne({
        $or: [
          { joinCode: code },
          { inviteCode: code }
        ]
      });
      
      if (!existingOrder) {
        return code;
      }
    } catch (error: any) {
      // If it's a duplicate key error, continue trying
      if (error.code === 11000) {
        attempts++;
        continue;
      }
      throw error;
    }
    
    attempts++;
  }
  
  throw new Error(`Failed to generate unique join code after ${maxAttempts} attempts`);
};

// Add participant to group order
GroupOrderSchema.methods.addParticipant = function(name: string, email?: string, userId?: mongoose.Types.ObjectId): IGroupOrderParticipant {
  // Check if user already exists (for registered users)
  if (userId) {
    const existingParticipant = this.participants.find((p: IGroupOrderParticipant) => 
      p.userId?.toString() === userId.toString()
    );

    if (existingParticipant) {
      existingParticipant.status = 'active';
      existingParticipant.lastActivity = new Date();
      return existingParticipant;
    }
  }

  // Check participant limit
  const activeParticipants = this.participants.filter((p: IGroupOrderParticipant) => p.status === 'active');
  if (activeParticipants.length >= this.maxParticipants) {
    throw new Error('Maximum participants limit reached');
  }

  const participantId = new mongoose.Types.ObjectId();
  const newParticipant: IGroupOrderParticipant = {
    participantId,
    userId,
    email,
    name,
    isAnonymous: !userId,
    joinedAt: new Date(),
    status: 'active' as const,
    lastActivity: new Date(),
    currentSpent: 0
  };

  this.participants.push(newParticipant);
  return newParticipant;
};

GroupOrderSchema.methods.removeParticipant = function(participantId: mongoose.Types.ObjectId) {
  const participant = this.participants.find((p: IGroupOrderParticipant) => 
    p.participantId.toString() === participantId.toString()
  );

  if (participant) {
    participant.status = 'left';
    participant.lastActivity = new Date();

    // Remove items added by this participant
    this.items = this.items.filter((item: IGroupOrderItem) => 
      item.addedBy.toString() !== participantId.toString()
    );

    // Remove from spending limits
    this.spendingLimits = this.spendingLimits.filter((limit: ISpendingLimit) => 
      limit.participantId.toString() !== participantId.toString()
    );
  }
};

// Update spending limit for a participant
GroupOrderSchema.methods.updateSpendingLimit = function(participantId: mongoose.Types.ObjectId, limit: number) {
  const participant = this.participants.find((p: IGroupOrderParticipant) => 
    p.participantId.toString() === participantId.toString()
  );

  if (participant) {
    participant.spendingLimit = limit;
    
    // Update or create spending limit record
    let spendingLimit = this.spendingLimits.find((sl: ISpendingLimit) => 
      sl.participantId.toString() === participantId.toString()
    );

    if (spendingLimit) {
      spendingLimit.limit = limit;
      spendingLimit.isActive = true;
    } else {
      this.spendingLimits.push({
        participantId,
        limit,
        spent: participant.currentSpent || 0,
        isActive: true
      });
    }
  }
};

// Check if group order has expired
GroupOrderSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

GroupOrderSchema.methods.addItem = function(itemData: Partial<IGroupOrderItem>) {
  // Generate a unique itemId for this group order
  let itemId: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    itemId = new mongoose.Types.ObjectId().toString();
    attempts++;
    
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique itemId after maximum attempts');
    }
  } while (this.items.some((item: IGroupOrderItem) => item.itemId === itemId));
  
  const newItem: IGroupOrderItem = {
    itemId,
    menuItemId: itemData.menuItemId!,
    name: itemData.name!,
    price: itemData.price!,
    quantity: itemData.quantity!,
    customizations: itemData.customizations || [],
    addedBy: itemData.addedBy!,
    assignedTo: itemData.assignedTo,
    addedAt: new Date(),
    lastModified: new Date(),
    modifiedBy: itemData.addedBy!
  };

  this.items.push(newItem);
  this.version += 1;
  return newItem;
};

GroupOrderSchema.methods.updateItem = function(itemId: string, updates: Partial<IGroupOrderItem>, modifiedBy: mongoose.Types.ObjectId) {
  const item = this.items.find((i: IGroupOrderItem) => i.itemId === itemId);
  
  if (!item) {
    throw new Error('Item not found');
  }

  Object.assign(item, updates);
  item.lastModified = new Date();
  item.modifiedBy = modifiedBy;
  this.version += 1;
  
  return item;
};

GroupOrderSchema.methods.removeItem = function(itemId: string) {
  const index = this.items.findIndex((i: IGroupOrderItem) => i.itemId === itemId);
  
  if (index === -1) {
    throw new Error('Item not found');
  }

  this.items.splice(index, 1);
  this.version += 1;
};

export const GroupOrder = mongoose.model<IGroupOrder>('GroupOrder', GroupOrderSchema);
export const OrderSession = mongoose.model<IOrderSession>('OrderSession', OrderSessionSchema);

export default GroupOrder;