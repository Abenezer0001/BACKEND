import { Recipe } from '../models/Recipe';
import { InventoryItem } from '../models/InventoryItem';
import { StockMovement } from '../models/StockMovement';
import mongoose from 'mongoose';

export interface DeductStockItem {
  menuItemId: string;
  quantitySold: number;
}

export interface DeductStockResult {
  success: boolean;
  message: string;
  details: {
    processed: any[];
    errors: any[];
  };
}

/**
 * Create a new ingredient (inventory item)
 */
export const createIngredient = async (ingredientData: any) => {
  try {
    const ingredient = new InventoryItem(ingredientData);
    return await ingredient.save();
  } catch (error) {
    console.error('Error creating ingredient:', error);
    throw error;
  }
};

/**
 * Get all ingredients for a restaurant
 */
export const getAllIngredients = async (restaurantId: string) => {
  try {
    return await InventoryItem.find({ 
      restaurantId, 
      isActive: true 
    }).sort({ name: 1 });
  } catch (error) {
    console.error('Error getting all ingredients:', error);
    throw error;
  }
};

/**
 * Get ingredient by ID
 */
export const getIngredientById = async (id: string, restaurantId: string) => {
  try {
    return await InventoryItem.findOne({ 
      _id: id, 
      restaurantId, 
      isActive: true 
    });
  } catch (error) {
    console.error('Error getting ingredient by ID:', error);
    throw error;
  }
};

/**
 * Update an ingredient
 */
export const updateIngredient = async (id: string, updateData: any, restaurantId: string) => {
  try {
    return await InventoryItem.findOneAndUpdate(
      { _id: id, restaurantId, isActive: true },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    console.error('Error updating ingredient:', error);
    throw error;
  }
};

/**
 * Delete an ingredient (soft delete - mark as inactive)
 */
export const deleteIngredient = async (id: string, restaurantId: string) => {
  try {
    return await InventoryItem.findOneAndUpdate(
      { _id: id, restaurantId, isActive: true },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    throw error;
  }
};

/**
 * Deduct stock for sold menu items based on their recipes
 */
export const deductStockForSale = async (
  items: DeductStockItem[], 
  restaurantId: string, 
  userId?: string
): Promise<DeductStockResult> => {
  const processed: any[] = [];
  const errors: any[] = [];

  try {
    console.log(`Starting stock deduction for ${items.length} items from restaurant ${restaurantId}`);

    for (const item of items) {
      try {
        // Find active recipe for the menu item
        const recipe = await Recipe.findOne({ 
          restaurantId,
          menuItemId: item.menuItemId,
          isActive: true 
        }).populate('ingredients.inventoryItemId');

        if (!recipe) {
          errors.push({
            menuItemId: item.menuItemId,
            error: 'No active recipe found for menu item',
            quantitySold: item.quantitySold
          });
          continue;
        }

        if (!recipe.recipeIngredients || recipe.recipeIngredients.length === 0) {
          errors.push({
            menuItemId: item.menuItemId,
            error: 'Recipe has no ingredients defined',
            quantitySold: item.quantitySold,
            recipeName: recipe.name
          });
          continue;
        }

        const ingredientDeductions: any[] = [];
        let recipeProcessed = true;

        // Process each ingredient in the recipe
        for (const ingredient of recipe.recipeIngredients) {
          if (!ingredient.inventoryItemId) {
            errors.push({
              menuItemId: item.menuItemId,
              ingredientName: 'Unknown',
              error: 'Ingredient inventory item not found',
              quantitySold: item.quantitySold
            });
            recipeProcessed = false;
            continue;
          }

          const inventoryItem = ingredient.inventoryItemId as any;
          const quantityNeeded = (ingredient.quantity || 0) * item.quantitySold;

          // Check if enough stock is available
          if ((inventoryItem.currentStock || 0) < quantityNeeded) {
            errors.push({
              menuItemId: item.menuItemId,
              ingredientName: inventoryItem.name,
              error: `Insufficient stock. Available: ${inventoryItem.currentStock || 0}, Required: ${quantityNeeded}`,
              quantitySold: item.quantitySold
            });
            recipeProcessed = false;
            continue;
          }

          // Calculate new stock level
          const previousStock = inventoryItem.currentStock || 0;
          const newStock = previousStock - quantityNeeded;

          // Update inventory item stock
          await InventoryItem.findByIdAndUpdate(
            inventoryItem._id,
            { 
              currentStock: newStock,
              updatedAt: new Date()
            },
            { new: true }
          );

          // Create stock movement record
          const stockMovement = new StockMovement({
            inventoryItemId: inventoryItem._id,
            restaurantId,
            movementType: 'sale_deduction',
            quantity: quantityNeeded,
            previousStock,
            newStock,
            reason: 'Sale deduction',
            reference: `Menu Item: ${item.menuItemId}`,
            unitCost: inventoryItem.averageCost || 0,
            totalCost: (inventoryItem.averageCost || 0) * quantityNeeded,
            notes: `Deducted for ${item.quantitySold} sold items of recipe: ${recipe.name}`,
            userId: userId || null
          });
          await stockMovement.save();

          ingredientDeductions.push({
            ingredientId: inventoryItem._id,
            ingredientName: inventoryItem.name,
            quantityDeducted: quantityNeeded,
            previousStock,
            newStock,
            unit: inventoryItem.unit
          });
        }

        if (recipeProcessed) {
          processed.push({
            menuItemId: item.menuItemId,
            recipeName: recipe.name,
            quantitySold: item.quantitySold,
            ingredientDeductions
          });
          console.log(`Successfully processed stock deduction for menu item ${item.menuItemId}, recipe: ${recipe.name}`);
        }

      } catch (error: any) {
        console.error(`Error processing menu item ${item.menuItemId}:`, error);
        errors.push({
          menuItemId: item.menuItemId,
          error: `Processing error: ${error.message}`,
          quantitySold: item.quantitySold
        });
      }
    }

    const hasErrors = errors.length > 0;
    const hasProcessed = processed.length > 0;

    let message = '';
    if (hasProcessed && !hasErrors) {
      message = `Stock deduction completed successfully for ${processed.length} menu items`;
    } else if (hasProcessed && hasErrors) {
      message = `Partial success: ${processed.length} items processed, ${errors.length} errors occurred`;
    } else {
      message = `Stock deduction failed for all ${items.length} items`;
    }

    return {
      success: hasProcessed,
      message,
      details: {
        processed,
        errors
      }
    };

  } catch (error: any) {
    console.error('Critical error in deductStockForSale:', error);
    return {
      success: false,
      message: `Critical error during stock deduction: ${error.message}`,
      details: {
        processed,
        errors: [...errors, { error: error.message, type: 'critical' }]
      }
    };
  }
};

/**
 * Get all recipes for a restaurant
 */
export const getAllRecipes = async (restaurantId: string) => {
  try {
    return await Recipe.find({ restaurantId, isActive: true })
      .populate('ingredients.inventoryItemId')
      .sort({ name: 1 });
  } catch (error) {
    console.error('Error getting all recipes:', error);
    throw error;
  }
};

/**
 * Get recipe by ID
 */
export const getRecipeById = async (recipeId: string, restaurantId: string) => {
  try {
    return await Recipe.findOne({ 
      _id: recipeId, 
      restaurantId, 
      isActive: true 
    }).populate('ingredients.inventoryItemId');
  } catch (error) {
    console.error('Error getting recipe by ID:', error);
    throw error;
  }
};

/**
 * Check inventory availability for menu items
 */
export const checkInventoryAvailability = async (
  items: DeductStockItem[], 
  restaurantId: string
): Promise<{ available: boolean; details: any[] }> => {
  const details: any[] = [];
  let allAvailable = true;

  try {
    for (const item of items) {
      const recipe = await Recipe.findOne({ 
        restaurantId,
        menuItemId: item.menuItemId,
        isActive: true 
      }).populate('ingredients.inventoryItemId');

      if (!recipe) {
        details.push({
          menuItemId: item.menuItemId,
          available: false,
          reason: 'No active recipe found'
        });
        allAvailable = false;
        continue;
      }

      let itemAvailable = true;
      const ingredientAvailability: any[] = [];

      for (const ingredient of recipe.recipeIngredients || []) {
        if (!ingredient.inventoryItemId) continue;

        const inventoryItem = ingredient.inventoryItemId as any;
        const quantityNeeded = (ingredient.quantity || 0) * item.quantitySold;
        const available = (inventoryItem.currentStock || 0) >= quantityNeeded;

        if (!available) {
          itemAvailable = false;
          allAvailable = false;
        }

        ingredientAvailability.push({
          ingredientName: inventoryItem.name,
          quantityNeeded,
          currentStock: inventoryItem.currentStock || 0,
          available
        });
      }

      details.push({
        menuItemId: item.menuItemId,
        recipeName: recipe.name,
        available: itemAvailable,
        ingredients: ingredientAvailability
      });
    }

    return {
      available: allAvailable,
      details
    };

  } catch (error: any) {
    console.error('Error checking inventory availability:', error);
    return {
      available: false,
      details: [{ error: `Check failed: ${error.message}` }]
    };
  }
};