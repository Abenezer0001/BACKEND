import mongoose, { Schema, Document } from 'mongoose';

import { Types } from 'mongoose'; // Import Types

export interface ICategory extends Document {
  name: string;
  description: string;
  image?: string; // Added optional image field
  restaurantId: Types.ObjectId; // Reference to the Restaurant model
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema({
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
    trim: true,
    required: false // Optional
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  restaurantId: { // Added reference to Restaurant
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ICategory>('Category', CategorySchema);
