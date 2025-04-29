import { Kafka, Producer, Message } from 'kafkajs';
import { IOrder } from '../models/Order';
import config from '../config';
import logger from '../utils/logger';

export enum KafkaTopics {
  ORDER_CREATED = 'order-created',
  ORDER_UPDATED = 'order-updated',
  ORDER_CANCELLED = 'order-cancelled',
  ORDER_COMPLETED = 'order-completed',
  ORDER_ALERT = 'order-alert',
  NOTIFICATION = 'notification'
}

class KafkaProducerService {
  private producer: Producer | null = null;
  private isConnected: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_INTERVAL = 5000; // 5 seconds
  
  constructor() {
    this.initializeProducer();
  }
  
  private async initializeProducer(): Promise<void> {
    try {
      if (!config.kafka.brokers || config.kafka.brokers.length === 0) {
        logger.warn('Kafka brokers not configured. Skipping Kafka producer initialization.');
        return;
      }
      
      const kafka = new Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
        retry: {
          initialRetryTime: 300,
          retries: 5
        }
      });
      
      this.producer = kafka.producer();
      
      await this.connect();
      
      logger.info('Kafka producer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka producer:', error);
      this.scheduleReconnect();
    }
  }
  
  private async connect(): Promise<void> {
    if (!this.producer) {
      logger.warn('Cannot connect: Producer not initialized');
      return;
    }
    
    try {
      logger.info('Connecting to Kafka...');
      await this.producer.connect();
      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.info('Successfully connected to Kafka');
    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;
      logger.error(`Failed to connect to Kafka (attempt ${this.connectionAttempts}):`, error);
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.connectionAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      logger.info(`Scheduling Kafka reconnection in ${this.RECONNECT_INTERVAL}ms...`);
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, this.RECONNECT_INTERVAL);
    } else {
      logger.error(`Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
      // Reset connection attempts to allow future reconnection attempts
      setTimeout(() => {
        this.connectionAttempts = 0;
      }, 60000); // Reset after 1 minute
    }
  }
  
  private async ensureConnected(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }
    
    if (this.connectionAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      await this.connect();
      return this.isConnected;
    }
    
    return false;
  }
  
  public async publishOrderCreated(order: IOrder): Promise<void> {
    await this.publishEvent(KafkaTopics.ORDER_CREATED, {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      userId: order.userId,
      tableNumber: order.tableNumber,
      timestamp: new Date().toISOString(),
      data: order.toObject ? order.toObject() : order
    });
    
    // Also publish notification
    await this.publishNotification({
      type: 'ORDER_CREATED',
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      message: `New order #${order.orderNumber} received`,
      timestamp: new Date().toISOString()
    });
  }
  
  public async publishOrderUpdated(order: IOrder): Promise<void> {
    await this.publishEvent(KafkaTopics.ORDER_UPDATED, {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      status: order.status,
      timestamp: new Date().toISOString(),
      data: order.toObject ? order.toObject() : order
    });
    
    // Also publish notification
    await this.publishNotification({
      type: 'ORDER_UPDATED',
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      message: `Order #${order.orderNumber} updated to status ${order.status}`,
      timestamp: new Date().toISOString()
    });
  }
  
  public async publishOrderCancelled(order: IOrder): Promise<void> {
    await this.publishEvent(KafkaTopics.ORDER_CANCELLED, {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      timestamp: new Date().toISOString(),
      reason: order.cancellationReason || 'No reason provided',
      data: order.toObject ? order.toObject() : order
    });
    
    // Also publish notification
    await this.publishNotification({
      type: 'ORDER_CANCELLED',
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      message: `Order #${order.orderNumber} has been cancelled`,
      timestamp: new Date().toISOString()
    });
  }
  
  public async publishOrderCompleted(order: IOrder): Promise<void> {
    await this.publishEvent(KafkaTopics.ORDER_COMPLETED, {
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      timestamp: new Date().toISOString(),
      data: order.toObject ? order.toObject() : order
    });
    
    // Also publish notification
    await this.publishNotification({
      type: 'ORDER_COMPLETED',
      orderId: order._id.toString(),
      restaurantId: order.restaurantId,
      message: `Order #${order.orderNumber} has been completed`,
      timestamp: new Date().toISOString()
    });
  }
  
  public async publishOrderAlert(orderId: string, restaurantId: string, message: string): Promise<void> {
    await this.publishEvent(KafkaTopics.ORDER_ALERT, {
      orderId,
      restaurantId,
      message,
      timestamp: new Date().toISOString()
    });
    
    // Also publish notification
    await this.publishNotification({
      type: 'ORDER_ALERT',
      orderId,
      restaurantId,
      message,
      timestamp: new Date().toISOString()
    });
  }
  
  private async publishNotification(notification: any): Promise<void> {
    await this.publishEvent(KafkaTopics.NOTIFICATION, notification);
  }
  
  private async publishEvent(topic: string, data: any): Promise<void> {
    if (!await this.ensureConnected()) {
      logger.warn(`Cannot publish to topic ${topic}: Not connected to Kafka`);
      return;
    }
    
    if (!this.producer) {
      logger.warn(`Cannot publish to topic ${topic}: Producer not initialized`);
      return;
    }
    
    try {
      const message: Message = {
        value: JSON.stringify(data)
      };
      
      logger.info(`Publishing message to topic ${topic}`);
      
      await this.producer.send({
        topic,
        messages: [message]
      });
      
      logger.info(`Successfully published message to topic ${topic}`);
    } catch (error) {
      logger.error(`Error publishing to topic ${topic}:`, error);
      // If we failed to publish, we might be disconnected
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }
  
  public async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.producer && this.isConnected) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
        logger.info('Kafka producer disconnected');
      } catch (error) {
        logger.error('Error disconnecting Kafka producer:', error);
      }
    }
  }
}

// Export singleton instance
const kafkaProducer = new KafkaProducerService();
export default kafkaProducer; 