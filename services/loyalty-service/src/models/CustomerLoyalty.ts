import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILoyaltyVisit {
  visitDate: Date;
  orderAmount: number;
  discountApplied: number;
  discountPercent: number;
  tierAtVisit: 'bronze' | 'silver' | 'gold' | 'platinum';
  timeBonusPercent: number;
  frequencyBonusPercent: number;
}

export interface ICustomerLoyalty extends Document {
  customerId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  totalVisits: number;
  firstVisitDate: Date;
  lastVisitDate: Date;
  currentTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  hasUsedFirstTimeDiscount: boolean;
  visits: ILoyaltyVisit[];
  totalSpent: number;
  totalSavings: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyVisitSchema: Schema = new Schema({
  visitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  orderAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discountApplied: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  tierAtVisit: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    required: true
  },
  timeBonusPercent: {
    type: Number,
    required: true,
    min: 0
  },
  frequencyBonusPercent: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const CustomerLoyaltySchema: Schema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  totalVisits: {
    type: Number,
    default: 0,
    min: 0
  },
  firstVisitDate: {
    type: Date,
    default: Date.now
  },
  lastVisitDate: {
    type: Date,
    default: Date.now
  },
  currentTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  hasUsedFirstTimeDiscount: {
    type: Boolean,
    default: false
  },
  visits: [LoyaltyVisitSchema],
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSavings: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for unique customer-restaurant pair
CustomerLoyaltySchema.index({ customerId: 1, restaurantId: 1 }, { unique: true });

// Index for efficient lookups
CustomerLoyaltySchema.index({ restaurantId: 1 });
CustomerLoyaltySchema.index({ customerId: 1 });
CustomerLoyaltySchema.index({ currentTier: 1 });
CustomerLoyaltySchema.index({ lastVisitDate: 1 });
CustomerLoyaltySchema.index({ totalVisits: 1 });

// Virtual to get visits from last 24 hours
CustomerLoyaltySchema.virtual('visitsLast24Hours').get(function() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return this.visits.filter(visit => visit.visitDate >= yesterday);
});

// Virtual to get visits from today
CustomerLoyaltySchema.virtual('visitsToday').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.visits.filter(visit => 
    visit.visitDate >= today && visit.visitDate < tomorrow
  );
});

// Method to calculate next tier requirements
CustomerLoyaltySchema.methods.getNextTierInfo = function() {
  const tiers = {
    bronze: { name: 'Silver', visits: 6 },
    silver: { name: 'Gold', visits: 16 },
    gold: { name: 'Platinum', visits: 31 },
    platinum: { name: 'Platinum', visits: null }
  };
  
  const nextTier = tiers[this.currentTier as keyof typeof tiers];
  if (!nextTier.visits) {
    return { tier: 'Platinum', visitsRemaining: 0, isMaxTier: true };
  }
  
  return {
    tier: nextTier.name,
    visitsRemaining: Math.max(0, nextTier.visits - this.totalVisits),
    isMaxTier: false
  };
};

// Ensure virtual fields are serialized
CustomerLoyaltySchema.set('toJSON', { virtuals: true });
CustomerLoyaltySchema.set('toObject', { virtuals: true });

export default mongoose.model<ICustomerLoyalty>('CustomerLoyalty', CustomerLoyaltySchema);