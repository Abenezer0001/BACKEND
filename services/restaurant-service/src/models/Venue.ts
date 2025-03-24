import mongoose, { Schema, Document } from 'mongoose';

export interface IVenue extends Document {
  name: string;
  description?: string;
  capacity: number;
  isActive: boolean;
  restaurantId: mongoose.Types.ObjectId;
}

const VenueSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Restaurant'
  }
}, {
  timestamps: true
});

export default mongoose.model<IVenue>('Venue', VenueSchema);
