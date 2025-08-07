import { Consumer } from 'kafkajs';
import kafkaService from '../config/kafka';

export class KafkaConsumerService {
  private consumer: any;
  private groupId: string = 'order-service-group';
  private static instance: KafkaConsumerService;

  constructor() {
    // We'll initialize the consumer in startConsumer
  }

  static getInstance(): KafkaConsumerService {
    if (!KafkaConsumerService.instance) {
      KafkaConsumerService.instance = new KafkaConsumerService();
    }
    return KafkaConsumerService.instance;
  }

  static async initialize(): Promise<void> {
    const instance = KafkaConsumerService.getInstance();
    await instance.startConsumer();
  }

  static async disconnect(): Promise<void> {
    const instance = KafkaConsumerService.getInstance();
    await instance.shutdown();
  }

  async startConsumer(): Promise<void> {
    try {
      this.consumer = await kafkaService.createConsumer(this.groupId);
      await this.consumer.subscribe({ topic: 'orders', fromBeginning: true });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log({
            topic,
            partition,
            value: message?.value?.toString(),
          });
        },
      });
    } catch (error) {
      console.error('Error starting Kafka consumer:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      if (this.consumer) {
        await kafkaService.disconnectConsumer(this.groupId);
      }
    } catch (error) {
      console.error('Error disconnecting Kafka consumer:', error);
      throw error;
    }
  }
}

