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
  ORDER_ALERT = 'orderAlert',
  ITEM_STATUS_CHANGE = 'itemStatusChange'
}

class WebSocketService {
  private io: Server | null = null;
  private initialized = false;
  private static instance: WebSocketService;
  
  constructor() {
    logger.info('WebSocketService initialized');
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }
  
  /**
   * Set an existing Socket.IO server instance
   * @param server An existing Socket.IO server instance
   */
  public setServer(server: Server): void {
    if (this.initialized) {
      logger.warn('WebSocket server already initialized. Skipping reassignment.');
      return;
    }
    
    logger.info('Using existing Socket.IO server instance');
    this.io = server;
    this.initialized = true;
    this.setupSocketHandlers();
  }
  
  public initialize(server: http.Server | Server): void {
    // Check if already initialized
    if (this.io || this.initialized) {
      logger.warn('WebSocket server already initialized. Skipping re-initialization.');
      return;
    }

    try {
      if (server instanceof http.Server) {
        logger.info('Initializing new WebSocket server...');
        this.io = new Server(server, {
          cors: {
            origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://cms.inseat.achievengine.com', 'https://menu.inseat.achievengine.com'],
            methods: ['GET', 'POST', 'OPTIONS'],
            credentials: true,
            allowedHeaders: [
              'Origin',
              'X-Requested-With', 
              'Content-Type',
              'Accept',
              'Authorization',
              'Cache-Control',
              'cache-control',
              'X-CSRF-Token',
              'X-Auth-Token'
            ]
          },
          transports: ['websocket', 'polling'],
          allowEIO3: true, // For compatibility with older clients
          path: '/socket.io' // Ensure path is explicitly set to default
        });
        logger.info('WebSocket server initialized with CORS config');
      } else {
        // If passed an io instance directly
        this.io = server;
        logger.info('Using existing io instance');
      }
      
      // Only set up handlers if io is properly initialized
      if (this.io) {
        this.setupSocketHandlers();
        logger.info('WebSocket server initialized successfully');
      }
    } catch (error) {
      logger.error('Error initializing WebSocket server:', error);
    }
  }
  
  private setupSocketHandlers(): void {
    if (!this.io) {
      logger.warn('Cannot setup socket handlers: Socket.io not initialized');
      return;
    }
    
    this.io.on(WebSocketEvents.CONNECT, (socket: Socket) => {
      logger.info(`[WebSocket] ✅ Client connected: ${socket.id}`);
      
      // Log connection details
      logger.info(`[WebSocket] Client handshake: ${JSON.stringify({
        query: socket.handshake.query,
        headers: socket.handshake.headers,
        address: socket.handshake.address
      })}`);
      
      // Handle room joining
      socket.on(WebSocketEvents.JOIN_ROOM, (room: string) => {
        try {
          socket.join(room);
          logger.info(`[WebSocket] Client ${socket.id} joined room: ${room}`);
          
          // Send welcome message to confirm room joining
          socket.emit('welcome', { message: `Successfully joined room: ${room}` });
          
          // Log rooms this socket is in
          const rooms = Array.from(socket.rooms.values()).filter(r => r !== socket.id);
          logger.info(`[WebSocket] Client ${socket.id} is now in rooms: ${rooms.join(', ') || 'none'}`); 
        } catch (error) {
          logger.error(`[WebSocket] Error when client ${socket.id} tried to join room ${room}:`, error);
        }
      });
      
      // Handle room leaving
      socket.on(WebSocketEvents.LEAVE_ROOM, (room: string) => {
        try {
          socket.leave(room);
          logger.info(`[WebSocket] Client ${socket.id} left room: ${room}`);
        } catch (error) {
          logger.error(`[WebSocket] Error when client ${socket.id} tried to leave room ${room}:`, error);
        }
      });
      
      // Add a ping handler for testing connectivity
      socket.on('ping', (callback) => {
        logger.info(`[WebSocket] Received ping from client ${socket.id}`);
        if (typeof callback === 'function') {
          callback({ time: new Date().toISOString(), status: 'ok' });
        } else {
          socket.emit('pong', { time: new Date().toISOString() });
        }
      });
      
      // Handle disconnection
      socket.on(WebSocketEvents.DISCONNECT, (reason) => {
        logger.info(`[WebSocket] ❌ Client disconnected: ${socket.id}, reason: ${reason}`);
      });
    });
    
    // Log initial state
    logger.info('[WebSocket] Socket handlers set up successfully');
    
    // Periodically check and log connected clients
    setInterval(() => this.logConnectedClients(), 30000);
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
      logger.info(`[WebSocket] Broadcasting new order to room: ${room}`);
      logger.info(`[WebSocket] Order data: ${JSON.stringify(order)}`);
      
      // Emit to specific restaurant room
      this.io.to(room).emit(WebSocketEvents.ORDER_CREATED, order);
      
      // Also broadcast to get more visibility for debugging
      logger.info(`[WebSocket] Also broadcasting to all connected clients`);
      this.io.emit(WebSocketEvents.ORDER_CREATED, order);
      
      // Log the successful notification
      logger.info(`[WebSocket] Notified room ${room} about new order ${order._id}`);
      
      // Log connected clients for debugging
      this.logConnectedClients();
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

  public notifyItemStatusChange(restaurantId: string, orderId: string, itemId: string, status: string): void {
    if (!this.io) {
      logger.warn('Cannot notify item status change: Socket.io not initialized');
      return;
    }
    
    try {
      const restaurantRoom = `restaurant:${restaurantId}`;
      const orderRoom = `order:${orderId}`;
      const payload = { 
        orderId, 
        itemId, 
        status, 
        timestamp: new Date().toISOString() 
      };
      
      this.io.to(restaurantRoom).emit(WebSocketEvents.ITEM_STATUS_CHANGE, payload);
      this.io.to(orderRoom).emit(WebSocketEvents.ITEM_STATUS_CHANGE, payload);
      
      logger.info(`Sent item status change for order ${orderId}, item ${itemId} to rooms ${restaurantRoom} and ${orderRoom}: ${status}`);
    } catch (error) {
      logger.error(`Error sending item status change for order ${orderId}, item ${itemId}:`, error);
    }
  }
  
  /**
   * Log connected clients and the rooms they're in
   */
  private logConnectedClients(): void {
    if (!this.io) return;
    
    try {
      const sockets = this.io.sockets.sockets;
      const connectedCount = sockets.size;
      
      logger.info(`[WebSocket] Currently connected clients: ${connectedCount}`);
      
      if (connectedCount > 0) {
        sockets.forEach((socket) => {
          const rooms = Array.from(socket.rooms.values())
            .filter(room => room !== socket.id); // Filter out the default room (socket.id)
          
          logger.info(`[WebSocket] Client ${socket.id} is in rooms: ${rooms.join(', ') || 'none'}`);
        });
      }
    } catch (error) {
      logger.error('[WebSocket] Error logging connected clients:', error);
    }
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;
