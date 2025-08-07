import amqp, { Connection, Channel } from 'amqplib';

class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  private constructor() {}

  static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      if (!this.connection) {
        throw new Error('Failed to create RabbitMQ connection');
      }
      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error('Failed to create RabbitMQ channel');
      }
      
      // Define queues
      await this.channel.assertQueue('order_created', { durable: true });
      await this.channel.assertQueue('order_updated', { durable: true });
      await this.channel.assertQueue('payment_processed', { durable: true });
      await this.channel.assertQueue('notification', { durable: true });
      
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('RabbitMQ connection error:', error);
      throw error;
    }
  }

  async publishMessage(queue: string, message: any): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not established');
    }

    try {
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  async consumeMessage(queue: string, callback: (message: any) => void): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not established');
    }

    try {
      await this.channel.consume(queue, (message) => {
        if (message) {
          const content = JSON.parse(message.content.toString());
          callback(content);
          this.channel?.ack(message);
        }
      });
    } catch (error) {
      console.error('Error consuming message:', error);
      throw error;
    }
  }

  async closeConnection(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}

export default RabbitMQService;
