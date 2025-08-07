import { Request, Response } from 'express';
import { InventoryItem } from '../models/InventoryItem';
import { StockMovement } from '../models/StockMovement';
import mongoose from 'mongoose';

// Type definitions for better error handling
interface MongooseValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, { message: string; path: string; kind: string; value: any }>;
}

interface MongoDuplicateKeyError extends Error {
  name: 'MongoServerError';
  code: 11000;
  keyPattern: Record<string, number>;
  keyValue: Record<string, any>;
}

// Utility functions for error type checking
const isMongooseValidationError = (error: unknown): error is MongooseValidationError => {
  return (
    error instanceof Error &&
    error.name === 'ValidationError' &&
    typeof (error as any).errors === 'object' &&
    (error as any).errors !== null
  );
};

const isMongoDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError => {
  return (
    error instanceof Error &&
    error.name === 'MongoServerError' &&
    (error as any).code === 11000
  );
};

// Generic error response helper
const handleControllerError = (error: unknown, res: Response, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  if (isMongooseValidationError(error)) {
    const validationErrors = Object.keys(error.errors).map(field => ({
      field,
      message: error.errors[field].message
    }));
    
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      validationErrors
    });
  }
  
  if (isMongoDuplicateKeyError(error)) {
    const duplicateField = Object.keys(error.keyValue)[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `Duplicate ${duplicateField} already exists`,
      duplicateKey: error.keyValue
    });
  }
  
  // Default error response
  return res.status(500).json({ 
    success: false, 
    error: `Failed to ${context.toLowerCase()}` 
  });
};

// Basic CRUD Handlers

export const getAllInventoryItemsHandler = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }

    const { category, isActive, lowStock, search } = req.query;
    const filter: any = { restaurantId };
    
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await InventoryItem.find(filter).sort({ name: 1 });
    
    // Filter for low stock if requested
    let filteredItems = items;
    if (lowStock === 'true') {
      filteredItems = items.filter(item => 
        (item.currentStock || 0) <= (item.minimumStock || 0)
      );
    }

    res.json({
      success: true,
      data: filteredItems
    });
  } catch (error) {
    return handleControllerError(error, res, 'get inventory items');
  }
};

export const createInventoryItemHandler = async (req: Request, res: Response) => {
  try {
    // Validate required fields
    const { name, category, unit, unitOfMeasurement, restaurantId, averageCost, currentStockLevel, averageCostPrice } = req.body;
    
    // Check required fields
    const requiredFields: { [key: string]: any } = {
      name,
      category,
      unit,
      unitOfMeasurement,
      restaurantId
    };
    
    const missingFields = Object.keys(requiredFields).filter(field => !requiredFields[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        requiredFields: ['name', 'category', 'unit', 'unitOfMeasurement', 'restaurantId']
      });
    }
    
    // Ensure numeric fields have defaults
    const processedData = {
      ...req.body,
      averageCost: averageCost || 0,
      currentStockLevel: currentStockLevel || 0,
      averageCostPrice: averageCostPrice || averageCost || 0,
      currentStock: req.body.currentStock || currentStockLevel || 0
    };
    
    const inventoryItem = new InventoryItem(processedData);
    const savedItem = await inventoryItem.save();
    
    res.status(201).json({
      success: true,
      data: savedItem,
      message: 'Inventory item created successfully'
    });
  } catch (error) {
    return handleControllerError(error, res, 'create inventory item');
  }
};

export const getInventoryItemHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid inventory item ID' 
      });
    }

    const item = await InventoryItem.findOne({ _id: id, restaurantId });
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        error: 'Inventory item not found' 
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    return handleControllerError(error, res, 'get inventory item');
  }
};

export const updateInventoryItemHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid inventory item ID' 
      });
    }

    const updatedItem = await InventoryItem.findOneAndUpdate(
      { _id: id, restaurantId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Inventory item not found' 
      });
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Inventory item updated successfully'
    });
  } catch (error) {
    return handleControllerError(error, res, 'update inventory item');
  }
};

export const deleteInventoryItemHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid inventory item ID' 
      });
    }

    // Soft delete by setting isActive to false
    const deletedItem = await InventoryItem.findOneAndUpdate(
      { _id: id, restaurantId },
      { isActive: false },
      { new: true }
    );
    
    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Inventory item not found' 
      });
    }

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    return handleControllerError(error, res, 'delete inventory item');
  }
};

// Stock Management Handlers

export const adjustStockHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    const { adjustmentType, quantity, reason, unitCost, reference, notes } = req.body;
    
    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid inventory item ID' 
      });
    }

    if (!adjustmentType || !['increase', 'decrease'].includes(adjustmentType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid adjustmentType (increase/decrease) is required' 
      });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid quantity is required' 
      });
    }

    const item = await InventoryItem.findOne({ _id: id, restaurantId });
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        error: 'Inventory item not found' 
      });
    }

    // Calculate new stock level
    const currentStock = item.currentStock || 0;
    const adjustmentQuantity = adjustmentType === 'increase' ? quantity : -quantity;
    const newStock = currentStock + adjustmentQuantity;

    if (newStock < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient stock for this adjustment' 
      });
    }

    // Update inventory item
    item.currentStock = newStock;
    if (unitCost) {
      // Update average cost if provided
      const totalValue = (currentStock * (item.averageCost || 0)) + (quantity * unitCost);
      const totalQuantity = currentStock + quantity;
      item.averageCost = totalQuantity > 0 ? totalValue / totalQuantity : unitCost;
    }
    item.lastRestockedAt = adjustmentType === 'increase' ? new Date() : item.lastRestockedAt;
    await item.save();

    // Create stock movement record
    const stockMovement = new StockMovement({
      inventoryItemId: id,
      restaurantId,
      movementType: adjustmentType === 'increase' ? 'stock_in' : 'stock_out',
      quantity: Math.abs(adjustmentQuantity),
      previousStock: currentStock,
      newStock: newStock,
      reason: reason || 'Manual adjustment',
      reference: reference || 'Manual',
      unitCost: unitCost || item.averageCost || 0,
      totalCost: (unitCost || item.averageCost || 0) * quantity,
      notes: notes || ''
    });
    await stockMovement.save();

    res.json({
      success: true,
      data: {
        item,
        movement: stockMovement
      },
      message: 'Stock adjusted successfully'
    });
  } catch (error) {
    return handleControllerError(error, res, 'adjust stock');
  }
};

export const getLowStockItemsHandler = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }

    const items = await InventoryItem.find({
      restaurantId,
      isActive: true,
      $expr: {
        $lte: ['$currentStock', '$minimumStock']
      }
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    return handleControllerError(error, res, 'get low stock items');
  }
};

export const getStockMovementsHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Restaurant ID is required' 
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid inventory item ID' 
      });
    }

    const movements = await StockMovement.find({
      inventoryItemId: id,
      restaurantId
    })
    .sort({ createdAt: -1 })
    .populate('inventoryItemId', 'name unit')
    .limit(50);

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    return handleControllerError(error, res, 'get stock movements');
  }
};

// Placeholder handlers for remaining endpoints
export const getInventoryCategoriesHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const createInventoryCategoryHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const updateInventoryCategoryHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const deleteInventoryCategoryHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getCurrentStockHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const recordStockMovementHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getAllStockMovementsHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getStockAlertsHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const updateReorderPointHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getReorderSuggestionsHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const createAutoReorderHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getInventoryValueHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getInventoryTurnoverHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getUsageAnalyticsHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getInventoryTrendsHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const bulkUpdateInventoryHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const bulkStockAdjustmentHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const performInventoryCountHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const searchInventoryItemsHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getItemsByCategoryHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getItemsBySupplierHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getExpiredItemsHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getExpiringSoonHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getUnitConversionsHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const addUnitConversionHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getCostHistoryHandler = async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};