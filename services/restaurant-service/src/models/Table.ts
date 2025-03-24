import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  number: string;
  venueId: mongoose.Types.ObjectId;
  capacity: number;
  type: string;
  qrCode: string;
  isOccupied: boolean;
  isActive: boolean;
  menuId?: mongoose.Types.ObjectId;
}

const TableSchema: Schema = new Schema({
  number: {
    type: String,
    required: true
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Venue'
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    required: true,
    enum: ['REGULAR', 'VIP', 'COUNTER', 'LOUNGE']
  },
  qrCode: {
    type: String,
    sparse: true
  },
  isOccupied: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  menuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: false
  }
}, {
  timestamps: true
});

export default mongoose.model<ITable>('Table', TableSchema);
