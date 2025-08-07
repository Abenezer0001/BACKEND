import Recipe, { IRecipe, IRecipeIngredient } from '../models/Recipe';
import Ingredient from '../models/Ingredient'; // Needed for cost calculation
import mongoose from 'mongoose';

// Helper function for cost calculation (can be expanded)
const calculateRecipeCost = async (ingredients: IRecipeIngredient[]): Promise<{ totalCost: number, costPerPortion: number, yieldQuantity: number, yieldUom: string }> => {
  let totalCost = 0;
  // This is a simplified calculation. In a real scenario, you'd need to handle UoM conversions.
  // For now, we assume ingredient.uom in Recipe matches ingredient.unitOfMeasurement in Ingredient model for cost.
  for (const item of ingredients) {
    const ingredientDoc = await Ingredient.findById(item.inventoryItemId);
    if (ingredientDoc) {
      // Assuming item.quantity is in the base UoM of the ingredient for costing
      totalCost += ingredientDoc.averageCostPrice * item.quantity;
    } else {
      // Handle case where ingredient is not found, maybe throw error or log warning
      console.warn(`Ingredient with ID ${item.inventoryItemId} not found for cost calculation.`);
    }
  }
  // Placeholder for yield quantity and UoM, should ideally come from the recipe itself if already set
  // For a new recipe, these would be part of the input `data`
  const yieldQuantity = 1; // Default, should be overridden by recipe data
  const yieldUom = 'portion'; // Default, should be overridden

  return {
    totalCost,
    costPerPortion: yieldQuantity > 0 ? totalCost / yieldQuantity : 0,
    yieldQuantity, // These should actually come from the recipe input
    yieldUom       // These should actually come from the recipe input
  };
};


export const createRecipe = async (data: Partial<IRecipe>): Promise<IRecipe> => {
  if (!data.restaurantId) {
    throw new Error('restaurantId is required to create a recipe.');
  }
  if (data.recipeIngredients && data.recipeIngredients.length > 0) {
    const costInfo = await calculateRecipeCost(data.recipeIngredients as IRecipeIngredient[]);
    data.calculatedCost = costInfo.totalCost;
    // Ensure yieldQuantity is taken from input data, otherwise default from costInfo might be wrong
    const currentYield = data.yieldQuantity || costInfo.yieldQuantity;
    data.calculatedCostPerPortion = currentYield > 0 ? costInfo.totalCost / currentYield : 0;
  }
  const recipe = new Recipe(data);
  return recipe.save();
};

export const getAllRecipes = async (restaurantId: string, filters: any = {}): Promise<IRecipe[]> => {
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new Error('Invalid restaurantId format');
  }
  const query: any = { restaurantId: new mongoose.Types.ObjectId(restaurantId), isActive: true };

  if (filters.menuItemId && mongoose.Types.ObjectId.isValid(filters.menuItemId)) {
    query.menuItemId = new mongoose.Types.ObjectId(filters.menuItemId);
  }
  // Add other filters like isSubRecipe when needed
  // if (typeof filters.isSubRecipe === 'boolean') {
  //   query.isSubRecipe = filters.isSubRecipe;
  // }

  return Recipe.find(query).populate('recipeIngredients.inventoryItemId', 'name averageCostPrice unitOfMeasurement');
};

export const getRecipeById = async (id: string, restaurantId: string): Promise<IRecipe | null> => {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new Error('Invalid id or restaurantId format');
  }
  return Recipe.findOne({ _id: id, restaurantId: new mongoose.Types.ObjectId(restaurantId), isActive: true })
               .populate('recipeIngredients.inventoryItemId', 'name averageCostPrice unitOfMeasurement');
};

export const updateRecipe = async (id: string, data: Partial<IRecipe>, restaurantId: string): Promise<IRecipe | null> => {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new Error('Invalid id or restaurantId format');
  }

  // Recalculate cost if ingredients are updated
  if (data.recipeIngredients && data.recipeIngredients.length > 0) {
    // Fetch the existing recipe to get its current yield if not being updated
    const existingRecipe = await Recipe.findOne({ _id: id, restaurantId: new mongoose.Types.ObjectId(restaurantId) });
    if (!existingRecipe) return null; // Or throw error

    const costInfo = await calculateRecipeCost(data.recipeIngredients as IRecipeIngredient[]);
    data.calculatedCost = costInfo.totalCost;
    const currentYield = data.yieldQuantity !== undefined ? data.yieldQuantity : existingRecipe.yieldQuantity;
    data.calculatedCostPerPortion = currentYield > 0 ? costInfo.totalCost / currentYield : 0;
  } else if (data.yieldQuantity !== undefined && data.calculatedCost !== undefined) {
    // If only yieldQuantity is changed, and we have a cost, recalculate costPerPortion
     data.calculatedCostPerPortion = data.yieldQuantity > 0 ? data.calculatedCost / data.yieldQuantity : 0;
  }


  return Recipe.findOneAndUpdate(
    { _id: id, restaurantId: new mongoose.Types.ObjectId(restaurantId), isActive: true },
    data,
    { new: true }
  ).populate('recipeIngredients.inventoryItemId', 'name averageCostPrice unitOfMeasurement');
};

export const deleteRecipe = async (id: string, restaurantId: string): Promise<IRecipe | null> => {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new Error('Invalid id or restaurantId format');
  }
  return Recipe.findOneAndUpdate(
    { _id: id, restaurantId: new mongoose.Types.ObjectId(restaurantId) },
    { isActive: false },
    { new: true }
  );
};
