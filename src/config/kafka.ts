import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'inseat-service',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
});

export default kafka;