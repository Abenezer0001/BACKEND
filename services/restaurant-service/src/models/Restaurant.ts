import mongoose, { Schema, Document } from 'mongoose';

export interface IVenue extends Document {
  name: string;
  description?: string;
  capacity: number;
  isActive: boolean;
}

export interface ISchedule extends Document {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isHoliday: boolean;
}

export interface IMenuSchedule extends Document {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isAvailable: boolean;
}

export interface IRestaurant extends Document {
  name: string;
  businessId: mongoose.Types.ObjectId; // NEW: Link to Business
  locations: Array<{
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
  venues: mongoose.Types.ObjectId[];
  tables: mongoose.Types.ObjectId[];
  menu: Array<{
    category: string;
    items: Array<{
      name: string;
      description: string;
      price: number;
      modifiers: Array<{
        name: string;
        options: string[];
        price: number;
      }>;
      isAvailable: boolean;
      schedule: IMenuSchedule[];
    }>;
  }>;
  adminIds: string[]; // DEPRECATED: Will be replaced by business-level roles
  schedule: ISchedule[];
  service_charge?: {
    enabled: boolean;
    percentage: number; // 10-20% range
  };
  createdAt: Date;
  updatedAt: Date;
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
  }
});



const ScheduleSchema: Schema = new Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  openTime: {
    type: String,
    required: true
  },
  closeTime: {
    type: String,
    required: true
  },
  isHoliday: {
    type: Boolean,
    default: false
  }
});

const MenuScheduleSchema: Schema = new Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  openTime: {
    type: String,
    required: true
  },
  closeTime: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
});

const RestaurantSchema: Schema = new Schema({
  name: { type: String, required: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true }, // NEW: Business reference
  locations: [{
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  }],
  venues: { type: [Schema.Types.ObjectId], ref: 'Venue', default: [] },
  tables: { type: [Schema.Types.ObjectId], ref: 'Table', default: [] },
  menu: [{
    category: { type: String, required: true },
    items: [{
      name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true },
      modifiers: [{
        name: { type: String, required: true },
        options: [{ type: String }],
        price: { type: Number, required: true }
      }],
      isAvailable: { type: Boolean, default: true },
      schedule: [MenuScheduleSchema]
    }]
  }],
  schedule: [ScheduleSchema],
  adminIds: [{ type: Schema.Types.ObjectId, ref: 'User' }], // DEPRECATED but keeping for backwards compatibility
  service_charge: {
    enabled: {
      type: Boolean,
      default: false
    },
    percentage: {
      type: Number,
      min: 10,
      max: 20,
      default: 10
    }
  }
}, {
  timestamps: true
});

// Add indexes for business filtering
RestaurantSchema.index({ businessId: 1 });
RestaurantSchema.index({ businessId: 1, name: 1 });

export default mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
