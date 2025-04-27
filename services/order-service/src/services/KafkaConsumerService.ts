import kafkaService from '../../../../src/config/kafka';
import { WebSocketService } from './WebSocketService';
import { Server } from 'socket.io';

class KafkaConsumerService {
  private static NOTIFICATIONS_TOPIC = 'inseat-notifications';
  private static CONSUMER_GROUP = 'inseat-order-service-group';
  private static instance: KafkaConsumerService;
  private consumer: any = null;
  private io: Server;
  
  private constructor(io: Server) {
    this.io = io;
  }
  
  // Singleton pattern
  public static getInstance(io?: Server): KafkaConsumerService {
    if (!KafkaConsumerService.instance && io) {
      KafkaConsumerService.instance = new KafkaConsumerService(io);
    } else if (!KafkaConsumerService.instance && !io) {
      throw new Error('KafkaConsumerService requires Socket.IO server for initialization');
    }
    return KafkaConsumerService.instance;
  }
  
  async initialize() {
    try {
      this.consumer = await kafkaService.createConsumer(KafkaConsumerService.CONSUMER_GROUP, {
        retry: {
          initialRetryTime: 300,
          retries: 5
        }
      });
      
      // Subscribe to the notifications topic
      await this.consumer.subscribe({ 
        topic: KafkaConsumerService.NOTIFICATIONS_TOPIC,
        fromBeginning: false
      });
      
      // Set up message handler
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: any) => {
          try {
            // Parse the notification message
            const notification = JSON.parse(message.value.toString());
            console.log(`Received notification from Kafka: ${JSON.stringify(notification)}`);
            
            // Process based on notification type
            switch (notification.type) {
              case 'ORDER_STATUS_UPDATE':
                // Forward to relevant WebSocket clients
                this.io.to(`order:${notification.orderId}`).emit('orderStatusUpdate', notification);
                break;
              case 'PAYMENT_STATUS_UPDATE':
                // Forward to relevant WebSocket clients
                this.io.to(`order:${notification.orderId}`).emit('paymentStatusUpdate', notification);
                break;
              default:
                console.log(`Unknown notification type: ${notification.type}`);
            }
          } catch (error) {
            console.error('Error processing Kafka message:', error);
          }
        }
      });
      
      console.log(`Kafka consumer subscribed to ${KafkaConsumerService.NOTIFICATIONS_TOPIC} topic`);
    } catch (error) {
      console.error('Failed to initialize Kafka consumer:', error);
    }
  }
  
  async disconnect(): Promise<void> {
    await kafkaService.disconnectConsumer(KafkaConsumerService.CONSUMER_GROUP);
  }
}

export default KafkaConsumerService; 