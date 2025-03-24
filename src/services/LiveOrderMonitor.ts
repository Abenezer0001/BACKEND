// import { Order } from '../models/Order';
import Order from '../../services/order-service/src/models/Order';
import { getWebSocketManager } from '../config/websocket';

export class LiveOrderMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private static instance: LiveOrderMonitor;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): LiveOrderMonitor {
    if (!LiveOrderMonitor.instance) {
      LiveOrderMonitor.instance = new LiveOrderMonitor();
    }
    return LiveOrderMonitor.instance;
  }

  start(intervalMs: number = 10000) { // Check every 10 seconds by default
    if (this.checkInterval) {
      return;
    }

    this.checkInterval = setInterval(async () => {
      try {
        // Get all active orders
        const activeOrders = await Order.find({
          status: { 
            $in: ['PENDING', 'CONFIRMED', 'IN_PREPARATION', 'READY_FOR_PICKUP'] 
          }
        });

        // Check for orders that need attention (e.g., pending too long)
        const now = new Date();
        activeOrders.forEach(order => {
          const orderAge = now.getTime() - order.createdAt.getTime();
          
          // Alert if order is pending for more than 5 minutes
          if (order.status === 'PENDING' && orderAge > 5 * 60 * 1000) {
            getWebSocketManager().sendOrderAlert({
              orderId: order._id,
              message: 'Order pending for more than 5 minutes',
              age: orderAge
            });
          }

          // Alert if order is in preparation for more than 30 minutes
          if (order.status === 'IN_PREPARATION' && orderAge > 30 * 60 * 1000) {
            getWebSocketManager().sendOrderAlert({
              orderId: order._id,
              message: 'Order in preparation for more than 30 minutes',
              age: orderAge
            });
          }
        });

      } catch (error) {
        console.error('Error in LiveOrderMonitor:', error);
      }
    }, intervalMs);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}