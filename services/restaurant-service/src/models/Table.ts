import mongoose, { Schema, Document } from 'mongoose';
import { ITableType } from './TableType'; // Import TableType
// Interface for table filtering query parameters
export interface ITableFilterParams {
  restaurantId?: string;
  venueId?: string;
  isActive?: boolean;
  isOccupied?: boolean;
  includeMetadata?: boolean;
}

// Interface for QR code data structure
export interface ITableQRData {
  restaurantId: string;
  tableId: string;
  uniqueId: string;
  tableNumber?: string;
  venueId?: string;
}

export interface ITable extends Document {
  number: string;
  venueId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  capacity: number;
  qrCode: string;
  isOccupied: boolean;
  isActive: boolean;
  menuId?: mongoose.Types.ObjectId;
  tableTypeId: mongoose.Types.ObjectId | ITableType;
  // Virtual fields
  fullName?: string; // Computed venue name + table number
}

const TableSchema: Schema = new Schema({
  number: {
    type: String,
    required: [true, 'Table number is required'],
    trim: true,
    validate: {
      validator: function(v: string) {
        // Allow alphanumeric characters, dashes and underscores
        return /^[a-zA-Z0-9\-_]+$/.test(v);
      },
      message: props => `${props.value} is not a valid table number. Use only letters, numbers, dashes and underscores.`
    }
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Venue'
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Restaurant'
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  qrCode: {
    type: String,
    trim: true,
    sparse: true,
    validate: {
      validator: function(v: string) {
        // Skip validation if empty
        if (!v) return true;
        // Basic check that it's a data URL for a QR code
        return v.startsWith('data:image/');
      },
      message: 'QR code must be a valid data URL'
    }
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full table name (venueName + tableNumber)
TableSchema.virtual('fullName').get(function() {
  // This will be populated properly when the document is populated with venue data
  const venueName = this.populated('venueId') ? 
    (this.venueId as any).name || 'Unknown Venue' : 
    'Venue-' + this.venueId;
  return `${venueName} - Table ${this.number}`;
});

// Add indexes for better query performance
// Index for queries by venueId (common filter)
TableSchema.index({ venueId: 1 });

// Index for queries by restaurantId (common filter)
TableSchema.index({ restaurantId: 1 });

// Compound index for uniqueness of table numbers within a venue
TableSchema.index({ venueId: 1, number: 1 }, { unique: true });

// Index for active/inactive filtering
TableSchema.index({ isActive: 1 });

// Index for occupied/available filtering
TableSchema.index({ isOccupied: 1 });

// Combined index for common filtering operations
TableSchema.index({ restaurantId: 1, isActive: 1 });
TableSchema.index({ venueId: 1, isActive: 1 });

// Pre-save hook to enforce consistent data
TableSchema.pre('save', function(next) {
  // Ensure qrCode is never null, but empty string
  if (this.qrCode === null) {
    this.qrCode = '';
  }
  next();
});

export default mongoose.model<ITable>('Table', TableSchema);
