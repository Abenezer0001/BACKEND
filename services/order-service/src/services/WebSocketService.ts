import { Server } from 'socket.io';
import { IOrder } from '../models/Order';
import logger from '../utils/logger';

// WebSocket event types
export enum WebSocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  NEW_ORDER = 'new_order',
  ORDER_UPDATED = 'order_updated',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_ALERT = 'order_alert',
  ERROR = 'error'
}

class WebSocketService {
  private static instance: WebSocketService;
  private io: Server | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Set Socket.IO server instance
   */
  public setServer(io: Server): void {
    this.io = io;
    logger.info('WebSocket server set in WebSocketService');
  }

  /**
   * Notify about a new order
   */
  public notifyNewOrder(order: IOrder): void {
    try {
      if (!this.io) {
        logger.warn('WebSocket server not initialized');
        return;
      }

      const roomId = `restaurant:${order.restaurantId}`;
      logger.debug(`Emitting new order to room: ${roomId}`);
      
      this.io.to(roomId).emit(WebSocketEvents.NEW_ORDER, {
        order: order.toObject ? order.toObject() : order
      });
    } catch (error) {
      logger.error('Error in notifyNewOrder:', error);
    }
  }

  /**
   * Notify about an order update
   */
  public notifyOrderUpdate(order: IOrder): void {
    try {
      if (!this.io) {
        logger.warn('WebSocket server not initialized');
        return;
      }

      const restaurantRoomId = `restaurant:${order.restaurantId}`;
      const orderRoomId = `order:${order._id}`;
      
      logger.debug(`Emitting order update to rooms: ${restaurantRoomId} and ${orderRoomId}`);
      
      const orderData = order.toObject ? order.toObject() : order;
      
      this.io.to(restaurantRoomId).emit(WebSocketEvents.ORDER_UPDATED, { order: orderData });
      this.io.to(orderRoomId).emit(WebSocketEvents.ORDER_UPDATED, { order: orderData });
    } catch (error) {
      logger.error('Error in notifyOrderUpdate:', error);
    }
  }

  /**
   * Notify about an order cancellation
   */
  public notifyOrderCancellation(order: IOrder): void {
    try {
      if (!this.io) {
        logger.warn('WebSocket server not initialized');
        return;
      }

      const restaurantRoomId = `restaurant:${order.restaurantId}`;
      const orderRoomId = `order:${order._id}`;
      
      logger.debug(`Emitting order cancellation to rooms: ${restaurantRoomId} and ${orderRoomId}`);
      
      const orderData = order.toObject ? order.toObject() : order;
      
      this.io.to(restaurantRoomId).emit(WebSocketEvents.ORDER_CANCELLED, { order: orderData });
      this.io.to(orderRoomId).emit(WebSocketEvents.ORDER_CANCELLED, { order: orderData });
    } catch (error) {
      logger.error('Error in notifyOrderCancellation:', error);
    }
  }

  /**
   * Notify about an order alert
   */
  public notifyOrderAlert(orderId: string, restaurantId: string, message: string): void {
    try {
      if (!this.io) {
        logger.warn('WebSocket server not initialized');
        return;
      }

      const restaurantRoomId = `restaurant:${restaurantId}`;
      const orderRoomId = `order:${orderId}`;
      
      logger.debug(`Emitting order alert to rooms: ${restaurantRoomId} and ${orderRoomId}`);
      
      const alertData = {
        orderId,
        restaurantId,
        message,
        timestamp: new Date()
      };
      
      this.io.to(restaurantRoomId).emit(WebSocketEvents.ORDER_ALERT, alertData);
      this.io.to(orderRoomId).emit(WebSocketEvents.ORDER_ALERT, alertData);
    } catch (error) {
      logger.error('Error in notifyOrderAlert:', error);
    }
  }
}

export default WebSocketService;
