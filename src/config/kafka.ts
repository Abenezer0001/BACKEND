import { Kafka, Producer, ProducerConfig } from 'kafkajs';
import * as process from 'process';

const kafka = new Kafka({
  clientId: 'inseat-service',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
});

// Add a producer reference to handle connections
let producer: Producer | null = null;

// Extend the kafka object with producer management methods
const kafkaService = {
  ...kafka,
  
  // Method to connect and get a producer
  async connectProducer(config?: ProducerConfig): Promise<Producer> {
    if (producer) {
      return producer;
    }
    
    producer = kafka.producer(config);
    await producer.connect();
    console.log('Producer connected to Kafka');
    return producer;
  },
  
  // Method to disconnect the producer
  async disconnectProducer(): Promise<void> {
    if (producer) {
      await producer.disconnect();
      producer = null;
      console.log('Producer disconnected from Kafka');
    }
  }
};

export default kafkaService;