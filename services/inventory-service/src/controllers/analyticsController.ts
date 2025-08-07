import { Request, Response } from 'express';
import { StockMovement } from '../models/StockMovement';
import { Recipe } from '../models/Recipe';
import { WasteTracking } from '../models/WasteTracking';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { InventoryItem } from '../models/InventoryItem';

/**
 * Get inventory analytics overview
 */
export const getInventoryAnalytics = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    
    // Get total stock movements
    const totalMovements = await StockMovement.countDocuments({ restaurantId });
    
    // Get total recipes
    const totalRecipes = await Recipe.countDocuments({ restaurantId });
    
    // Get total waste entries
    const totalWaste = await WasteTracking.countDocuments({ restaurantId });
    
    // Get total purchase orders
    const totalPurchaseOrders = await PurchaseOrder.countDocuments({ restaurantId });
    
    // Get recent stock movements
    const recentMovements = await StockMovement.find({ restaurantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('ingredientId');

    // Calculate waste value in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentWaste = await WasteTracking.find({
      restaurantId,
      date: { $gte: thirtyDaysAgo }
    });

    const wasteValue = recentWaste.reduce((sum: number, waste: any) => sum + (waste.cost || 0), 0);

    res.json({
      overview: {
        totalMovements,
        totalRecipes,
        totalWaste,
        totalPurchaseOrders,
        wasteValue
      },
      recentMovements
    });
  } catch (error) {
    console.error('Error getting inventory analytics:', error);
    res.status(500).json({ error: 'Failed to get inventory analytics' });
  }
};

/**
 * Get cost analysis
 */
export const getCostAnalysis = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter: any = { restaurantId };
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Get purchase order costs
    const purchaseOrders = await PurchaseOrder.find(dateFilter);
    const totalPurchaseCost = purchaseOrders.reduce((sum: number, po: any) => sum + po.totalAmount, 0);

    // Get waste costs
    const wasteEntries = await WasteTracking.find({
      restaurantId,
      ...(startDate && endDate ? {
        date: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      } : {})
    });
    const totalWasteCost = wasteEntries.reduce((sum: number, waste: any) => sum + (waste.cost || 0), 0);

    res.json({
      totalPurchaseCost,
      totalWasteCost,
      netCost: totalPurchaseCost - totalWasteCost,
      wastePercentage: totalPurchaseCost > 0 ? (totalWasteCost / totalPurchaseCost) * 100 : 0
    });
  } catch (error) {
    console.error('Error getting cost analysis:', error);
    res.status(500).json({ error: 'Failed to get cost analysis' });
  }
};

/**
 * Get stock movement trends
 */
export const getStockMovementTrends = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { days = 30 } = req.query;

    const daysAgo = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const movements = await StockMovement.aggregate([
      {
        $match: {
          restaurantId,
          createdAt: { $gte: daysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            movementType: "$movementType"
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    res.json(movements);
  } catch (error) {
    console.error('Error getting stock movement trends:', error);
    res.status(500).json({ error: 'Failed to get stock movement trends' });
  }
};

/**
 * Get inventory valuation
 */
export const getInventoryValue = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }

    // Get all inventory items with their current stock and costs
    const inventoryItems = await InventoryItem.find({ 
      restaurantId,
      isActive: true 
    });

    let totalValue = 0;
    const categoryBreakdown: { [key: string]: { value: number; percentage: number } } = {};

    inventoryItems.forEach(item => {
      const itemValue = (item.currentStock || 0) * (item.averageCost || 0);
      totalValue += itemValue;

      const category = item.category || 'Other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { value: 0, percentage: 0 };
      }
      categoryBreakdown[category].value += itemValue;
    });

    // Calculate percentages
    const categoryArray = Object.entries(categoryBreakdown).map(([category, data]) => ({
      category,
      value: Math.round(data.value * 100) / 100,
      percentage: totalValue > 0 ? Math.round((data.value / totalValue) * 10000) / 100 : 0
    }));

    res.json({
      success: true,
      data: {
        totalValue: Math.round(totalValue * 100) / 100,
        categoryBreakdown: categoryArray,
        lastCalculated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting inventory value:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get inventory value' 
    });
  }
};

/**
 * Get cost trends over time
 */
export const getCostTrends = async (req: Request, res: Response) => {
  try {
    const { restaurantId, period = '30d' } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }

    // Calculate date range based on period
    let days = 30;
    switch (period) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      case '1y': days = 365; break;
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get purchase orders for the period
    const purchaseOrders = await PurchaseOrder.aggregate([
      {
        $match: {
          restaurantId,
          orderDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } }
          },
          totalCost: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        trends: purchaseOrders.map(item => ({
          date: item._id.date,
          totalCost: item.totalCost,
          orderCount: item.orderCount
        }))
      }
    });
  } catch (error) {
    console.error('Error getting cost trends:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get cost trends' 
    });
  }
};

/**
 * Get profitability analysis
 */
export const getProfitabilityAnalysis = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }

    // Get recipes with cost analysis
    const recipes = await Recipe.find({ restaurantId }).populate('ingredients.inventoryItemId');

    const recipeAnalysis = await Promise.all(recipes.map(async (recipe: any) => {
      let totalCost = 0;
      
      for (const ingredient of recipe.ingredients) {
        if (ingredient.inventoryItemId) {
          const cost = (ingredient.inventoryItemId.averageCost || 0) * (ingredient.quantity || 0);
          totalCost += cost;
        }
      }

      const costPerPortion = recipe.servingSize > 0 ? totalCost / recipe.servingSize : 0;

      return {
        recipeId: recipe._id,
        recipeName: recipe.name,
        totalCost: Math.round(totalCost * 100) / 100,
        costPerPortion: Math.round(costPerPortion * 100) / 100,
        servingSize: recipe.servingSize || 1,
        category: recipe.category || 'Other'
      };
    }));

    // Calculate category profitability
    const categoryTotals: { [key: string]: { totalCost: number; recipeCount: number } } = {};
    
    recipeAnalysis.forEach(recipe => {
      const category = recipe.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = { totalCost: 0, recipeCount: 0 };
      }
      categoryTotals[category].totalCost += recipe.totalCost;
      categoryTotals[category].recipeCount += 1;
    });

    const categoryAnalysis = Object.entries(categoryTotals).map(([category, data]) => ({
      category,
      averageCost: data.recipeCount > 0 ? Math.round((data.totalCost / data.recipeCount) * 100) / 100 : 0,
      totalCost: Math.round(data.totalCost * 100) / 100,
      recipeCount: data.recipeCount
    }));

    res.json({
      success: true,
      data: {
        recipeAnalysis: recipeAnalysis.sort((a, b) => b.costPerPortion - a.costPerPortion),
        categoryAnalysis: categoryAnalysis.sort((a, b) => b.averageCost - a.averageCost),
        summary: {
          totalRecipes: recipeAnalysis.length,
          averageCostPerRecipe: recipeAnalysis.length > 0 
            ? Math.round((recipeAnalysis.reduce((sum, r) => sum + r.totalCost, 0) / recipeAnalysis.length) * 100) / 100 
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting profitability analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get profitability analysis' 
    });
  }
};