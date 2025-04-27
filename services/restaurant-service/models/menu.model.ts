import mongoose, { Schema, Document, Types } from 'mongoose';
// ISubSubCategory is no longer needed here as MenuItem model handles it
// import { ISubSubCategory } from '../src/models/SubSubCategory';
import { IMenuItem } from '../src/models/MenuItem'; // Import the standalone MenuItem interface

export interface IModifierOption extends Document {
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface IModifierGroup extends Document {
  name: string;
  required: boolean;
  multiSelect: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: IModifierOption[];
}

// Removed local IMenuItem interface definition. It's now imported.

export interface IMenuCategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  categories: string[]; // Keep if needed for menu structure sub-categories
  items: Types.ObjectId[]; // Array of references to MenuItem documents
  isAvailable: boolean;
  availabilitySchedule?: {
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
  };
}

export interface IMenu extends Document {
  name: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId;
  categories: IMenuCategory[];
  isActive: boolean;
}

const ModifierOptionSchema: Schema = new Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
});

const ModifierGroupSchema: Schema = new Schema({
  name: {
    type: String,
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  multiSelect: {
    type: Boolean,
    default: false
  },
  minSelect: {
    type: Number,
    min: 0,
    default: 0
  },
  maxSelect: {
    type: Number,
    min: 0,
    validate: {
      validator: function(this: any, value: number): boolean {
        return !this.minSelect || value >= this.minSelect;
      },
      message: 'maxSelect must be greater than or equal to minSelect'
    }
  },
  options: [ModifierOptionSchema]
});

// Removed embedded MenuItemSchema definition

const MenuCategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  categories: [String], // Keep if needed for menu structure sub-categories
  items: [{ // Array of references
    type: Schema.Types.ObjectId,
    ref: 'MenuItem'
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  availabilitySchedule: {
    startTime: String,
    endTime: String,
    daysOfWeek: [Number]
  }
});

// Removed duplicate MenuSchema definition above this line

const MenuSchema: Schema = new Schema({ // Re-added MenuSchema definition
  name: {
    type: String,
    required: true
  },
  description: String,
  restaurantId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Restaurant'
  },
  categories: [MenuCategorySchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IMenu>('Menu', MenuSchema); // Keep the final export using the correct MenuSchema
