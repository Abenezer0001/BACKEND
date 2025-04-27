import mongoose, { Schema, Document, Types } from 'mongoose';
import { ICategory } from './Category'; // Import Category interface
import { ISubCategory } from './SubCategory'; // Import SubCategory interface
import { ISubSubCategory } from './SubSubCategory'; // Import SubSubCategory interface
import { IVenue } from './Venue'; // Import Venue interface
import { IModifier } from './Modifier'; // Import Modifier interface

// Re-define Modifier interfaces here if they are not globally accessible or move them to a common types file
// For now, assuming IModifierGroup is correctly imported or defined elsewhere

export interface IMenuItem extends Document {
  name: string;
  description: string;
  venueId: IVenue['_id']; // Link to the specific Venue
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
  restaurantId: Types.ObjectId; // Add restaurantId for easier querying
  createdAt: Date;
  updatedAt: Date;
}

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
  restaurantId: { // Denormalize restaurantId for easier filtering/access control
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Add index for common query combinations if needed
// MenuItemSchema.index({ restaurantId: 1, venueId: 1, isActive: 1 });

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
