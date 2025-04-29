import { Server, Socket } from 'socket.io';
import http from 'http';
import logger from '../utils/logger';
import { IOrder } from '../models/Order';

export enum WebSocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'joinRoom',
  LEAVE_ROOM = 'leaveRoom',
  ORDER_CREATED = 'orderCreated',
  ORDER_UPDATED = 'orderUpdated',
  ORDER_CANCELLED = 'orderCancelled',
  ORDER_COMPLETED = 'orderCompleted',
  ORDER_ALERT = 'orderAlert'
}

class WebSocketService {
  private io: Server | null = null;
  
  constructor() {
    logger.info('WebSocketService initialized');
  }
  
  public initialize(server: http.Server | Server): void {
    if (server instanceof http.Server) {
      this.io = new Server(server, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      });
    } else {
      // If passed an io instance directly
      this.io = server;
    }
    
    this.setupSocketHandlers();
    logger.info('WebSocket server initialized successfully');
  }
  
  private setupSocketHandlers(): void {
    if (!this.io) {
      logger.warn('Cannot setup socket handlers: Socket.io not initialized');
      return;
    }
    
    this.io.on(WebSocketEvents.CONNECT, (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Handle room joining
      socket.on(WebSocketEvents.JOIN_ROOM, (room: string) => {
        try {
          socket.join(room);
          logger.info(`Client ${socket.id} joined room: ${room}`);
        } catch (error) {
          logger.error(`Error when client ${socket.id} tried to join room ${room}:`, error);
        }
      });
      
      // Handle room leaving
      socket.on(WebSocketEvents.LEAVE_ROOM, (room: string) => {
        try {
          socket.leave(room);
          logger.info(`Client ${socket.id} left room: ${room}`);
        } catch (error) {
          logger.error(`Error when client ${socket.id} tried to leave room ${room}:`, error);
        }
      });
      
      // Handle disconnection
      socket.on(WebSocketEvents.DISCONNECT, () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }
  
  public notifyNewOrder(order: IOrder): void {
    this.notifyOrderCreated(order);
  }
  
  public notifyOrderCreated(order: IOrder): void {
    if (!this.io) {
      logger.warn('Cannot notify order created: Socket.io not initialized');
      return;
    }
    
    try {
      const room = `restaurant:${order.restaurantId}`;
      this.io.to(room).emit(WebSocketEvents.ORDER_CREATED, order);
      logger.info(`Notified room ${room} about new order ${order._id}`);
    } catch (error) {
      logger.error(`Error notifying about order creation for order ${order._id}:`, error);
    }
  }
  
  public notifyOrderUpdated(order: IOrder): void {
    if (!this.io) {
      logger.warn('Cannot notify order updated: Socket.io not initialized');
      return;
    }
    
    try {
      const restaurantRoom = `restaurant:${order.restaurantId}`;
      const orderRoom = `order:${order._id}`;
      
      this.io.to(restaurantRoom).emit(WebSocketEvents.ORDER_UPDATED, order);
      this.io.to(orderRoom).emit(WebSocketEvents.ORDER_UPDATED, order);
      
      logger.info(`Notified rooms ${restaurantRoom} and ${orderRoom} about order update for ${order._id}`);
    } catch (error) {
      logger.error(`Error notifying about order update for order ${order._id}:`, error);
    }
  }
  
  public notifyOrderCancellation(order: IOrder): void {
    this.notifyOrderCancelled(order);
  }
  
  public notifyOrderCancelled(order: IOrder): void {
    if (!this.io) {
      logger.warn('Cannot notify order cancelled: Socket.io not initialized');
      return;
    }
    
    try {
      const restaurantRoom = `restaurant:${order.restaurantId}`;
      const orderRoom = `order:${order._id}`;
      
      this.io.to(restaurantRoom).emit(WebSocketEvents.ORDER_CANCELLED, order);
      this.io.to(orderRoom).emit(WebSocketEvents.ORDER_CANCELLED, order);
      
      logger.info(`Notified rooms ${restaurantRoom} and ${orderRoom} about order cancellation for ${order._id}`);
    } catch (error) {
      logger.error(`Error notifying about order cancellation for order ${order._id}:`, error);
    }
  }
  
  public notifyOrderCompleted(order: IOrder): void {
    if (!this.io) {
      logger.warn('Cannot notify order completed: Socket.io not initialized');
      return;
    }
    
    try {
      const restaurantRoom = `restaurant:${order.restaurantId}`;
      const orderRoom = `order:${order._id}`;
      
      this.io.to(restaurantRoom).emit(WebSocketEvents.ORDER_COMPLETED, order);
      this.io.to(orderRoom).emit(WebSocketEvents.ORDER_COMPLETED, order);
      
      logger.info(`Notified rooms ${restaurantRoom} and ${orderRoom} about order completion for ${order._id}`);
    } catch (error) {
      logger.error(`Error notifying about order completion for order ${order._id}:`, error);
    }
  }
  
  public notifyOrderAlert(restaurantId: string, orderId: string, message: string): void {
    if (!this.io) {
      logger.warn('Cannot send order alert: Socket.io not initialized');
      return;
    }
    
    try {
      const restaurantRoom = `restaurant:${restaurantId}`;
      const orderRoom = `order:${orderId}`;
      const payload = { orderId, message, timestamp: new Date().toISOString() };
      
      this.io.to(restaurantRoom).emit(WebSocketEvents.ORDER_ALERT, payload);
      this.io.to(orderRoom).emit(WebSocketEvents.ORDER_ALERT, payload);
      
      logger.info(`Sent alert for order ${orderId} to rooms ${restaurantRoom} and ${orderRoom}: ${message}`);
    } catch (error) {
      logger.error(`Error sending alert for order ${orderId}:`, error);
    }
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;
