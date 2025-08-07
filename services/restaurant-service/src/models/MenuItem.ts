import mongoose, { Schema, Document, Types } from 'mongoose';
import { ICategory } from './Category'; // Import Category interface
import { ISubCategory } from './SubCategory'; // Import SubCategory interface
import { ISubSubCategory } from './SubSubCategory'; // Import SubSubCategory interface
import { IVenue } from './Venue'; // Import Venue interface
import { IModifier } from './Modifier'; // Import Modifier interface

// Re-define Modifier interfaces here if they are not globally accessible or move them to a common types file
// For now, assuming IModifierGroup is correctly imported or defined elsewhere

// Menu Item Schedule Interface
export interface IMenuItemSchedule extends Document {
  type: 'WEEKLY' | 'SPECIFIC_DATES';
  // For weekly schedules
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  startTime?: string;    // HH:mm format
  endTime?: string;      // HH:mm format
  // For specific date schedules
  specificDates?: {
    date: Date;
    startTime: string;
    endTime: string;
  }[];
  // Discount settings
  discountRate?: number; // Percentage discount (0-100)
  isActive: boolean;
  name?: string;        // Optional schedule name
  description?: string; // Optional schedule description
}

export interface IMenuItem extends Document {
  name: string;
  description: string;
  venueId: IVenue['_id']; // Link to the specific Venue
  kitchenId?: Types.ObjectId; // Link to Kitchen for order routing
  categories: Types.ObjectId[]; // Array of Category IDs
  subCategories: Types.ObjectId[]; // Array of SubCategory IDs
  subSubCategory?: Types.ObjectId | null; // Optional link to SubSubCategory
  price: number;
  modifierGroups?: IModifier[]; // Changed IModifierGroup to IModifier
  image?: string;
  preparationTime: number;
  isAvailable: boolean;
  isActive: boolean; // Added isActive for item-level control
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fats?: number;
  };
  // New scheduling fields
  schedules?: IMenuItemSchedule[]; // Array of schedules for this menu item
  basePrice: number; // Store original price for discount calculations
  currentDiscountRate?: number; // Current active discount rate
  restaurantId: Types.ObjectId; // Add restaurantId for easier querying
  activeRecipeId?: Types.ObjectId | null; // Optional link to a Recipe
  createdAt: Date;
  updatedAt: Date;
}

// Menu Item Schedule Schema
const MenuItemScheduleSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['WEEKLY', 'SPECIFIC_DATES'],
    required: true
  },
  // For weekly schedules
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6
  }],
  startTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // For specific date schedules
  specificDates: [{
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
  }],
  // Discount settings
  discountRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  name: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
});

const MenuItemSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    // Removed required: true to make it optional if needed, adjust as per actual requirement
    trim: true
  },
  venueId: { // Link to the specific Venue
    type: Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true // Add index for faster venue-based lookups
  },
  kitchenId: { // Link to Kitchen for order routing
    type: Schema.Types.ObjectId,
    ref: 'Kitchen',
    required: false,
    index: true
  },
  categories: [{ // Array of Category references
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  subCategories: [{ // Array of SubCategory references
    type: Schema.Types.ObjectId,
    ref: 'SubCategory'
  }],
  subSubCategory: { // Optional link to SubSubCategory
    type: Schema.Types.ObjectId,
    ref: 'SubSubCategory',
    required: false, // Explicitly optional
    default: null // Set default to null
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  modifierGroups: [{ // Array of Modifier references
    type: Schema.Types.ObjectId,
    ref: 'Modifier'
  }],
  image: {
    type: String,
    trim: true
  },
  preparationTime: {
    type: Number,
    required: true,
    min: 0
  },
  isAvailable: { // Availability for ordering
    type: Boolean,
    default: true
  },
  isActive: { // Soft delete / visibility control
      type: Boolean,
      default: true
  },
  allergens: {
    type: [String],
    default: []
  },
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fats: Number
  },
  // New scheduling fields
  schedules: [MenuItemScheduleSchema],
  basePrice: {
    type: Number,
    required: true,
    min: 0,
    default: function(this: IMenuItem) { 
      return this.price; 
    }
  },
  currentDiscountRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  restaurantId: { // Denormalize restaurantId for easier filtering/access control
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  activeRecipeId: { // Optional link to a Recipe in inventory-service
    type: Schema.Types.ObjectId,
    ref: 'Recipe', // Assuming 'Recipe' is the model name in mongoose
    required: false,
    default: null
  }
}, {
  timestamps: true
});

// Add compound indexes for common query combinations
MenuItemSchema.index({ restaurantId: 1, venueId: 1, isActive: 1 });
MenuItemSchema.index({ kitchenId: 1, isAvailable: 1 });
MenuItemSchema.index({ 'schedules.isActive': 1, 'schedules.type': 1 });

// Virtual field to calculate discounted price
MenuItemSchema.virtual('discountedPrice').get(function() {
  if (this.currentDiscountRate && this.currentDiscountRate > 0) {
    return this.basePrice * (1 - this.currentDiscountRate / 100);
  }
  return this.price;
});

// Method to check if item is available at a specific time
MenuItemSchema.methods.isAvailableAt = function(date: Date): boolean {
  if (!this.isAvailable || !this.isActive) {
    return false;
  }

  // If no schedules, item is always available
  if (!this.schedules || this.schedules.length === 0) {
    return true;
  }

  const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  const currentDay = date.getDay(); // 0 = Sunday, 6 = Saturday

  return this.schedules.some((schedule: IMenuItemSchedule) => {
    if (!schedule.isActive) return false;

    if (schedule.type === 'WEEKLY') {
      // Check if current day is in the schedule
      if (schedule.daysOfWeek && schedule.daysOfWeek.includes(currentDay)) {
        // Check time range if specified
        if (schedule.startTime && schedule.endTime) {
          return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
        }
        return true; // Available all day
      }
    } else if (schedule.type === 'SPECIFIC_DATES') {
      // Check specific dates
      if (schedule.specificDates) {
        return schedule.specificDates.some(dateSchedule => {
          const scheduleDate = new Date(dateSchedule.date);
          const isCorrectDate = scheduleDate.toDateString() === date.toDateString();
          if (isCorrectDate) {
            return currentTime >= dateSchedule.startTime && currentTime <= dateSchedule.endTime;
          }
          return false;
        });
      }
    }

    return false;
  });
};

// Method to get current discount rate
MenuItemSchema.methods.getCurrentDiscountRate = function(date: Date = new Date()): number {
  if (!this.schedules || this.schedules.length === 0) {
    return this.currentDiscountRate || 0;
  }

  const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  const currentDay = date.getDay();

  // Find active schedule with discount
  const activeSchedule = this.schedules.find((schedule: IMenuItemSchedule) => {
    if (!schedule.isActive || !schedule.discountRate || schedule.discountRate <= 0) {
      return false;
    }

    if (schedule.type === 'WEEKLY') {
      if (schedule.daysOfWeek && schedule.daysOfWeek.includes(currentDay)) {
        if (schedule.startTime && schedule.endTime) {
          return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
        }
        return true;
      }
    } else if (schedule.type === 'SPECIFIC_DATES') {
      if (schedule.specificDates) {
        return schedule.specificDates.some(dateSchedule => {
          const scheduleDate = new Date(dateSchedule.date);
          const isCorrectDate = scheduleDate.toDateString() === date.toDateString();
          if (isCorrectDate) {
            return currentTime >= dateSchedule.startTime && currentTime <= dateSchedule.endTime;
          }
          return false;
        });
      }
    }

    return false;
  });

  return activeSchedule ? activeSchedule.discountRate || 0 : (this.currentDiscountRate || 0);
};

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
