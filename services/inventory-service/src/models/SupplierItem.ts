import mongoose, { Schema, Document } from 'mongoose';

// Supplier Item interface as specified in PRD
export interface ISupplierItem extends Document {
  id: string;
  supplierId: mongoose.Schema.Types.ObjectId;
  inventoryItemId: mongoose.Schema.Types.ObjectId;
  supplierSku: string; // Supplier's SKU for this item
  supplierName: string; // How supplier names this item
  unitSize: string; // e.g., "5 lb bag", "case of 12"
  currentPrice: number;
  priceHistory: Array<{
    price: number;
    effectiveDate: Date;
    notes?: string;
  }>;
  pricePerUnit: number; // Calculated from currentPrice and unitSize
  minimumOrderQuantity: number;
  leadTime: number; // days
  isPreferred: boolean; // Is this the preferred supplier for this item?
  lastOrderDate?: Date;
  qualityRating: number; // 1-5 rating for quality
  
  // Restaurant association
  restaurantId: mongoose.Schema.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

// Price History schema
const PriceHistorySchema: Schema = new Schema({
  price: { type: Number, required: true },
  effectiveDate: { type: Date, required: true },
  notes: { type: String }
}, { _id: false });

const SupplierItemSchema: Schema = new Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    supplierSku: { type: String, required: true },
    supplierName: { type: String, required: true },
    unitSize: { type: String, required: true },
    currentPrice: { type: Number, required: true },
    priceHistory: [PriceHistorySchema],
    pricePerUnit: { type: Number, required: true },
    minimumOrderQuantity: { type: Number, default: 1 },
    leadTime: { type: Number, default: 1 }, // days
    isPreferred: { type: Boolean, default: false },
    lastOrderDate: { type: Date },
    qualityRating: { type: Number, min: 1, max: 5, default: 3 },
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
SupplierItemSchema.index({ restaurantId: 1, supplierId: 1 });
SupplierItemSchema.index({ restaurantId: 1, inventoryItemId: 1 });
SupplierItemSchema.index({ restaurantId: 1, isPreferred: 1 });
SupplierItemSchema.index({ supplierId: 1, inventoryItemId: 1 }, { unique: true });
SupplierItemSchema.index({ supplierSku: 1 });

// Virtual for price trend
SupplierItemSchema.virtual('priceTrend').get(function() {
  if (this.priceHistory.length < 2) return 'stable';
  
  const recent = this.priceHistory[this.priceHistory.length - 1];
  const previous = this.priceHistory[this.priceHistory.length - 2];
  
  if (recent.price > previous.price) return 'increasing';
  if (recent.price < previous.price) return 'decreasing';
  return 'stable';
});

// Method to add price history entry
SupplierItemSchema.methods.updatePrice = function(newPrice: number, notes?: string) {
  // Add to price history
  this.priceHistory.push({
    price: this.currentPrice,
    effectiveDate: new Date(),
    notes: notes || 'Price update'
  });
  
  // Update current price
  this.currentPrice = newPrice;
  
  // Recalculate price per unit (this would need business logic based on unitSize)
  this.pricePerUnit = newPrice; // Simplified - real implementation would parse unitSize
  
  return this.save();
};

const SupplierItemModel = mongoose.model<ISupplierItem>('SupplierItem', SupplierItemSchema);

export default SupplierItemModel;
export { SupplierItemModel as SupplierItem };