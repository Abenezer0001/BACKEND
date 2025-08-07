import { EventEmitter } from 'events';
import Order, { OrderStatus, PaymentStatus, IOrder } from '../models/Order';
import WebSocketService from '../services/WebSocketService';
import KafkaProducerService from '../services/KafkaProducerService';
import logger from '../config/logger';

/**
 * LiveOrderMonitor
 * A utility that monitors orders in real-time and sends alerts for various events
 * such as stalled orders, long preparation times, etc.
 */
export class LiveOrderMonitor extends EventEmitter {
  private static instance: LiveOrderMonitor;
  private monitorInterval: NodeJS.Timeout | null = null;
  private wsService: typeof WebSocketService;
  private checkIntervalMs: number = 60000; // 1 minute
  private orderAlertThresholds: {
    pending: number;    // alert if pending > X minutes
    preparing: number;  // alert if preparing > X minutes
    ready: number;      // alert if ready for pickup > X minutes
  };
  private isActive: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertsEnabled: boolean = true;

  private constructor() {
    super();
    this.wsService = WebSocketService;
    this.orderAlertThresholds = {
      pending: parseInt(process.env.ORDER_ALERT_PENDING_MINS || '5', 10) * 60000,
      preparing: parseInt(process.env.ORDER_ALERT_PREPARING_MINS || '15', 10) * 60000,
      ready: parseInt(process.env.ORDER_ALERT_READY_MINS || '10', 10) * 60000
    };
  }

  /**
   * Get or create the singleton instance
   */
  public static getInstance(): LiveOrderMonitor {
    if (!LiveOrderMonitor.instance) {
      LiveOrderMonitor.instance = new LiveOrderMonitor();
    }
    return LiveOrderMonitor.instance;
  }

  /**
   * Start monitoring orders at regular intervals
   */
  public start(): void {
    logger.info('Starting live order monitoring service');
    if (this.monitorInterval) {
      this.stop();
    }

    this.monitorInterval = setInterval(() => {
      this.checkOrders().catch(err => {
        logger.error('Error checking orders:', err);
      });
    }, this.checkIntervalMs);

    // Initial check on startup
    this.checkOrders().catch(err => {
      logger.error('Error during initial order check:', err);
    });
  }

  /**
   * Stop monitoring orders
   */
  public stop(): void {
    logger.info('Stopping live order monitoring service');
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Check for orders requiring attention
   */
  private async checkOrders(): Promise<void> {
    logger.debug('Checking for orders requiring attention...');
    
    await Promise.all([
      this.checkStalledOrders(),
      this.checkLongPrepTimes()
    ]);
  }

  /**
   * Check for stalled orders in each status
   */
  private async checkStalledOrders(): Promise<void> {
    const currentTime = new Date();
    
    try {
      // Check pending orders
      const stalledPendingOrders = await Order.find({
        status: OrderStatus.PENDING,
        updatedAt: { 
          $lt: new Date(currentTime.getTime() - this.orderAlertThresholds.pending) 
        }
      }).populate('restaurantId', 'name');

      // Check preparing orders
      const stalledPreparingOrders = await Order.find({
        status: OrderStatus.PREPARING,
        updatedAt: { 
          $lt: new Date(currentTime.getTime() - this.orderAlertThresholds.preparing) 
        }
      }).populate('restaurantId', 'name');

      // Check ready orders
      const stalledReadyOrders = await Order.find({
        status: OrderStatus.READY,
        updatedAt: { 
          $lt: new Date(currentTime.getTime() - this.orderAlertThresholds.ready) 
        }
      }).populate('restaurantId', 'name');

      // Send alerts for stalled orders
      this.sendAlertsForStalledOrders(stalledPendingOrders, 'pending');
      this.sendAlertsForStalledOrders(stalledPreparingOrders, 'preparing');
      this.sendAlertsForStalledOrders(stalledReadyOrders, 'ready');
    } catch (error) {
      logger.error('Error checking stalled orders:', error);
    }
  }

  /**
   * Check for orders taking longer than estimated preparation time
   */
  private async checkLongPrepTimes(): Promise<void> {
    const currentTime = new Date();
    
    try {
      // Find orders in PREPARING status with estimatedPreparationTime exceeded
      const longPrepTimeOrders = await Order.find({
        status: OrderStatus.PREPARING,
        estimatedPreparationTime: { $exists: true, $ne: null },
        updatedAt: { 
          $lt: new Date(currentTime.getTime() - 60000) // Only consider orders updated at least 1 minute ago
        }
      }).populate('restaurantId', 'name');
      
      // Filter orders exceeding their estimated prep time
      const exceededOrders = longPrepTimeOrders.filter(order => {
        if (!order.estimatedPreparationTime) return false;
        
        const prepStartTime = order.statusHistory?.find(
          h => h.status === OrderStatus.PREPARING
        )?.timestamp || order.updatedAt;
        
        const elapsedMs = currentTime.getTime() - prepStartTime.getTime();
        const estimatedMs = order.estimatedPreparationTime * 60000; // Convert minutes to ms
        
        return elapsedMs > estimatedMs;
      });
      
      // Send alerts for orders exceeding estimated prep time
      exceededOrders.forEach(order => {
        const restaurantName = order.restaurantId ? 
          (order.restaurantId as any).name : 'Restaurant';
          
        const alertMessage = `Order #${order.orderNumber} at ${restaurantName} is taking longer than the estimated preparation time of ${order.estimatedPreparationTime} minutes.`;
        
        this.sendOrderAlert(order, alertMessage, 'long_prep_time');
      });
    } catch (error) {
      logger.error('Error checking long preparation times:', error);
    }
  }

  /**
   * Send alerts for stalled orders
   */
  private sendAlertsForStalledOrders(orders: IOrder[], statusType: string): void {
    if (orders.length === 0) return;
    
    orders.forEach(order => {
      const restaurantName = order.restaurantId ? 
        (order.restaurantId as any).name : 'Restaurant';
        
      const alertMessage = `Order #${order.orderNumber} at ${restaurantName} has been in ${statusType} status for an extended period and may require attention.`;
      
      this.sendOrderAlert(order, alertMessage, `stalled_${statusType}`);
    });
  }

  /**
   * Send an alert for a specific order
   */
  private sendOrderAlert(order: IOrder, message: string, alertType: string): void {
    logger.info(`Order alert [${alertType}]: ${message}`);
    
    // Emit event for potential custom handlers
    this.emit('orderAlert', { order, message, alertType });
    
    // Send WebSocket notification
    this.wsService.notifyOrderAlert(
      order.restaurantId?.toString() || '',
      order._id.toString(), 
      message
    );
    
    // Log the alert in order.alerts array if not already logged in the last hour
    // This prevents alert spam for the same issue
    this.logAlertInOrder(order, alertType, message).catch(err => {
      logger.error(`Error logging alert in order: ${err.message}`);
    });
  }

  /**
   * Log an alert in the order document
   */
  private async logAlertInOrder(order: IOrder, alertType: string, message: string): Promise<void> {
    // Initialize alerts array if it doesn't exist
    if (!order.alerts) {
      order.alerts = [];
    }
    
    // Check if we've sent this type of alert recently (within the last hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentAlertExists = order.alerts.some(alert => 
      alert.type === alertType && new Date(alert.timestamp) > oneHourAgo
    );
    
    // If we haven't sent this alert recently, add it and save
    if (!recentAlertExists) {
      order.alerts.push({
        type: alertType,
        message,
        timestamp: new Date().toISOString()
      });
      
      await Order.updateOne({ _id: order._id }, { 
        $push: { 
          alerts: {
            type: alertType,
            message,
            timestamp: new Date().toISOString()
          }
        } 
      });
    }
  }
}

export default LiveOrderMonitor; 