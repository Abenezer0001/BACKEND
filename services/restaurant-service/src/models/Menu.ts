import mongoose, { Schema, Document, Types } from 'mongoose';
// Removed IMenuCategory interface as we are switching to references

// Interface for the Menu document
export interface IMenu extends Document {
  name: string;
  description?: string;
  restaurantId: Types.ObjectId; // Reference to the Restaurant model
  venueId: Types.ObjectId; // Reference to the Venue model
  categories: Types.ObjectId[]; // References to Category model
  subCategories: Types.ObjectId[]; // References to SubCategory model
}

// Removed MenuCategorySchema

// Schema for the Menu
const MenuSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category', default: [] }], // References to Category documents
  subCategories: [{ type: Schema.Types.ObjectId, ref: 'SubCategory', default: [] }], // References to SubCategory documents
}, { timestamps: true });


export default mongoose.model<IMenu>('Menu', MenuSchema);