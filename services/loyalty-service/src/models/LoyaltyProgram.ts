import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILoyaltyProgram extends Document {
  restaurantId: Types.ObjectId;
  isEnabled: boolean;
  settings: {
    firstTimeDiscountPercent: number; // Default: 10%
    timeBased: {
      within24Hours: number; // Default: 20%
      within2To3Days: number; // Default: 15%
      within4To5Days: number; // Default: 10%
      after5Days: number; // Default: 5%
    };
    frequencyTiers: {
      bronze: {
        minVisits: number; // Default: 1
        maxVisits: number; // Default: 5
        bonusPercent: number; // Default: 0%
      };
      silver: {
        minVisits: number; // Default: 6
        maxVisits: number; // Default: 15
        bonusPercent: number; // Default: 2%
      };
      gold: {
        minVisits: number; // Default: 16
        maxVisits: number; // Default: 30
        bonusPercent: number; // Default: 5%
      };
      platinum: {
        minVisits: number; // Default: 31
        maxVisits: number; // Default: 999999
        bonusPercent: number; // Default: 10%
      };
    };
    maxDiscountCap: number; // Default: 30%
    allowStackingWithPromotions: boolean; // Default: true
  };
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyProgramSchema: Schema = new Schema({
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    unique: true
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  settings: {
    firstTimeDiscountPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100
    },
    timeBased: {
      within24Hours: {
        type: Number,
        default: 20,
        min: 0,
        max: 100
      },
      within2To3Days: {
        type: Number,
        default: 15,
        min: 0,
        max: 100
      },
      within4To5Days: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
      },
      after5Days: {
        type: Number,
        default: 5,
        min: 0,
        max: 100
      }
    },
    frequencyTiers: {
      bronze: {
        minVisits: { type: Number, default: 1 },
        maxVisits: { type: Number, default: 5 },
        bonusPercent: { type: Number, default: 0 }
      },
      silver: {
        minVisits: { type: Number, default: 6 },
        maxVisits: { type: Number, default: 15 },
        bonusPercent: { type: Number, default: 2 }
      },
      gold: {
        minVisits: { type: Number, default: 16 },
        maxVisits: { type: Number, default: 30 },
        bonusPercent: { type: Number, default: 5 }
      },
      platinum: {
        minVisits: { type: Number, default: 31 },
        maxVisits: { type: Number, default: 999999 },
        bonusPercent: { type: Number, default: 10 }
      }
    },
    maxDiscountCap: {
      type: Number,
      default: 30,
      min: 0,
      max: 100
    },
    allowStackingWithPromotions: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient lookup
LoyaltyProgramSchema.index({ restaurantId: 1 });
LoyaltyProgramSchema.index({ isEnabled: 1 });

export default mongoose.model<ILoyaltyProgram>('LoyaltyProgram', LoyaltyProgramSchema);