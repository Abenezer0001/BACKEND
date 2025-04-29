import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order, { IOrder, OrderStatus, PaymentStatus } from '../models/Order';
import KafkaProducerService from '../services/KafkaProducerService';
import WebSocketService from '../services/WebSocketService';

export class OrderController {
  private wsService: typeof WebSocketService;

  constructor(wsService: typeof WebSocketService) {
    this.wsService = wsService;
  }

  // Create a new order
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const orderData = req.body;
      
      // Validate required fields
      if (!orderData.restaurantId || !orderData.items || orderData.items.length === 0) {
        res.status(400).json({ error: 'Missing required fields: restaurantId or items' });
        return;
      }
      
      // Calculate subtotal from items if not provided
      if (!orderData.subtotal) {
        let subtotal = 0;
        if (orderData.items && orderData.items.length > 0) {
          subtotal = orderData.items.reduce((total: number, item: any) => {
            // Calculate item subtotal including modifiers
            let itemTotal = item.price * item.quantity;
            
            // Add modifier prices if any
            if (item.modifiers && item.modifiers.length > 0) {
              const modifierTotal = item.modifiers.reduce((modTotal: number, mod: any) => {
                if (mod.selections && mod.selections.length > 0) {
                  return modTotal + mod.selections.reduce((selTotal: number, sel: any) => {
                    return selTotal + (sel.price * sel.quantity);
                  }, 0);
                }
                return modTotal;
              }, 0);
              
              itemTotal += modifierTotal;
            }
            
            return total + itemTotal;
          }, 0);
        }
        
        // Set calculated values
        orderData.subtotal = subtotal;
        orderData.tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% tax rounded to 2 decimals
        orderData.total = subtotal + orderData.tax + (orderData.tip || 0);
      }
      
      // Set default status values if not provided
      orderData.status = orderData.status || OrderStatus.PENDING;
      orderData.paymentStatus = orderData.paymentStatus || PaymentStatus.PENDING;
      
      // Create and save the order
      const order = new Order(orderData);
      const savedOrder = await order.save();
      
      // Populate references if needed
      const populatedOrder = await Order.findById(savedOrder._id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();
      
      if (populatedOrder) {
        // Notify connected clients about the new order via WebSocket
        this.wsService.notifyNewOrder(populatedOrder);

        // Publish order created event to Kafka
        await KafkaProducerService.publishOrderCreated(populatedOrder);
      }
      
      res.status(201).json(populatedOrder);
    } catch (error: any) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: 'Error creating order', details: error.message });
    }
  }

  // Get all orders with optional filtering
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      // Extract query parameters for filtering
      const { 
        restaurantId, 
        status, 
        orderType, 
        paymentStatus,
        startDate,
        endDate,
        tableId,
        tableNumber,
        userId,
        page = '1',
        limit = '50',
        sort = '-createdAt' // Default sort by creation date desc
      } = req.query;
      
      // Build query object
      const query: any = {};
      
      if (restaurantId) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId as string);
      }
      
      if (status) {
        query.status = status;
      }
      
      if (orderType) {
        query.orderType = orderType;
      }
      
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }
      
      if (tableId) {
        query.tableId = new mongoose.Types.ObjectId(tableId as string);
      }
      
      if (tableNumber) {
        query.tableNumber = tableNumber;
      }
      
      if (userId) {
        query.userId = new mongoose.Types.ObjectId(userId as string);
      }
      
      // Add date range filter if provided
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate as string);
        }
      }
      
      // Setup pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;
      
      // Get total count for pagination
      const total = await Order.countDocuments(query);
      
      // Execute query with pagination
      const orders = await Order.find(query)
        .sort(sort as any) // Cast sort to 'any' to bypass TS check for ParsedQs
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName email') // Populate user info
        .populate('tableId', 'number name') // Populate table info
        .exec();
      
      res.status(200).json({
        data: orders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Error fetching orders', details: error.message });
    }
  }

  // Get order by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid order ID format' });
        return;
      }
      
      const order = await Order.findById(id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .populate({
          path: 'items.menuItem',
          select: 'name price image'
        });
      
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      res.status(200).json(order);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Error fetching order', details: error.message });
    }
  }

  // Get orders by restaurant
  public async getByRestaurant(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { status } = req.query;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurant ID' });
        return;
      }

      const query: any = { restaurantId: new mongoose.Types.ObjectId(restaurantId) };

      // Add status filter if provided
      if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();

      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Error getting orders by restaurant:', error);
      res.status(500).json({ error: 'Failed to get orders', details: error.message });
    }
  }

  // Update order status
  public async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        res.status(400).json({ error: 'Invalid order status value' });
        return;
      }
      
      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      // Store previous status for event
      const previousStatus = order.status;
      
      // Update status
      order.status = status as OrderStatus;
      
      // Set estimated prep time if status changed to PREPARING
      if (status === OrderStatus.PREPARING && !order.estimatedPreparationTime) {
        // Default to 15 minutes if not specified
        order.estimatedPreparationTime = 15;
      }
      
      const updatedOrder = await order.save();
      
      // Fetch populated order for response and notifications
      const populatedOrder = await Order.findById(updatedOrder._id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();
      
      if (populatedOrder) {
        // Notify connected clients about the order update via WebSocket
        this.wsService.notifyOrderUpdated(populatedOrder);

        // Publish order status changed event to Kafka
        await KafkaProducerService.publishOrderStatusChanged(populatedOrder, previousStatus);
      }
      
      res.status(200).json(populatedOrder);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Error updating order status', details: error.message });
    }
  }

  // Update payment status
  public async updatePaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;
      
      if (!Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
        res.status(400).json({ error: 'Invalid payment status value' });
        return;
      }
      
      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      // Store previous payment status for event
      const previousPaymentStatus = order.paymentStatus;
      
      // Update payment status
      order.paymentStatus = paymentStatus as PaymentStatus;
      const updatedOrder = await order.save();
      
      // Fetch populated order for response and notifications
      const populatedOrder = await Order.findById(updatedOrder._id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();
      
      if (populatedOrder) {
        // Notify connected clients about the order update via WebSocket
        this.wsService.notifyOrderUpdated(populatedOrder);

        // Publish payment status changed event to Kafka
        await KafkaProducerService.publishPaymentStatusChanged(
          populatedOrder,
          previousPaymentStatus
        );
      }
      
      res.status(200).json(populatedOrder);
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ error: 'Error updating payment status', details: error.message });
    }
  }

  // Cancel order
  public async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body; // Optional cancellation reason
      
      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      // Check if order can be cancelled (not already delivered/completed)
      const nonCancellableStatuses = [
        OrderStatus.DELIVERED, 
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED
      ];
      
      if (nonCancellableStatuses.includes(order.status as OrderStatus)) {
        res.status(400).json({ 
          error: `Cannot cancel order in ${order.status} status`
        });
        return;
      }
      
      // Store previous status for event
      const previousStatus = order.status;
      
      // Update order
      order.status = OrderStatus.CANCELLED;
      if (reason) {
        order.cancellationReason = reason;
      }
      
      const cancelledOrder = await order.save();
      
      // Fetch populated order for response and notifications
      const populatedOrder = await Order.findById(cancelledOrder._id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();
      
      if (populatedOrder) {
        // Notify connected clients about the order cancellation via WebSocket
        this.wsService.notifyOrderCancellation(populatedOrder);

        // Publish order cancelled event to Kafka
        await KafkaProducerService.publishOrderCancelled(populatedOrder);
      }
      
      res.status(200).json(populatedOrder);
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ error: 'Error cancelling order', details: error.message });
    }
  }

  // Get orders by table
  public async getByTable(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableNumber } = req.params;
      
      if (!restaurantId || !tableNumber) {
        res.status(400).json({ error: 'Restaurant ID and table number are required' });
        return;
      }
      
      // Find orders for this table
      const orders = await Order.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        tableNumber,
        status: { $nin: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] } // Only get active orders for a table
      })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email')
      .exec();
      
      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Error fetching orders by table:', error);
      res.status(500).json({ error: 'Error fetching orders by table', details: error.message });
    }
  }
  
  // Get orders by user
  public async getByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).json({ error: 'Invalid user ID format' });
        return;
      }
      
      const orders = await Order.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      })
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'name') // Populate restaurant name
      .populate('tableId', 'number') // Populate table number if exists
      .exec();
      
      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Error fetching user orders:', error);
      res.status(500).json({ error: 'Error fetching user orders', details: error.message });
    }
  }

  // Update order details (items, special instructions, etc.)
  public async updateDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Don't allow updating status or payment status via this endpoint
      delete updates.status;
      delete updates.paymentStatus;
      
      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      // Don't allow updating completed or cancelled orders
      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        res.status(400).json({ error: `Cannot update ${order.status} order` });
        return;
      }
      
      // Calculate new totals if items are being updated
      if (updates.items) {
        let subtotal = 0;
        updates.items.forEach((item: any) => {
          // Calculate item subtotal
          let itemSubtotal = item.price * item.quantity;
          
          // Add modifier prices
          if (item.modifiers && item.modifiers.length > 0) {
            item.modifiers.forEach((mod: any) => {
              if (mod.selections && mod.selections.length > 0) {
                mod.selections.forEach((sel: any) => {
                  itemSubtotal += sel.price * sel.quantity;
                });
              }
            });
          }
          
          // Set item subtotal
          item.subtotal = itemSubtotal;
          
          // Add to order subtotal
          subtotal += itemSubtotal;
        });
        
        // Update order totals
        updates.subtotal = subtotal;
        updates.tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% tax rounded to 2 decimals
        updates.total = subtotal + updates.tax + (updates.tip || order.tip || 0);
      }
      
      // Apply updates
      Object.assign(order, updates);
      
      // Save and populate the updated order
      const updatedOrder = await order.save();
      const populatedOrder = await Order.findById(updatedOrder._id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();
      
      if (populatedOrder) {
        // Notify via WebSocket
        this.wsService.notifyOrderUpdated(populatedOrder);

        // Publish to Kafka
        await KafkaProducerService.publishOrderUpdated(populatedOrder);
      }
      
      res.status(200).json(populatedOrder);
    } catch (error: any) {
      console.error('Error updating order details:', error);
      res.status(500).json({ error: 'Error updating order details', details: error.message });
    }
  }

  // Send alert about an order
  public async sendAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { message } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid order ID' });
        return;
      }

      if (!message) {
        res.status(400).json({ error: 'Alert message is required' });
        return;
      }

      const order = await Order.findById(id);

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Send WebSocket notification with the alert
      this.wsService.notifyOrderAlert(
        order.restaurantId.toString(),
        id,
        message
      );

      res.status(200).json({
        success: true,
        message: 'Alert sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending order alert:', error);
      res.status(500).json({ error: 'Failed to send order alert', details: error.message });
    }
  }
}

export default OrderController;
