import kafkaService from '../../../../src/config/kafka';
import { IOrder, OrderStatus, PaymentStatus } from '../models/Order';

// Define event types
export enum OrderEventType {
  CREATED = 'ORDER_CREATED',
  UPDATED = 'ORDER_UPDATED',
  STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  PAYMENT_STATUS_CHANGED = 'ORDER_PAYMENT_STATUS_CHANGED',
  CANCELLED = 'ORDER_CANCELLED'
}

// Order event interface
interface OrderEvent {
  eventType: OrderEventType;
  orderId: string;
  restaurantId: string;
  data: any;
  timestamp: string;
}

class KafkaProducerService {
  private static ORDERS_TOPIC = 'inseat-orders';
  private static instance: KafkaProducerService;
  private producer: any = null;
  
  private constructor() {
    this.initialize();
  }
  
  // Singleton pattern
  public static getInstance(): KafkaProducerService {
    if (!KafkaProducerService.instance) {
      KafkaProducerService.instance = new KafkaProducerService();
    }
    return KafkaProducerService.instance;
  }
  
  private async initialize() {
    try {
      this.producer = await kafkaService.connectProducer({
        retry: {
          initialRetryTime: 300,
          retries: 5
        }
      });
      console.log('Kafka producer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Kafka producer:', error);
    }
  }
  
  // Publish order created event
  async publishOrderCreated(order: IOrder): Promise<void> {
    await this.publishOrderEvent(OrderEventType.CREATED, order);
  }
  
  // Publish order updated event
  async publishOrderUpdated(order: IOrder): Promise<void> {
    await this.publishOrderEvent(OrderEventType.UPDATED, order);
  }
  
  // Publish order status changed event
  async publishOrderStatusChanged(order: IOrder, previousStatus: OrderStatus): Promise<void> {
    await this.publishOrderEvent(OrderEventType.STATUS_CHANGED, order, {
      previousStatus,
      newStatus: order.status
    });
  }
  
  // Publish payment status changed event
  async publishPaymentStatusChanged(order: IOrder, previousStatus: PaymentStatus): Promise<void> {
    await this.publishOrderEvent(OrderEventType.PAYMENT_STATUS_CHANGED, order, {
      previousStatus,
      newStatus: order.paymentStatus
    });
  }
  
  // Publish order cancelled event
  async publishOrderCancelled(order: IOrder): Promise<void> {
    await this.publishOrderEvent(OrderEventType.CANCELLED, order);
  }
  
  // Generic method to publish order events
  private async publishOrderEvent(
    eventType: OrderEventType,
    order: IOrder,
    additionalData: any = {}
  ): Promise<void> {
    if (!this.producer) {
      await this.initialize();
    }
    
    try {
      const orderObject = order.toObject ? order.toObject() : order;
      
      const event: OrderEvent = {
        eventType,
        orderId: orderObject._id.toString(),
        restaurantId: orderObject.restaurantId.toString(),
        data: {
          order: {
            _id: orderObject._id,
            orderNumber: orderObject.orderNumber,
            restaurantId: orderObject.restaurantId,
            tableId: orderObject.tableId,
            userId: orderObject.userId,
            status: orderObject.status,
            paymentStatus: orderObject.paymentStatus,
            total: orderObject.total,
            orderType: orderObject.orderType,
            createdAt: orderObject.createdAt
          },
          ...additionalData
        },
        timestamp: new Date().toISOString()
      };
      
      await this.producer.send({
        topic: KafkaProducerService.ORDERS_TOPIC,
        messages: [{
          key: orderObject._id.toString(),
          value: JSON.stringify(event)
        }]
      });
      
      console.log(`Published ${eventType} event for order ${orderObject._id}`);
    } catch (error) {
      console.error(`Failed to publish ${eventType} event:`, error);
      // Implement retry logic if needed
    }
  }
  
  // Cleanup method
  async disconnect(): Promise<void> {
    await kafkaService.disconnectProducer();
  }
}

export default KafkaProducerService.getInstance(); 
