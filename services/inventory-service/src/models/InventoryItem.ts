import mongoose, { Schema, Document } from 'mongoose';

// Enhanced Inventory Item interface (replaces basic Ingredient)
export interface IInventoryItem extends Document {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  sku?: string;
  barcode?: string;
  unit: string; // Primary unit of measurement
  conversionFactors: Map<string, number>; // For unit conversions
  
  // Stock levels
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  
  // Costing
  averageCost: number;
  lastCost: number;
  standardCost: number;
  
  // Supplier information
  supplierId?: mongoose.Schema.Types.ObjectId;
  shelfLife?: number; // days
  storageRequirements?: string;
  
  // Status and properties
  isActive: boolean;
  isPerishable: boolean;
  allergens: string[];
  
  // Restaurant association
  restaurantId: mongoose.Schema.Types.ObjectId;
  
  // Legacy support
  supplier?: string;
  unitOfMeasurement: string;
  currentStockLevel: number;
  averageCostPrice: number;
  lowStockThreshold?: number;
  lastRestockedAt?: Date;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, index: true },
    sku: { type: String, unique: true, sparse: true },
    barcode: { type: String, unique: true, sparse: true },
    unit: { type: String, required: true }, // Primary unit
    conversionFactors: {
      type: Map,
      of: Number,
      default: new Map()
    },
    
    // Stock levels
    currentStock: { type: Number, required: true, default: 0 },
    minimumStock: { type: Number, default: 0 },
    maximumStock: { type: Number, default: 1000 },
    reorderPoint: { type: Number, default: 0 },
    
    // Costing
    averageCost: { type: Number, required: true, default: 0 },
    lastCost: { type: Number, default: 0 },
    standardCost: { type: Number, default: 0 },
    
    // Supplier and storage
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    shelfLife: { type: Number }, // days
    storageRequirements: { type: String },
    
    // Properties
    isActive: { type: Boolean, default: true },
    isPerishable: { type: Boolean, default: false },
    allergens: [{ type: String }],
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    
    // Legacy fields for backward compatibility
    supplier: { type: String },
    unitOfMeasurement: { type: String, required: true },
    currentStockLevel: { type: Number, required: true, default: 0 },
    averageCostPrice: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    lastRestockedAt: { type: Date },
    notes: { type: String }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
InventoryItemSchema.index({ restaurantId: 1, category: 1 });
InventoryItemSchema.index({ restaurantId: 1, isActive: 1 });
InventoryItemSchema.index({ restaurantId: 1, currentStock: 1 });
InventoryItemSchema.index({ currentStock: 1, reorderPoint: 1 }); // For low stock alerts
InventoryItemSchema.index({ name: 'text', description: 'text' });
InventoryItemSchema.index({ sku: 1 });
InventoryItemSchema.index({ barcode: 1 });

// Virtual for stock status
InventoryItemSchema.virtual('stockStatus').get(function() {
  if (this.currentStock <= 0) return 'out_of_stock';
  if (this.currentStock <= this.reorderPoint) return 'low_stock';
  if (this.currentStock >= this.maximumStock) return 'overstock';
  return 'in_stock';
});

// Method to check if reorder is needed
InventoryItemSchema.methods.needsReorder = function() {
  return this.currentStock <= this.reorderPoint;
};

// Method to calculate cost per unit in different units
InventoryItemSchema.methods.getCostPerUnit = function(targetUnit?: string) {
  if (!targetUnit || targetUnit === this.unit) {
    return this.averageCost;
  }
  
  const conversionFactor = this.conversionFactors.get(targetUnit);
  if (conversionFactor) {
    return this.averageCost / conversionFactor;
  }
  
  return this.averageCost; // Fallback to base cost
};

const InventoryItemModel = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);

export default InventoryItemModel;
export { InventoryItemModel as InventoryItem };