import mongoose, { Schema, Document } from 'mongoose';

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

export interface IMenuItem extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  category: string;
  price: number;
  modifierGroups: IModifierGroup[];
  image?: string;
  preparationTime: number;
  isAvailable: boolean;
  allergens: string[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fats: number;
  };
}

export interface IMenuCategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  categories: string[];
  items: IMenuItem[];
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

const MenuItemSchema: Schema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  modifierGroups: [ModifierGroupSchema],
  image: String,
  preparationTime: {
    type: Number,
    required: true,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  allergens: [String],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fats: Number
  }
});

const MenuCategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  categories: [String],
  items: [MenuItemSchema],
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

const MenuSchema: Schema = new Schema({
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

export default mongoose.model<IMenu>('Menu', MenuSchema);
