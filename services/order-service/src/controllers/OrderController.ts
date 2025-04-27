import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Order, { IOrder, OrderStatus, PaymentStatus } from '../models/Order';
import KafkaProducerService from '../services/KafkaProducerService';
import WebSocketService from '../services/WebSocketService';

class OrderController {
  private static instance: OrderController;
  private constructor() {}

  public static getInstance(): OrderController {
    if (!OrderController.instance) {
      OrderController.instance = new OrderController();
    }
    return OrderController.instance;
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderData: IOrder = req.body;
      const newOrder = new Order(orderData);
      const savedOrder = await newOrder.save();

      // Publish to Kafka
      KafkaProducerService.publishOrderCreated(savedOrder);

      // Send WebSocket notification
      WebSocketService.getInstance().notifyNewOrder(savedOrder);

      res.status(201).json({
        success: true,
        data: savedOrder,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getOrdersByRestaurant(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { status } = req.query;

      if (!Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID',
        });
        return;
      }

      const query: any = { restaurantId: new Types.ObjectId(restaurantId) };

      // Add status filter if provided
      if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
        query.status = status;
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error('Error getting orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get orders',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error getting order by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getOrdersByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!Types.ObjectId.isValid(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID',
        });
        return;
      }

      const orders = await Order.find({ userId: new Types.ObjectId(userId) }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error('Error getting user orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user orders',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status value',
        });
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      // Update status and save
      const previousStatus = order.status;
      order.status = status as OrderStatus;
      
      // Set estimated prep time if status changed to PREPARING
      if (status === OrderStatus.PREPARING && !order.estimatedPreparationTime) {
        // Default to 15 minutes if not specified
        order.estimatedPreparationTime = 15;
      }
      
      const updatedOrder = await order.save();

      // Publish to Kafka
      KafkaProducerService.publishOrderStatusChanged(updatedOrder, previousStatus);

      // Send WebSocket notification
      WebSocketService.getInstance().notifyOrderUpdate(updatedOrder);

      res.status(200).json({
        success: true,
        data: updatedOrder,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updatePaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { paymentStatus } = req.body;

      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      if (!paymentStatus || !Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
        res.status(400).json({
          success: false,
          message: 'Invalid payment status value',
        });
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      // Update payment status and save
      const previousPaymentStatus = order.paymentStatus;
      order.paymentStatus = paymentStatus as PaymentStatus;
      const updatedOrder = await order.save();

      // Publish to Kafka
      KafkaProducerService.publishPaymentStatusChanged(updatedOrder, previousPaymentStatus);

      // Send WebSocket notification
      WebSocketService.getInstance().notifyOrderUpdate(updatedOrder);

      res.status(200).json({
        success: true,
        data: updatedOrder,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment status',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updateOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const updateData = req.body;

      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      // Don't allow updating certain fields directly through this endpoint
      delete updateData._id;
      delete updateData.orderNumber;
      delete updateData.userId;
      delete updateData.restaurantId;
      delete updateData.createdAt;

      // Update order and get the updated document
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      // Publish to Kafka
      KafkaProducerService.publishOrderUpdated(updatedOrder!);

      // Send WebSocket notification
      WebSocketService.getInstance().notifyOrderUpdate(updatedOrder!);

      res.status(200).json({
        success: true,
        data: updatedOrder,
      });
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { cancellationReason } = req.body;

      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      // Only allow cancellation if order is not completed or cancelled already
      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.CANCELLED
      ) {
        res.status(400).json({
          success: false,
          message: `Cannot cancel an order that is already ${order.status}`,
        });
        return;
      }

      // Update status to cancelled
      order.status = OrderStatus.CANCELLED;
      
      // Add cancellation reason if provided
      if (cancellationReason) {
        order.cancellationReason = cancellationReason;
      }
      
      const updatedOrder = await order.save();

      // Publish to Kafka
      KafkaProducerService.publishOrderCancelled(updatedOrder);

      // Send WebSocket notification
      WebSocketService.getInstance().notifyOrderCancellation(updatedOrder);

      res.status(200).json({
        success: true,
        data: updatedOrder,
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel order',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendOrderAlert(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { message } = req.body;

      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      if (!message) {
        res.status(400).json({
          success: false,
          message: 'Alert message is required',
        });
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      // Send WebSocket notification with the alert
      WebSocketService.getInstance().notifyOrderAlert(
        order.restaurantId.toString(),
        orderId,
        message
      );

      res.status(200).json({
        success: true,
        message: 'Alert sent successfully',
      });
    } catch (error) {
      console.error('Error sending order alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send order alert',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default OrderController;
