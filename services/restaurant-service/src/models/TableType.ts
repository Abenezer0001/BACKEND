import mongoose, { Schema, Document } from 'mongoose';

export interface ITableType extends Document {
  name: string;
  description?: string;
  restaurantId: mongoose.Schema.Types.ObjectId; // Link to the restaurant
}

const TableTypeSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model<ITableType>('TableType', TableTypeSchema);
