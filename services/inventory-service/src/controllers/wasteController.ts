import { Request, Response } from 'express';
import { WasteTracking } from '../models/WasteTracking';
import { InventoryItem } from '../models/InventoryItem';
import { StockMovement } from '../models/StockMovement';

/**
 * Get all waste tracking entries
 */
export const getAllWasteEntries = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate, ingredientId, reason } = req.query;

    let query: any = { restaurantId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    if (ingredientId) {
      query.ingredientId = ingredientId;
    }

    if (reason) {
      query.reason = new RegExp(reason as string, 'i');
    }

    const wasteEntries = await WasteTracking.find(query)
      .populate('ingredientId')
      .populate('recordedBy', 'name email')
      .sort({ date: -1 });

    res.json(wasteEntries);
  } catch (error) {
    console.error('Error getting waste entries:', error);
    res.status(500).json({ error: 'Failed to get waste entries' });
  }
};

/**
 * Get waste entry by ID
 */
export const getWasteEntryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const wasteEntry = await WasteTracking.findById(id)
      .populate('ingredientId')
      .populate('recordedBy', 'name email');

    if (!wasteEntry) {
      return res.status(404).json({ error: 'Waste entry not found' });
    }

    res.json(wasteEntry);
  } catch (error) {
    console.error('Error getting waste entry:', error);
    res.status(500).json({ error: 'Failed to get waste entry' });
  }
};

/**
 * Create new waste entry
 */
export const createWasteEntry = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const wasteData = { ...req.body, restaurantId };

    // Get ingredient information to calculate estimated cost
    const ingredient = await InventoryItem.findById(wasteData.ingredientId);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Calculate cost if not provided
    if (!wasteData.cost && ingredient.averageCost) {
      wasteData.cost = wasteData.quantity * ingredient.averageCost;
    }

    const wasteEntry = new WasteTracking(wasteData);
    await wasteEntry.save();

    // Update inventory stock if this waste should be deducted from inventory
    if (wasteData.deductFromInventory !== false) {
      const previousStock = ingredient.currentStock;
      ingredient.currentStock = Math.max(0, ingredient.currentStock - wasteData.quantity);
      await ingredient.save();

      // Create stock movement record
      const movement = new StockMovement({
        ingredientId: wasteData.ingredientId,
        restaurantId,
        movementType: 'out',
        quantity: wasteData.quantity,
        previousStock,
        newStock: ingredient.currentStock,
        reason: `Waste: ${wasteData.reason}`,
        cost: wasteData.cost,
        uom: ingredient.unit,
        referenceId: wasteEntry._id,
        referenceType: 'waste'
      });
      await movement.save();
    }

    const populatedEntry = await WasteTracking.findById(wasteEntry._id)
      .populate('ingredientId')
      .populate('recordedBy', 'name email');

    res.status(201).json(populatedEntry);
  } catch (error) {
    console.error('Error creating waste entry:', error);
    res.status(500).json({ error: 'Failed to create waste entry' });
  }
};

/**
 * Update waste entry
 */
export const updateWasteEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const wasteEntry = await WasteTracking.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate('ingredientId').populate('recordedBy', 'name email');

    if (!wasteEntry) {
      return res.status(404).json({ error: 'Waste entry not found' });
    }

    res.json(wasteEntry);
  } catch (error) {
    console.error('Error updating waste entry:', error);
    res.status(500).json({ error: 'Failed to update waste entry' });
  }
};

/**
 * Delete waste entry
 */
export const deleteWasteEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const wasteEntry = await WasteTracking.findByIdAndDelete(id);
    
    if (!wasteEntry) {
      return res.status(404).json({ error: 'Waste entry not found' });
    }

    res.json({ message: 'Waste entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting waste entry:', error);
    res.status(500).json({ error: 'Failed to delete waste entry' });
  }
};

/**
 * Get waste analytics
 */
export const getWasteAnalytics = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    let dateQuery: any = { restaurantId };
    if (startDate && endDate) {
      dateQuery.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Get total waste cost and quantity
    const wasteStats = await WasteTracking.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' },
          totalQuantity: { $sum: '$quantity' },
          totalEntries: { $sum: 1 }
        }
      }
    ]);

    // Get waste by ingredient
    const wasteByIngredient = await WasteTracking.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$inventoryItemId',
          totalCost: { $sum: '$cost' },
          totalQuantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'inventoryitems',
          localField: '_id',
          foreignField: '_id',
          as: 'ingredient'
        }
      },
      { $unwind: '$ingredient' },
      { $sort: { totalCost: -1 } },
      { $limit: 10 }
    ]);

    // Get waste by reason
    const wasteByReason = await WasteTracking.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$reason',
          totalCost: { $sum: '$cost' },
          totalQuantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    // Get waste trends (daily)
    const wasteTrends = await WasteTracking.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateWasted" } },
          totalCost: { $sum: '$cost' },
          totalQuantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      summary: wasteStats[0] || { totalCost: 0, totalQuantity: 0, totalEntries: 0 },
      byIngredient: wasteByIngredient,
      byReason: wasteByReason,
      trends: wasteTrends
    });
  } catch (error) {
    console.error('Error getting waste analytics:', error);
    res.status(500).json({ error: 'Failed to get waste analytics' });
  }
};

/**
 * Get waste summary by date range
 */
export const getWasteSummary = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { period = 'week' } = req.query;

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const summary = await WasteTracking.aggregate([
      {
        $match: {
          restaurantId,
          dateWasted: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' },
          totalQuantity: { $sum: '$quantity' },
          totalEntries: { $sum: 1 },
          avgCostPerEntry: { $avg: '$cost' }
        }
      }
    ]);

    res.json(summary[0] || { totalCost: 0, totalQuantity: 0, totalEntries: 0, avgCostPerEntry: 0 });
  } catch (error) {
    console.error('Error getting waste summary:', error);
    res.status(500).json({ error: 'Failed to get waste summary' });
  }
};