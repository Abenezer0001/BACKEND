import express, { Application } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createOrderRoutes } from './routes/orderRoutes';
import { KafkaConsumerService } from './services/KafkaConsumerService';
import { OrderSocketService } from './services/OrderSocketService';
import kafkaService from './config/kafka';
import WebSocketService from './services/WebSocketService';

let kafkaConsumerService: KafkaConsumerService | null = null;
let orderSocketService: OrderSocketService | null = null;

/**
 * Initialize the order service with the main application
 * @param app Express application instance
 * @param io Socket.IO server instance
 */
export const initializeOrderService = (app: Application, io: SocketIOServer): void => {
  console.log('Initializing Order Service...');

  // Initialize order socket service
  orderSocketService = new OrderSocketService(io);
  orderSocketService.initialize();

  // Set up routes for the order service under /api/orders
  // Set up routes for the order service under /api/orders
  const routes = createOrderRoutes(WebSocketService);
  app.use('/api/orders', routes);

  // Initialize Kafka consumer
  kafkaConsumerService = new KafkaConsumerService();
  kafkaConsumerService.startConsumer()
    .then(() => {
      console.log('Kafka consumer started successfully');
    })
    .catch((error) => {
      console.error('Failed to start Kafka consumer:', error);
    });

  console.log('Order Service initialized successfully');
};

/**
 * Shutdown function for the order service
 * Gracefully terminates all services
 */
export const shutdownOrderService = async (): Promise<void> => {
  console.log('Shutting down Order Service...');

  // Shutdown Kafka consumer if initialized
  if (kafkaConsumerService) {
    try {
      await kafkaConsumerService.shutdown();
      console.log('Kafka consumer shut down successfully');
    } catch (error) {
      console.error('Error shutting down Kafka consumer:', error);
    }
    kafkaConsumerService = null;
  }

  // Cleanup socket service if initialized
  if (orderSocketService) {
    orderSocketService.cleanup();
    orderSocketService = null;
    console.log('Order Socket Service cleaned up');
  }

  console.log('Order Service shutdown complete');
};

// Export kafka service for external use
export { kafkaService };
