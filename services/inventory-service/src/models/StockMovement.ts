import mongoose, { Schema, Document } from 'mongoose';

// Enhanced Stock Movement interface (enhanced from StockTransaction)
export interface IStockMovement extends Document {
  id: string;
  inventoryItemId: mongoose.Schema.Types.ObjectId;
  movementType: 'RECEIVED' | 'USED' | 'WASTED' | 'TRANSFERRED' | 'ADJUSTED' | 'SOLD' | 'RETURNED';
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  reason?: string;
  reference?: string; // orderId, purchaseOrderId, wasteId, etc.
  timestamp: Date;
  userId?: mongoose.Schema.Types.ObjectId;
  notes?: string;
  batchNumber?: string;
  expiryDate?: Date;
  runningTotal: number;
  
  // Restaurant association
  restaurantId: mongoose.Schema.Types.ObjectId;
  
  // Optional references
  recipeId?: mongoose.Schema.Types.ObjectId;
  orderId?: string;
  purchaseOrderId?: mongoose.Schema.Types.ObjectId;
  supplierId?: mongoose.Schema.Types.ObjectId;
  
  // Location tracking
  fromLocationId?: mongoose.Schema.Types.ObjectId;
  toLocationId?: mongoose.Schema.Types.ObjectId;
  
  // Legacy support
  transactionType?: 'Sale Deduction' | 'Manual Adjustment' | 'Initial Stock' | 'Spoilage' | 'Procurement';
  quantityChange: number;
  stockLevelBefore: number;
  stockLevelAfter: number;
  transactionDate: Date;
  createdBy?: mongoose.Schema.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema: Schema = new Schema(
  {
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    movementType: {
      type: String,
      required: true,
      enum: ['RECEIVED', 'USED', 'WASTED', 'TRANSFERRED', 'ADJUSTED', 'SOLD', 'RETURNED'],
      index: true
    },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    unitCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    reason: { type: String },
    reference: { type: String, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    batchNumber: { type: String, index: true },
    expiryDate: { type: Date },
    runningTotal: { type: Number, required: true },
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    
    // Optional references
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', index: true },
    orderId: { type: String, index: true },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    
    // Location tracking
    fromLocationId: { type: mongoose.Schema.Types.ObjectId },
    toLocationId: { type: mongoose.Schema.Types.ObjectId },
    
    // Legacy fields for backward compatibility
    transactionType: {
      type: String,
      enum: ['Sale Deduction', 'Manual Adjustment', 'Initial Stock', 'Spoilage', 'Procurement']
    },
    quantityChange: { type: Number, required: true },
    stockLevelBefore: { type: Number, required: true },
    stockLevelAfter: { type: Number, required: true },
    transactionDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
StockMovementSchema.index({ restaurantId: 1, inventoryItemId: 1, timestamp: -1 });
StockMovementSchema.index({ restaurantId: 1, movementType: 1, timestamp: -1 });
StockMovementSchema.index({ restaurantId: 1, timestamp: -1 });
StockMovementSchema.index({ inventoryItemId: 1, timestamp: -1 });
StockMovementSchema.index({ batchNumber: 1, expiryDate: 1 });
StockMovementSchema.index({ reference: 1 });

// Virtual for movement direction (in/out)
StockMovementSchema.virtual('direction').get(function() {
  const inboundTypes = ['RECEIVED', 'RETURNED', 'ADJUSTED'];
  const outboundTypes = ['USED', 'WASTED', 'TRANSFERRED', 'SOLD'];
  
  if (inboundTypes.includes(this.movementType)) return 'IN';
  if (outboundTypes.includes(this.movementType)) return 'OUT';
  return 'NEUTRAL';
});

// Method to determine if movement affects cost
StockMovementSchema.methods.affectsCost = function() {
  return ['RECEIVED', 'ADJUSTED'].includes(this.movementType);
};

const StockMovementModel = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);

export default StockMovementModel;
export { StockMovementModel as StockMovement };