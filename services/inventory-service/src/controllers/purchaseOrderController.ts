import { Request, Response } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { InventoryItem } from '../models/InventoryItem';
import { StockMovement } from '../models/StockMovement';

/**
 * Get all purchase orders
 */
export const getAllPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { status, supplierId } = req.query;

    let query: any = { restaurantId };
    
    if (status) {
      query.status = status;
    }
    
    if (supplierId) {
      query.supplierId = supplierId;
    }

    const orders = await PurchaseOrder.find(query)
      .populate('supplierId')
      .populate('items.ingredientId')
      .sort({ orderDate: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error getting purchase orders:', error);
    res.status(500).json({ error: 'Failed to get purchase orders' });
  }
};

/**
 * Get purchase order by ID
 */
export const getPurchaseOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const order = await PurchaseOrder.findById(id)
      .populate('supplierId')
      .populate('items.ingredientId');

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error getting purchase order:', error);
    res.status(500).json({ error: 'Failed to get purchase order' });
  }
};

/**
 * Create new purchase order
 */
export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const orderData = { ...req.body, restaurantId };

    // Calculate total amount
    let totalAmount = 0;
    for (const item of orderData.items) {
      totalAmount += item.orderedQuantity * item.unitPrice;
    }
    orderData.totalAmount = totalAmount;

    const order = new PurchaseOrder(orderData);
    await order.save();

    const populatedOrder = await PurchaseOrder.findById(order._id)
      .populate('supplierId')
      .populate('items.ingredientId');

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
};

/**
 * Update purchase order
 */
export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Recalculate total amount if items are updated
    if (req.body.items) {
      let totalAmount = 0;
      for (const item of req.body.items) {
        totalAmount += item.orderedQuantity * item.unitPrice;
      }
      req.body.totalAmount = totalAmount;
    }

    const order = await PurchaseOrder.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate('supplierId').populate('items.ingredientId');

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
};

/**
 * Delete purchase order
 */
export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const order = await PurchaseOrder.findByIdAndDelete(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
};

/**
 * Receive purchase order (mark as received and update inventory)
 */
export const receivePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { receivedItems = [], partialReceive = false } = req.body;

    const order = await PurchaseOrder.findById(id).populate('items.ingredientId');
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (order.status === 'received') {
      return res.status(400).json({ error: 'Purchase order already received' });
    }

    // Update inventory for received items
    for (const receivedItem of receivedItems) {
      const orderItem = order.items.find(item => 
        item.inventoryItemId.toString() === receivedItem.inventoryItemId
      );
      
      if (orderItem) {
        // Update inventory item stock
        const inventoryItem = await InventoryItem.findById(receivedItem.inventoryItemId);
        if (inventoryItem) {
          const previousStock = inventoryItem.currentStock;
          inventoryItem.currentStock += receivedItem.quantityReceived;
          await inventoryItem.save();

          // Create stock movement record
          const movement = new StockMovement({
            ingredientId: receivedItem.inventoryItemId,
            restaurantId: order.restaurantId,
            movementType: 'in',
            quantity: receivedItem.quantityReceived,
            previousStock,
            newStock: inventoryItem.currentStock,
            reason: `Purchase order received: ${order.orderNumber}`,
            cost: orderItem.unitPrice * receivedItem.quantityReceived,
            uom: inventoryItem.unit,
            referenceId: order._id,
            referenceType: 'purchase_order'
          });
          await movement.save();
        }
      }
    }

    // Update order status
    if (partialReceive) {
      order.status = 'partial';
    } else {
      order.status = 'received';
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    const updatedOrder = await PurchaseOrder.findById(id)
      .populate('supplierId')
      .populate('items.ingredientId');

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    res.status(500).json({ error: 'Failed to receive purchase order' });
  }
};

/**
 * Cancel purchase order
 */
export const cancelPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await PurchaseOrder.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (order.status === 'received') {
      return res.status(400).json({ error: 'Cannot cancel a received purchase order' });
    }

    order.status = 'cancelled';
    order.notes = (order.notes || '') + `\nCancelled: ${reason || 'No reason provided'}`;
    await order.save();

    const updatedOrder = await PurchaseOrder.findById(id)
      .populate('supplierId')
      .populate('items.ingredientId');

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    res.status(500).json({ error: 'Failed to cancel purchase order' });
  }
};