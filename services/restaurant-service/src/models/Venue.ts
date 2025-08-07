import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceCharge {
  type: 'percentage' | 'flat';
  value: number;
  minAmount?: number;
  maxAmount?: number;
  enabled: boolean;
}

export interface IVenue extends Document {
  name: string;
  description?: string;
  capacity: number;
  isActive: boolean;
  restaurantId: mongoose.Types.ObjectId;
  tables: mongoose.Types.ObjectId[];
  serviceCharge?: IServiceCharge;
}

const VenueSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Restaurant'
  },
  tables: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Table' 
  }],
  serviceCharge: {
    type: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage'
    },
    value: {
      type: Number,
      min: 0,
      default: 0
    },
    minAmount: {
      type: Number,
      min: 0
    },
    maxAmount: {
      type: Number,
      min: 0
    },
    enabled: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

export default mongoose.model<IVenue>('Venue', VenueSchema);
