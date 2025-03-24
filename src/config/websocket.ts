import { Server as HTTPServer } from 'http';
import { WebSocket, Server as WebSocketServer } from 'ws';
// Import Order model and interface from the correct path
import OrderModel, { IOrder } from '../../services/order-service/src/models/Order';

// Define a type alias for better readability
type Order = IOrder;

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  userRole?: string;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer;
  private clients: Map<string, ExtendedWebSocket>;
  private pingInterval: NodeJS.Timeout;

  private constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map();
    this.setupWebSocket();
    this.pingInterval = this.startPingInterval();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', async (ws: WebSocket, request) => {
      const extWs = ws as ExtendedWebSocket;
      try {
        // Set up client properties
        extWs.isAlive = true;
        this.clients.set(request.headers['sec-websocket-key'] as string, extWs);

        console.log(`Client connected: ${request.headers['sec-websocket-key']}`);

        // Set up ping-pong
        extWs.on('pong', () => {
          extWs.isAlive = true;
        });

        // Handle messages
        extWs.on('message', (data: string) => {
          console.log('Received:', data);
        });

        // Handle client disconnect
        extWs.on('close', () => {
          this.clients.delete(request.headers['sec-websocket-key'] as string);
          console.log(`Client disconnected: ${request.headers['sec-websocket-key']}`);
        });

        // Send initial connection success message
        extWs.send(JSON.stringify({
          type: 'CONNECTION_ESTABLISHED',
          message: 'Successfully connected to WebSocket server',
          timestamp: Date.now()
        }));

      } catch (error) {
        console.error('WebSocket connection error:', error);
        extWs.close();
      }
    });
  }

  private startPingInterval(): NodeJS.Timeout {
    return setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const extWs = ws as ExtendedWebSocket;
        if (!extWs.isAlive) {
          return ws.terminate();
        }
        extWs.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  public static initialize(server: HTTPServer): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(server);
    }
    return WebSocketManager.instance;
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      throw new Error('WebSocketManager not initialized');
    }
    return WebSocketManager.instance;
  }

  public notifyNewOrder(order: Order): void {
    this.broadcast({
      type: 'NEW_ORDER',
      data: order,
      timestamp: Date.now()
    });
  }

  public notifyOrderUpdate(order: Order): void {
    this.broadcast({
      type: 'ORDER_UPDATE',
      data: order,
      timestamp: Date.now()
    });
  }

  public sendOrderAlert(alertData: any): void {
    this.broadcast({
      type: 'ORDER_ALERT',
      data: alertData,
      timestamp: Date.now()
    });
  }

  private broadcast(message: any): void {
    this.wss.clients.forEach((ws: WebSocket) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.readyState === WebSocket.OPEN) {
        extWs.send(JSON.stringify(message));
      }
    });
  }

  public cleanup(): void {
    clearInterval(this.pingInterval);
    this.wss.close();
  }
}

export const getWebSocketManager = (): WebSocketManager => {
  return WebSocketManager.getInstance();
};