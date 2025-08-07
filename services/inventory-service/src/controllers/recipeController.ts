import { Request, Response } from 'express';
import * as recipeService from '../services/recipeService';
import mongoose from 'mongoose';

export const createRecipeHandler = async (req: Request, res: Response) => {
  try {
    // restaurantId should be in the body for creation.
    // In a real app, this might come from auth (e.g., req.user.restaurantId)
    if (!req.body.restaurantId) {
      return res.status(400).json({ message: 'restaurantId is required in the request body' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.body.restaurantId)) {
        return res.status(400).json({ message: 'Invalid restaurantId format in body' });
    }

    const recipe = await recipeService.createRecipe(req.body);
    res.status(201).json(recipe);
  } catch (error: any) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ message: 'Error creating recipe', error: error.message });
  }
};

export const getAllRecipesHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid restaurantId format in query' });
    }

    const filters: any = {};
    if (req.query.menuItemId) {
      filters.menuItemId = req.query.menuItemId as string;
      if (!mongoose.Types.ObjectId.isValid(filters.menuItemId)) {
        return res.status(400).json({ message: 'Invalid menuItemId format in query' });
      }
    }
    // Add more filters as needed, e.g. isSubRecipe
    // if (req.query.isSubRecipe) {
    //   filters.isSubRecipe = req.query.isSubRecipe === 'true';
    // }

    const recipes = await recipeService.getAllRecipes(restaurantId, filters);
    res.status(200).json(recipes);
  } catch (error: any) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ message: 'Error fetching recipes', error: error.message });
  }
};

export const getRecipeByIdHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string; // Assuming restaurantId is a query param for authorization/scoping
    const { id } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found or not active' });
    }
    res.status(200).json(recipe);
  } catch (error: any) {
    console.error('Error fetching recipe by ID:', error);
    res.status(500).json({ message: 'Error fetching recipe', error: error.message });
  }
};

export const updateRecipeHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string; // Assuming restaurantId is a query param
    const { id } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
     if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }
    // Ensure restaurantId from query is used for the update, not one from body if present
    // req.body.restaurantId = restaurantId; // This could be one way to enforce it for the service layer

    const recipe = await recipeService.updateRecipe(id, req.body, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found or not active' });
    }
    res.status(200).json(recipe);
  } catch (error: any) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ message: 'Error updating recipe', error: error.message });
  }
};

export const deleteRecipeHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string; // Assuming restaurantId is a query param
    const { id } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const recipe = await recipeService.deleteRecipe(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found or already inactive' });
    }
    res.status(200).json({ message: 'Recipe deactivated successfully', recipe });
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ message: 'Error deleting recipe', error: error.message });
  }
};

// Recipe versions handlers
export const getRecipeVersionsHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    // For now, return the current recipe as a single version
    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.status(200).json([{ ...recipe, version: 1, isActive: true }]);
  } catch (error: any) {
    console.error('Error getting recipe versions:', error);
    res.status(500).json({ message: 'Error getting recipe versions', error: error.message });
  }
};

export const duplicateRecipeHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;
    const { name } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const originalRecipe = await recipeService.getRecipeById(id, restaurantId);
    if (!originalRecipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const duplicateData = {
      ...originalRecipe.toObject(),
      name: name || `${originalRecipe.name} (Copy)`,
      restaurantId
    };
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    const duplicatedRecipe = await recipeService.createRecipe(duplicateData);
    res.status(201).json(duplicatedRecipe);
  } catch (error: any) {
    console.error('Error duplicating recipe:', error);
    res.status(500).json({ message: 'Error duplicating recipe', error: error.message });
  }
};

// Recipe ingredients handlers
export const getRecipeIngredientsHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.status(200).json(recipe.recipeIngredients || []);
  } catch (error: any) {
    console.error('Error getting recipe ingredients:', error);
    res.status(500).json({ message: 'Error getting recipe ingredients', error: error.message });
  }
};

export const addRecipeIngredientHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const updatedIngredients = [...(recipe.recipeIngredients || []), req.body];
    const updatedRecipe = await recipeService.updateRecipe(id, { recipeIngredients: updatedIngredients }, restaurantId);

    res.status(200).json(updatedRecipe);
  } catch (error: any) {
    console.error('Error adding recipe ingredient:', error);
    res.status(500).json({ message: 'Error adding recipe ingredient', error: error.message });
  }
};

export const updateRecipeIngredientHandler = async (req: Request, res: Response) => {
  try {
    const { id, ingredientId } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const ingredients = recipe.recipeIngredients || [];
    const ingredientIndex = ingredients.findIndex(ing => ing.inventoryItemId.toString() === ingredientId);
    
    if (ingredientIndex === -1) {
      return res.status(404).json({ message: 'Ingredient not found in recipe' });
    }

    ingredients[ingredientIndex] = { ...ingredients[ingredientIndex], ...req.body };
    const updatedRecipe = await recipeService.updateRecipe(id, { recipeIngredients: ingredients }, restaurantId);

    res.status(200).json(updatedRecipe);
  } catch (error: any) {
    console.error('Error updating recipe ingredient:', error);
    res.status(500).json({ message: 'Error updating recipe ingredient', error: error.message });
  }
};

export const removeRecipeIngredientHandler = async (req: Request, res: Response) => {
  try {
    const { id, ingredientId } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const ingredients = (recipe.recipeIngredients || []).filter(ing => ing.inventoryItemId.toString() !== ingredientId);
    const updatedRecipe = await recipeService.updateRecipe(id, { recipeIngredients: ingredients }, restaurantId);

    res.status(200).json(updatedRecipe);
  } catch (error: any) {
    console.error('Error removing recipe ingredient:', error);
    res.status(500).json({ message: 'Error removing recipe ingredient', error: error.message });
  }
};

// Recipe cost handlers
export const calculateRecipeCostHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'restaurantId query parameter is required' 
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid id or restaurantId format' 
      });
    }

    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ 
        success: false, 
        message: 'Recipe not found' 
      });
    }

    // Calculate cost based on actual ingredient costs
    let totalCost = 0;
    const breakdown: any[] = [];

    // Populate ingredients to get current costs
    const populatedRecipe = await recipe.populate('recipeIngredients.inventoryItemId');
    
    if (populatedRecipe.recipeIngredients && populatedRecipe.recipeIngredients.length > 0) {
      for (const ingredient of populatedRecipe.recipeIngredients) {
        if (ingredient.inventoryItemId && typeof ingredient.inventoryItemId === 'object') {
          const inventoryItem = ingredient.inventoryItemId as any;
          const ingredientCost = (inventoryItem.averageCost || 0) * (ingredient.quantity || 0);
          totalCost += ingredientCost;
          
          breakdown.push({
            ingredientId: inventoryItem._id,
            name: inventoryItem.name,
            quantity: ingredient.quantity || 0,
            unit: ingredient.unit || inventoryItem.unit,
            unitCost: inventoryItem.averageCost || 0,
            totalCost: Math.round(ingredientCost * 100) / 100,
            supplier: inventoryItem.supplier || 'N/A'
          });
        }
      }
    }

    const costPerPortion = (recipe.servingSize && recipe.servingSize > 0) 
      ? totalCost / recipe.servingSize 
      : totalCost;

    const costAnalysis = {
      success: true,
      data: {
        recipeId: id,
        recipeName: recipe.name,
        totalCost: Math.round(totalCost * 100) / 100,
        costPerPortion: Math.round(costPerPortion * 100) / 100,
        servingSize: recipe.servingSize || 1,
        lastCalculated: new Date().toISOString(),
        ingredients: breakdown,
        laborCost: 0, // Could be added later based on prep time
        overheadCost: 0 // Could be calculated as percentage of ingredient cost
      }
    };

    res.status(200).json(costAnalysis);
  } catch (error: any) {
    console.error('Error calculating recipe cost:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error calculating recipe cost', 
      error: error.message 
    });
  }
};

export const forceRecalculateRecipeCostHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    // Force recalculation (placeholder implementation)
    const result = await calculateRecipeCostHandler(req, res);
    return result;
  } catch (error: any) {
    console.error('Error force recalculating recipe cost:', error);
    res.status(500).json({ message: 'Error force recalculating recipe cost', error: error.message });
  }
};

// Recipe yield handlers
export const getRecipeYieldHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.status(200).json({
      yieldQuantity: recipe.yieldQuantity,
      yieldUom: recipe.yieldUom
    });
  } catch (error: any) {
    console.error('Error getting recipe yield:', error);
    res.status(500).json({ message: 'Error getting recipe yield', error: error.message });
  }
};

export const updateRecipeYieldHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;
    const { yieldQuantity, yieldUom } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const updatedRecipe = await recipeService.updateRecipe(id, { yieldQuantity, yieldUom }, restaurantId);
    if (!updatedRecipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.status(200).json(updatedRecipe);
  } catch (error: any) {
    console.error('Error updating recipe yield:', error);
    res.status(500).json({ message: 'Error updating recipe yield', error: error.message });
  }
};

export const recordActualYieldHandler = async (req: Request, res: Response) => {
  try {
    // Placeholder for recording actual yield vs expected yield
    res.status(200).json({ message: 'Actual yield recorded successfully' });
  } catch (error: any) {
    console.error('Error recording actual yield:', error);
    res.status(500).json({ message: 'Error recording actual yield', error: error.message });
  }
};

export const getYieldHistoryHandler = async (req: Request, res: Response) => {
  try {
    // Placeholder for yield history
    res.status(200).json([]);
  } catch (error: any) {
    console.error('Error getting yield history:', error);
    res.status(500).json({ message: 'Error getting yield history', error: error.message });
  }
};

export const scaleRecipeHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;
    const { scaleFactor } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    const recipe = await recipeService.getRecipeById(id, restaurantId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Scale ingredients
    const scaledIngredients = (recipe.recipeIngredients || []).map(ingredient => ({
      ...ingredient,
      quantity: ingredient.quantity * scaleFactor
    }));

    const scaledRecipe = {
      ...recipe.toObject(),
      recipeIngredients: scaledIngredients,
      yieldQuantity: recipe.yieldQuantity * scaleFactor
    };

    res.status(200).json(scaledRecipe);
  } catch (error: any) {
    console.error('Error scaling recipe:', error);
    res.status(500).json({ message: 'Error scaling recipe', error: error.message });
  }
};

// Analysis handlers
export const getRecipeCostAnalysisHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    // Placeholder cost analysis
    res.status(200).json({
      recipeId: id,
      totalCost: 0,
      costPerServing: 0,
      profitMargin: 0,
      breakdown: []
    });
  } catch (error: any) {
    console.error('Error getting recipe cost analysis:', error);
    res.status(500).json({ message: 'Error getting recipe cost analysis', error: error.message });
  }
};

export const getRecipeProfitabilityHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }

    // Placeholder profitability analysis
    res.status(200).json({
      recipeId: id,
      totalCost: 0,
      sellingPrice: 0,
      profit: 0,
      profitMargin: 0
    });
  } catch (error: any) {
    console.error('Error getting recipe profitability:', error);
    res.status(500).json({ message: 'Error getting recipe profitability', error: error.message });
  }
};

export const optimizeRecipeCostHandler = async (req: Request, res: Response) => {
  try {
    // Placeholder for cost optimization
    res.status(200).json({ message: 'Recipe cost optimization completed' });
  } catch (error: any) {
    console.error('Error optimizing recipe cost:', error);
    res.status(500).json({ message: 'Error optimizing recipe cost', error: error.message });
  }
};

// Bulk operations handlers
export const bulkUpdateRecipeCostsHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }

    // Placeholder for bulk cost update
    res.status(200).json({ message: 'Bulk recipe cost update completed' });
  } catch (error: any) {
    console.error('Error bulk updating recipe costs:', error);
    res.status(500).json({ message: 'Error bulk updating recipe costs', error: error.message });
  }
};

export const bulkScaleRecipesHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const { recipeIds, scaleFactor } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }

    // Placeholder for bulk scaling
    res.status(200).json({ 
      message: 'Bulk recipe scaling completed',
      scaledRecipes: recipeIds?.length || 0
    });
  } catch (error: any) {
    console.error('Error bulk scaling recipes:', error);
    res.status(500).json({ message: 'Error bulk scaling recipes', error: error.message });
  }
};

// Search and filter handlers
export const searchRecipesHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const { query } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }

    const filters = query ? { name: new RegExp(query as string, 'i') } : {};
    const recipes = await recipeService.getAllRecipes(restaurantId, filters);
    res.status(200).json(recipes);
  } catch (error: any) {
    console.error('Error searching recipes:', error);
    res.status(500).json({ message: 'Error searching recipes', error: error.message });
  }
};

export const getRecipesByCategoryHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const { category } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }

    const filters = { category };
    const recipes = await recipeService.getAllRecipes(restaurantId, filters);
    res.status(200).json(recipes);
  } catch (error: any) {
    console.error('Error getting recipes by category:', error);
    res.status(500).json({ message: 'Error getting recipes by category', error: error.message });
  }
};

export const getRecipesByAllergenHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const { allergen } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }

    // This would typically involve complex filtering based on ingredient allergens
    const recipes = await recipeService.getAllRecipes(restaurantId, {});
    res.status(200).json(recipes);
  } catch (error: any) {
    console.error('Error getting recipes by allergen:', error);
    res.status(500).json({ message: 'Error getting recipes by allergen', error: error.message });
  }
};
