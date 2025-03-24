import { Request, Response } from 'express';
import Order, { IOrder } from '../models/Order';
import { WebSocketService } from '../services/WebSocketService';

export class OrderController {
  private wsService?: WebSocketService;

  constructor(wsService?: WebSocketService) {
    this.wsService = wsService;
  }

  // Create a new order
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const orderData = req.body;
      
      // Calculate total amount
      orderData.totalAmount = orderData.items.reduce((total: number, item: any) => {
        const modifiersTotal = item.modifiers.reduce((modTotal: number, mod: any) => modTotal + mod.price, 0);
        return total + (item.quantity * (item.price + modifiersTotal));
      }, 0);

      const order = new Order(orderData);
      const savedOrder = await order.save();
      
      // Notify connected clients about the new order
      if (this.wsService) {
        this.wsService.notifyNewOrder(savedOrder);
      }
      
      res.status(201).json(savedOrder);
    } catch (error) {
      res.status(500).json({ error: 'Error creating order' });
    }
  }

  // Get all orders
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.query;
      const query = restaurantId ? { restaurantId } : {};
      const orders = await Order.find(query);
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching orders' });
    }
  }

  // Get order by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching order' });
    }
  }

  // Update order status
  public async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Notify connected clients about the order update
      if (this.wsService) {
        this.wsService.notifyOrderUpdate(order);
      }

      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: 'Error updating order status' });
    }
  }

  // Update payment status
  public async updatePaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { paymentStatus } = req.body;
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { paymentStatus },
        { new: true }
      );
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Notify connected clients about the order update
      if (this.wsService) {
        this.wsService.notifyOrderUpdate(order);
      }

      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: 'Error updating payment status' });
    }
  }

  // Cancel order
  public async cancel(req: Request, res: Response): Promise<void> {
    try {
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status: 'cancelled' },
        { new: true }
      );
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Notify connected clients about the order cancellation
      if (this.wsService) {
        this.wsService.notifyOrderCancellation(order);
      }

      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: 'Error cancelling order' });
    }
  }

  // Get orders by table
  public async getByTable(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableNumber } = req.params;
      const orders = await Order.find({
        restaurantId,
        tableNumber,
        status: { $nin: ['delivered', 'cancelled'] }
      });
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching orders by table' });
    }
  }
}
