import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier';
import { SupplierItem } from '../models/SupplierItem';

/**
 * Get all suppliers
 */
export const getAllSuppliers = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { active } = req.query;

    let query: any = { restaurantId };
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });

    res.json(suppliers);
  } catch (error) {
    console.error('Error getting suppliers:', error);
    res.status(500).json({ error: 'Failed to get suppliers' });
  }
};

/**
 * Get supplier by ID
 */
export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Error getting supplier:', error);
    res.status(500).json({ error: 'Failed to get supplier' });
  }
};

/**
 * Create new supplier
 */
export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const supplierData = { ...req.body, restaurantId };

    const supplier = new Supplier(supplierData);
    await supplier.save();

    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

/**
 * Update supplier
 */
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supplier = await Supplier.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
};

/**
 * Delete supplier
 */
export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supplier = await Supplier.findByIdAndDelete(id);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
};

/**
 * Get supplier items
 */
export const getSupplierItems = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supplierItems = await SupplierItem.find({ supplierId: id })
      .populate('ingredientId')
      .sort({ 'ingredientId.name': 1 });

    res.json(supplierItems);
  } catch (error) {
    console.error('Error getting supplier items:', error);
    res.status(500).json({ error: 'Failed to get supplier items' });
  }
};

/**
 * Add item to supplier
 */
export const addSupplierItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const itemData = { ...req.body, supplierId: id };

    const supplierItem = new SupplierItem(itemData);
    await supplierItem.save();

    const populatedItem = await SupplierItem.findById(supplierItem._id)
      .populate('ingredientId');

    res.status(201).json(populatedItem);
  } catch (error) {
    console.error('Error adding supplier item:', error);
    res.status(500).json({ error: 'Failed to add supplier item' });
  }
};

/**
 * Update supplier item
 */
export const updateSupplierItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    
    const supplierItem = await SupplierItem.findByIdAndUpdate(
      itemId,
      req.body,
      { new: true, runValidators: true }
    ).populate('ingredientId');

    if (!supplierItem) {
      return res.status(404).json({ error: 'Supplier item not found' });
    }

    res.json(supplierItem);
  } catch (error) {
    console.error('Error updating supplier item:', error);
    res.status(500).json({ error: 'Failed to update supplier item' });
  }
};

/**
 * Remove supplier item
 */
export const removeSupplierItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    
    const supplierItem = await SupplierItem.findByIdAndDelete(itemId);
    
    if (!supplierItem) {
      return res.status(404).json({ error: 'Supplier item not found' });
    }

    res.json({ message: 'Supplier item removed successfully' });
  } catch (error) {
    console.error('Error removing supplier item:', error);
    res.status(500).json({ error: 'Failed to remove supplier item' });
  }
};

/**
 * Get supplier performance metrics
 */
export const getSupplierPerformance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // This would typically involve analyzing purchase orders, delivery times, quality ratings, etc.
    // For now, we'll return a placeholder response
    const performance = {
      supplierId: id,
      deliveryRate: 95.5,
      qualityScore: 4.2,
      avgDeliveryTime: 2.5, // days
      totalOrders: 0,
      onTimeDeliveries: 0
    };

    res.json(performance);
  } catch (error) {
    console.error('Error getting supplier performance:', error);
    res.status(500).json({ error: 'Failed to get supplier performance' });
  }
};