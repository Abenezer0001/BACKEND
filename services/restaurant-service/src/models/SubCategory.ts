import mongoose, { Schema, Document } from 'mongoose';
import { ICategory } from './Category'; // Assuming Category model exists

export interface ISubCategory extends Document {
  name: string;
  description: string;
  image: string; // Added image field
  isActive: boolean;
  order: number;
  category: ICategory['_id']; // Reference to the parent Category
  createdAt: Date;
  updatedAt: Date;
}

const SubCategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: { // Added image field
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  category: { // Reference to the parent Category
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ISubCategory>('SubCategory', SubCategorySchema);
