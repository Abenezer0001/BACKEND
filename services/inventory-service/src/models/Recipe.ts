import mongoose, { Schema, Document } from 'mongoose';

// Enhanced Recipe Ingredient interface
export interface IRecipeIngredient extends Document {
  id: string;
  recipeId: mongoose.Schema.Types.ObjectId;
  inventoryItemId: mongoose.Schema.Types.ObjectId;
  quantity: number;
  unit: string;
  preparationMethod?: string;
  isOptional: boolean;
  substitutes: string[];
  costPerUnit: number;
  totalCost: number;
  notes?: string;
}

const RecipeIngredientSchema: Schema = new Schema({
  recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  preparationMethod: { type: String },
  isOptional: { type: Boolean, default: false },
  substitutes: [{ type: String }],
  costPerUnit: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

// Nutritional Information interface
export interface INutritionalInfo {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
}

const NutritionalInfoSchema: Schema = new Schema({
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbohydrates: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  sodium: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 }
}, { _id: false });

// Recipe Yield interface
export interface IRecipeYield {
  expectedYield: number;
  actualYield?: number;
  yieldPercentage?: number;
  portionSize: number;
  portionsPerBatch: number;
  scalingFactor: number;
  minimumBatch: number;
  maximumBatch: number;
  yieldHistory: Array<{
    date: Date;
    actualYield: number;
    yieldPercentage: number;
    notes?: string;
  }>;
}

const RecipeYieldSchema: Schema = new Schema({
  expectedYield: { type: Number, required: true },
  actualYield: { type: Number },
  yieldPercentage: { type: Number },
  portionSize: { type: Number, required: true },
  portionsPerBatch: { type: Number, required: true },
  scalingFactor: { type: Number, default: 1 },
  minimumBatch: { type: Number, default: 1 },
  maximumBatch: { type: Number, default: 10 },
  yieldHistory: [{
    date: { type: Date, default: Date.now },
    actualYield: { type: Number, required: true },
    yieldPercentage: { type: Number, required: true },
    notes: { type: String }
  }]
}, { _id: false });

// Enhanced Recipe interface
export interface IRecipe extends Document {
  id: string;
  name: string;
  description?: string;
  category: string;
  servingSize: number;
  yield: number;
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  instructions: string[];
  allergens: string[];
  dietaryTags: string[];
  isActive: boolean;
  version: number;
  lastModified: Date;
  restaurantId: mongoose.Schema.Types.ObjectId;
  menuItemId?: mongoose.Schema.Types.ObjectId;
  
  // Related data
  recipeIngredients: {
    inventoryItemId: mongoose.Schema.Types.ObjectId;
    quantity: number;
    unit: string;
    preparationMethod?: string;
    isOptional?: boolean;
    substitutes?: string[];
    costPerUnit?: number;
    totalCost?: number;
    notes?: string;
  }[];
  nutritionalInfo?: INutritionalInfo;
  recipeYield: IRecipeYield;
  
  // Cost calculation reference
  currentCostCalculationId?: mongoose.Schema.Types.ObjectId;
  
  // Media
  imageUrl?: string;
  videoUrl?: string;
  
  // Legacy support
  estimatedPrepTimeMinutes?: number;
  yieldQuantity: number;
  yieldUom: string;
  calculatedCost: number;
  calculatedCostPerPortion: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const RecipeSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    category: { type: String, required: true, index: true },
    servingSize: { type: Number, required: true, default: 1 },
    yield: { type: Number, required: true, default: 1 },
    prepTime: { type: Number, default: 0 }, // minutes
    cookTime: { type: Number, default: 0 }, // minutes
    instructions: [{ type: String }],
    allergens: [{ type: String }],
    dietaryTags: [{ type: String }], // e.g., 'vegetarian', 'vegan', 'gluten-free'
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    lastModified: { type: Date, default: Date.now },
    
    // Restaurant association
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, index: true },
    
    // Recipe ingredients (embedded)
    recipeIngredients: [{
      inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true },
      preparationMethod: { type: String },
      isOptional: { type: Boolean, default: false },
      substitutes: [{ type: String }],
      costPerUnit: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      notes: { type: String }
    }],
    
    // Enhanced nutritional and yield data
    nutritionalInfo: NutritionalInfoSchema,
    recipeYield: { type: RecipeYieldSchema, required: true },
    
    // Cost calculation reference
    currentCostCalculationId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecipeCost' },
    
    // Media
    imageUrl: { type: String },
    videoUrl: { type: String },
    
    // Legacy fields for backward compatibility
    estimatedPrepTimeMinutes: { type: Number },
    yieldQuantity: { type: Number, required: true, default: 1 },
    yieldUom: { type: String, required: true, default: 'portion' },
    calculatedCost: { type: Number, default: 0 },
    calculatedCostPerPortion: { type: Number, default: 0 }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
RecipeSchema.index({ restaurantId: 1, category: 1 });
RecipeSchema.index({ restaurantId: 1, isActive: 1 });
RecipeSchema.index({ restaurantId: 1, menuItemId: 1 });
RecipeSchema.index({ name: 'text', description: 'text' });

// Pre-save hook for version management can be added later with proper typing

// Export the RecipeIngredient model separately
export const RecipeIngredient = mongoose.model<IRecipeIngredient>('RecipeIngredient', RecipeIngredientSchema);

const RecipeModel = mongoose.model<IRecipe>('Recipe', RecipeSchema);

export default RecipeModel;
export { RecipeModel as Recipe };
