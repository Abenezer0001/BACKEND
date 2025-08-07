import mongoose, { Schema, Document } from 'mongoose';

// Menu Item Cost interface as specified in PRD
export interface IMenuItemCost extends Document {
  id: string;
  menuItemId: mongoose.Schema.Types.ObjectId;
  recipeId: mongoose.Schema.Types.ObjectId;
  recipeCost: number;
  additionalCosts: Array<{
    type: string; // e.g., 'packaging', 'labor', 'overhead'
    description: string;
    amount: number;
  }>;
  totalCost: number;
  sellingPrice: number;
  grossProfit: number;
  profitMargin: number; // percentage
  targetMargin: number; // target profit margin percentage
  lastUpdated: Date;
  costHistory: Array<{
    date: Date;
    totalCost: number;
    sellingPrice: number;
    profitMargin: number;
    notes?: string;
  }>;
  
  // Restaurant association
  restaurantId: mongoose.Schema.Types.ObjectId;
  
  // Metadata
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// Additional Cost schema
const AdditionalCostSchema: Schema = new Schema({
  type: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

// Cost History schema
const CostHistorySchema: Schema = new Schema({
  date: { type: Date, required: true },
  totalCost: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  profitMargin: { type: Number, required: true },
  notes: { type: String }
}, { _id: false });

const MenuItemCostSchema: Schema = new Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true, index: true },
    recipeCost: { type: Number, required: true, default: 0 },
    additionalCosts: [AdditionalCostSchema],
    totalCost: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    grossProfit: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },
    targetMargin: { type: Number, default: 30 }, // 30% default target margin
    lastUpdated: { type: Date, default: Date.now },
    costHistory: [CostHistorySchema],
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    
    // Metadata
    isActive: { type: Boolean, default: true }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
MenuItemCostSchema.index({ restaurantId: 1, menuItemId: 1 });
MenuItemCostSchema.index({ restaurantId: 1, recipeId: 1 });
MenuItemCostSchema.index({ restaurantId: 1, isActive: 1 });
MenuItemCostSchema.index({ profitMargin: 1 });

// Virtual for margin status
MenuItemCostSchema.virtual('marginStatus').get(function() {
  if (this.profitMargin >= this.targetMargin) return 'healthy';
  if (this.profitMargin >= this.targetMargin * 0.8) return 'warning';
  return 'critical';
});

// Method to calculate costs and margins
MenuItemCostSchema.methods.recalculate = function() {
  // Calculate additional costs total
  const additionalTotal = this.additionalCosts.reduce((sum: number, cost: any) => sum + cost.amount, 0);
  
  // Calculate total cost
  this.totalCost = this.recipeCost + additionalTotal;
  
  // Calculate profit metrics
  this.grossProfit = this.sellingPrice - this.totalCost;
  this.profitMargin = this.sellingPrice > 0 ? (this.grossProfit / this.sellingPrice) * 100 : 0;
  this.lastUpdated = new Date();
  
  return this;
};

// Method to add cost history entry
MenuItemCostSchema.methods.addHistoryEntry = function(notes?: string) {
  this.costHistory.push({
    date: new Date(),
    totalCost: this.totalCost,
    sellingPrice: this.sellingPrice,
    profitMargin: this.profitMargin,
    notes: notes
  });
  
  // Keep only last 50 entries
  if (this.costHistory.length > 50) {
    this.costHistory = this.costHistory.slice(-50);
  }
  
  return this;
};

export default mongoose.model<IMenuItemCost>('MenuItemCost', MenuItemCostSchema);