import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
// Import Order model and interface from the correct path
import OrderModel, { IOrder } from '../../services/order-service/src/models/Order';

export enum WebSocketEvents {
  CONNECT = 'connection',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'joinRoom',
  LEAVE_ROOM = 'leaveRoom',
  NEW_ORDER = 'newOrder',
  ORDER_UPDATED = 'orderUpdated',
  ORDER_CANCELLED = 'orderCancelled',
  ORDER_ALERT = 'orderAlert',
  ERROR = 'error'
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private io: SocketIOServer;
  private pingInterval: NodeJS.Timeout;

  private constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.setupSocketHandlers();
    this.pingInterval = this.startPingInterval();
  }

  private setupSocketHandlers(): void {
    this.io.on(WebSocketEvents.CONNECT, (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle room joining (for specific restaurants/tables)
      socket.on(WebSocketEvents.JOIN_ROOM, (room: string) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      });

      // Handle room leaving
      socket.on(WebSocketEvents.LEAVE_ROOM, (room: string) => {
        socket.leave(room);
        console.log(`Socket ${socket.id} left room: ${room}`);
      });

      // Handle disconnection
      socket.on(WebSocketEvents.DISCONNECT, () => {
        console.log(`Client disconnected: ${socket.id}`);
      });

      // Handle errors
      socket.on(WebSocketEvents.ERROR, (error: any) => {
        console.error(`Socket ${socket.id} error:`, error);
      });
    });
  }

  private startPingInterval(): NodeJS.Timeout {
    return setInterval(() => {
      // With Socket.IO, ping/pong is handled automatically
      console.log(`Active connections: ${this.io.engine.clientsCount}`);
    }, 30000);
  }

  public static initialize(server: HTTPServer): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(server);
    }
    return WebSocketManager.instance;
  }

  public static getInstance(server?: HTTPServer): WebSocketManager {
    if (!WebSocketManager.instance && server) {
      WebSocketManager.instance = new WebSocketManager(server);
    } else if (!WebSocketManager.instance) {
      throw new Error('WebSocketManager not initialized. Call initialize() first or provide a server instance.');
    }
    return WebSocketManager.instance;
  }

  public getSocketIOServer(): SocketIOServer {
    return this.io;
  }

  public notifyNewOrder(order: IOrder): void {
    try {
      // Create room keys
      const restaurantRoom = `restaurant:${order.restaurantId}`;
      
      // Convert order to plain object before sending
      const orderObj = order.toObject ? order.toObject() : order;

      // Emit to restaurant-specific room
      this.io.to(restaurantRoom).emit(WebSocketEvents.NEW_ORDER, orderObj);
      
      console.log(`Emitted new order event to room ${restaurantRoom}`);
    } catch (error) {
      console.error('Error notifying about new order:', error);
    }
  }

  public notifyOrderUpdate(order: IOrder): void {
    try {
      // Create room keys
      const restaurantRoom = `restaurant:${order.restaurantId}`;
      const orderRoom = `order:${order._id}`;
      
      // Convert order to plain object before sending
      const orderObj = order.toObject ? order.toObject() : order;

      // Emit to restaurant and order-specific rooms
      this.io.to([restaurantRoom, orderRoom]).emit(WebSocketEvents.ORDER_UPDATED, orderObj);
      
      console.log(`Emitted order update event to rooms ${restaurantRoom} and ${orderRoom}`);
    } catch (error) {
      console.error('Error notifying about order update:', error);
    }
  }

  public notifyOrderCancellation(order: IOrder): void {
    try {
      // Create room keys
      const restaurantRoom = `restaurant:${order.restaurantId}`;
      const orderRoom = `order:${order._id}`;
      
      // Convert order to plain object before sending
      const orderObj = order.toObject ? order.toObject() : order;

      // Emit to restaurant and order-specific rooms
      this.io.to([restaurantRoom, orderRoom]).emit(WebSocketEvents.ORDER_CANCELLED, orderObj);
      
      console.log(`Emitted order cancellation event to rooms ${restaurantRoom} and ${orderRoom}`);
    } catch (error) {
      console.error('Error notifying about order cancellation:', error);
    }
  }

  public sendOrderAlert(alertData: any): void {
    this.io.emit(WebSocketEvents.ORDER_ALERT, alertData);
  }

  public cleanup(): void {
    clearInterval(this.pingInterval);
    this.io.disconnectSockets(true);
    this.io.close();
  }
}

export const getWebSocketManager = (): WebSocketManager => {
  return WebSocketManager.getInstance();
}