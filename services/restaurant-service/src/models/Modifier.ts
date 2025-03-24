import mongoose, { Schema, Document } from 'mongoose';

export interface IModifier extends Document {
  name: string;
  arabicName?: string;
  description?: string;
  arabicDescription?: string;
  price: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ModifierSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  arabicName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  arabicDescription: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IModifier>('Modifier', ModifierSchema); 