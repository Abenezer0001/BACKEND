import { Kafka, Producer, Consumer, ProducerConfig, ConsumerConfig } from 'kafkajs';

interface KafkaConfig {
  clientId: string;
  brokers: string[];
}

// Temporarily disabled Kafka service
class KafkaService {
  // Mock implementation
  // Temporarily disabled
  // private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();

  constructor(config: KafkaConfig) {
    // Temporarily disabled
    console.log('Kafka service temporarily disabled');
  }

  async connectProducer(config: ProducerConfig = {}) {
    console.log('Mock: Kafka producer connected');
    return {
      send: async () => console.log('Mock: Message sent'),
      disconnect: async () => console.log('Mock: Producer disconnected')
    };
  }

  async createConsumer(groupId: string, config?: ConsumerConfig): Promise<any> {
    console.log(`Mock: Kafka consumer connected with group ID: ${groupId}`);
    return {
      subscribe: async () => console.log('Mock: Consumer subscribed'),
      run: async () => console.log('Mock: Consumer running'),
      disconnect: async () => console.log('Mock: Consumer disconnected')
    };
  }

  async disconnectProducer() {
    console.log('Mock: Kafka producer disconnected');
  }

  async disconnectConsumer(groupId: string) {
    console.log(`Mock: Kafka consumer with group ID ${groupId} disconnected`);
  }

  async disconnectAll() {
    console.log('Mock: All Kafka connections closed');
  }
}

// Environment variables for Kafka configuration
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'inseat-order-service';

// Create a singleton instance
const kafkaService = new KafkaService({
  
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKERS,
});

export default kafkaService; 