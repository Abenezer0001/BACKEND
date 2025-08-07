import WebSocketService from './WebSocketService';
import { OrderStatus, PaymentStatus } from '../models/Order';
// import { KafkaConsumerService } from './KafkaConsumerService';
// import KafkaProducerService from './KafkaProducerService';
import logger from '../utils/logger';

/**
 * LiveOrderMonitor handles the real-time monitoring of orders.
 * It connects Kafka with WebSockets to provide live updates to clients.
 */
class LiveOrderMonitor {
  private static instance: LiveOrderMonitor;
  private wsService: typeof WebSocketService;
  private isActive: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertsEnabled: boolean = true;

  private constructor() {
    this.wsService = WebSocketService;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LiveOrderMonitor {
    if (!LiveOrderMonitor.instance) {
      LiveOrderMonitor.instance = new LiveOrderMonitor();
    }
    return LiveOrderMonitor.instance;
  }

  /**
   * Initialize the monitor service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing LiveOrderMonitor');

      // Initialize the Kafka consumer service
      await KafkaConsumerService.initialize();

      // Set monitoring as active
      this.isActive = true;

      // Start order alert monitoring
      this.startAlertMonitoring();

      logger.info('LiveOrderMonitor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize LiveOrderMonitor:', error);
      throw error;
    }
  }

  /**
   * Start monitoring for order alerts (stalled orders, long wait times, etc.)
   * This runs a periodic check on active orders
   */
  private startAlertMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Run order monitoring check every minute
    this.monitoringInterval = setInterval(() => {
      if (this.isActive && this.alertsEnabled) {
        this.checkForOrderAlerts();
      }
    }, 60000); // Check every minute
  }

  /**
   * Check for order alerts such as:
   * - Orders that have been in the same status for too long
   * - Orders that might need attention
   */
  private async checkForOrderAlerts(): Promise<void> {
    try {
      // This would normally involve querying the database for orders that match alert criteria
      // For demonstration, we'll just log that the check is happening
      logger.debug('Checking for order alerts');

      // Example of how this might work:
      /*
      const stalledOrders = await Order.find({
        status: { $in: [OrderStatus.PENDING, OrderStatus.PREPARING] },
        updatedAt: { $lt: new Date(Date.now() - 30 * 60000) }, // 30 minutes old
      }).populate('restaurantId').exec();

      for (const order of stalledOrders) {
        // Send alert for stalled order
        this.sendOrderAlert(order, 'Order has been in same status for more than 30 minutes');
      }
      */
    } catch (error) {
      logger.error('Error in order alert check:', error);
    }
  }

  /**
   * Send an alert about an order through WebSocket
   */
  public sendOrderAlert(orderId: string, restaurantId: string, message: string): void {
    if (!this.alertsEnabled) return;

    try {
      // Send alert via WebSocket to the restaurant
      this.wsService.notifyOrderAlert(restaurantId, orderId, message);
      
      // Log the alert
      logger.info(`Order alert sent for order ${orderId}: ${message}`);
    } catch (error) {
      logger.error('Failed to send order alert:', error);
    }
  }

  /**
   * Enable order alerts
   */
  public enableAlerts(): void {
    this.alertsEnabled = true;
    logger.info('Order alerts enabled');
  }

  /**
   * Disable order alerts
   */
  public disableAlerts(): void {
    this.alertsEnabled = false;
    logger.info('Order alerts disabled');
  }

  /**
   * Stop the monitor service
   */
  public async stop(): Promise<void> {
    try {
      this.isActive = false;
      
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
      
      // Disconnect Kafka consumer
      await KafkaConsumerService.disconnect();
      
      logger.info('LiveOrderMonitor stopped');
    } catch (error) {
      logger.error('Error stopping LiveOrderMonitor:', error);
      throw error;
    }
  }
}

export default LiveOrderMonitor; 