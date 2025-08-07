import mongoose, { Schema, Document } from 'mongoose';

// Recipe Cost interface as specified in PRD
export interface IRecipeCost extends Document {
  id: string;
  recipeId: mongoose.Schema.Types.ObjectId;
  calculatedDate: Date;
  ingredientCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costPerServing: number;
  profitMargin: number;
  targetCost: number;
  variance: number; // difference between target and actual cost
  costBreakdown: Array<{
    ingredientId: mongoose.Schema.Types.ObjectId;
    ingredientName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    percentage: number; // % of total ingredient cost
  }>;
  
  // Restaurant association
  restaurantId: mongoose.Schema.Types.ObjectId;
  
  // Metadata
  calculatedBy?: mongoose.Schema.Types.ObjectId;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// Cost Breakdown Item schema
const CostBreakdownSchema: Schema = new Schema({
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  ingredientName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  unitCost: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  percentage: { type: Number, required: true }
}, { _id: false });

const RecipeCostSchema: Schema = new Schema(
  {
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true, index: true },
    calculatedDate: { type: Date, default: Date.now, index: true },
    ingredientCost: { type: Number, required: true, default: 0 },
    laborCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    totalCost: { type: Number, required: true, default: 0 },
    costPerServing: { type: Number, required: true, default: 0 },
    profitMargin: { type: Number, default: 0 },
    targetCost: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    costBreakdown: [CostBreakdownSchema],
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    
    // Metadata
    calculatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
RecipeCostSchema.index({ restaurantId: 1, recipeId: 1, calculatedDate: -1 });
RecipeCostSchema.index({ restaurantId: 1, isActive: 1 });
RecipeCostSchema.index({ recipeId: 1, isActive: 1 });

// Virtual for cost efficiency (lower is better)
RecipeCostSchema.virtual('costEfficiency').get(function() {
  if (this.targetCost === 0) return 0;
  return (this.totalCost / this.targetCost) * 100;
});

// Method to calculate variance
RecipeCostSchema.methods.calculateVariance = function() {
  this.variance = this.totalCost - this.targetCost;
  return this.variance;
};

// Method to get most expensive ingredients
RecipeCostSchema.methods.getTopCostIngredients = function(limit = 5) {
  return this.costBreakdown
    .sort((a: any, b: any) => b.totalCost - a.totalCost)
    .slice(0, limit);
};

export default mongoose.model<IRecipeCost>('RecipeCost', RecipeCostSchema);