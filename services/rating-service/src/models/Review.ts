import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  menuItemId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  rating: number; // 1-5
  comment: string;
  verifiedPurchase: boolean;
  helpfulVotes: {
    up: number;
    down: number;
  };
  flagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRatingCache extends Document {
  _id: mongoose.Types.ObjectId;
  entityType: 'menuItem' | 'restaurant';
  entityId: mongoose.Types.ObjectId;
  aggregatedData: {
    average: number;
    count: number;
    wilsonScore: number;
    bayesianAverage: number;
    recentTrend: number;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number; };
  };
  lastCalculated: Date;
  ttl: Date; // TTL index for automatic cleanup
}

const ReviewSchema: Schema = new Schema({
  menuItemId: {
    type: Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
    index: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: function(value: number) {
        // Allow ratings from 1.0 to 5.0 with up to 1 decimal place
        return value >= 1 && value <= 5 && Number((value * 10) % 10) % 1 === 0;
      },
      message: 'Rating must be between 1.0 and 5.0 with maximum 1 decimal place (e.g., 4.7)'
    }
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 }
  },
  flagged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const RatingCacheSchema: Schema = new Schema({
  entityType: {
    type: String,
    enum: ['menuItem', 'restaurant'],
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  aggregatedData: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    wilsonScore: { type: Number, default: 0 },
    bayesianAverage: { type: Number, default: 0 },
    recentTrend: { type: Number, default: 0 },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  ttl: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: { expireAfterSeconds: 0 }
  }
});

// Compound indexes for efficient queries
ReviewSchema.index({ menuItemId: 1, userId: 1 }, { unique: true }); // One review per user per menu item
ReviewSchema.index({ restaurantId: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1, createdAt: -1 });
ReviewSchema.index({ verifiedPurchase: 1, rating: 1 });

RatingCacheSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
export const RatingCache = mongoose.model<IRatingCache>('RatingCache', RatingCacheSchema);

export default Review;