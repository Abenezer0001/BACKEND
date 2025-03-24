import WebSocket from 'ws';
import { IOrder } from '../models/Order';

export class WebSocketService {
  private wss: WebSocket.Server;

  constructor(wss: WebSocket.Server) {
    this.wss = wss;
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: any): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Notify all clients about a new order
   */
  notifyNewOrder(order: IOrder): void {
    this.broadcast({ 
      type: 'NEW_ORDER', 
      data: order 
    });
    console.log(`WebSocket: Notified clients about new order ${order.orderNumber}`);
  }

  /**
   * Notify all clients about an order update
   */
  notifyOrderUpdate(order: IOrder): void {
    this.broadcast({ 
      type: 'ORDER_UPDATE', 
      data: order 
    });
    console.log(`WebSocket: Notified clients about order update ${order.orderNumber}`);
  }

  /**
   * Notify all clients about an order cancellation
   */
  notifyOrderCancellation(order: IOrder): void {
    this.broadcast({ 
      type: 'ORDER_CANCELLED', 
      data: order 
    });
  }
}
