import mongoose, { Schema, Document } from 'mongoose';

export interface IZone extends Document {
  name: string;
  description?: string;
  venueId: mongoose.Types.ObjectId;
  capacity: number;
  isActive: boolean;
  tables: mongoose.Types.ObjectId[];
}

const ZoneSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tables: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  }]
}, {
  timestamps: true
});

export default mongoose.model<IZone>('Zone', ZoneSchema);
