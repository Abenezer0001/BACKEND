import mongoose, { Schema, Document } from 'mongoose';
import { ITableType } from './TableType'; // Import TableType

export interface ITable extends Document {
  number: string;
  venueId: mongoose.Types.ObjectId;
  capacity: number;
  qrCode: string;
  isOccupied: boolean;
  isActive: boolean;
  menuId?: mongoose.Types.ObjectId;
  tableTypeId: mongoose.Types.ObjectId | ITableType; // Required reference to TableType
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
  },
  tableTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TableType',
    required: true, // Make it required
  }
}, {
  timestamps: true
});

export default mongoose.model<ITable>('Table', TableSchema);
