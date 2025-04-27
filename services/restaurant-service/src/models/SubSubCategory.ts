import mongoose, { Schema, Document } from 'mongoose';
import { ISubCategory } from './SubCategory'; // Reference the SubCategory model

export interface ISubSubCategory extends Document {
  name: string;
  description: string;
  image: string; // Added image field
  isActive: boolean;
  order: number;
  subCategory: ISubCategory['_id']; // Reference to the parent SubCategory
  createdAt: Date;
  updatedAt: Date;
}

const SubSubCategorySchema: Schema = new Schema({
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
  subCategory: { // Reference to the parent SubCategory
    type: Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ISubSubCategory>('SubSubCategory', SubSubCategorySchema);
