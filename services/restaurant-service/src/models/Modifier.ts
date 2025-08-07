import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for individual modifier options within a group
export interface IModifierOption {
  _id?: Types.ObjectId;
  name: string;
  price: number; // Price adjustment (can be negative, positive, or zero)
  isAvailable: boolean;
  isDefault: boolean; // For single-select groups, which option is selected by default
  order: number; // Display order
}

// Schema for modifier options
const ModifierOptionSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    default: 0 // Price adjustment
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

// Interface for modifier groups (main modifier entity)
export interface IModifier extends Document {
  name: string; // Group name e.g., "Choose Size", "Add Extras"
  description?: string; // Optional description
  restaurantId: Types.ObjectId; // Link to restaurant (and thus business)
  options: IModifierOption[]; // Array of modifier options
  isRequired: boolean; // Whether this modifier group is mandatory
  selectionType: 'SINGLE' | 'MULTIPLE'; // Single select (radio) or multiple select (checkbox)
  minSelections?: number; // For MULTIPLE type, minimum selections required
  maxSelections?: number; // For MULTIPLE type, maximum selections allowed
  isActive: boolean; // Soft delete / visibility control
  order: number; // Display order of modifier groups on menu items
  createdAt: Date;
  updatedAt: Date;
}

const ModifierSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true // Index for restaurant-scoped queries
  },
  options: [ModifierOptionSchema], // Array of modifier options
  isRequired: {
    type: Boolean,
    default: false
  },
  selectionType: {
    type: String,
    enum: ['SINGLE', 'MULTIPLE'],
    default: 'SINGLE'
  },
  minSelections: {
    type: Number,
    default: 0,
    validate: {
      validator: function(this: IModifier, v: number) {
        // Only validate for MULTIPLE selection type
        if (this.selectionType === 'MULTIPLE') {
          return v >= 0;
        }
        return true;
      },
      message: 'minSelections must be 0 or greater for MULTIPLE selection type'
    }
  },
  maxSelections: {
    type: Number,
    validate: {
      validator: function(this: IModifier, v: number) {
        // Only validate for MULTIPLE selection type
        if (this.selectionType === 'MULTIPLE' && v !== undefined) {
          return v > 0 && v >= (this.minSelections || 0);
        }
        return true;
      },
      message: 'maxSelections must be greater than 0 and >= minSelections for MULTIPLE selection type'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add compound index for restaurant-scoped queries
ModifierSchema.index({ restaurantId: 1, isActive: 1 });
ModifierSchema.index({ restaurantId: 1, order: 1 });

// Validation middleware to ensure only one default option for SINGLE selection type
ModifierSchema.pre('save', function(this: IModifier, next) {
  if (this.selectionType === 'SINGLE') {
    const defaultOptions = this.options.filter(option => option.isDefault);
    if (defaultOptions.length > 1) {
      return next(new Error('Only one option can be set as default for SINGLE selection type'));
    }
  }
  next();
});

export default mongoose.model<IModifier>('Modifier', ModifierSchema); 