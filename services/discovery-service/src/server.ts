import express from 'express';
import { Server } from 'socket.io';
import { RestaurantDiscoveryService } from './services/RestaurantDiscoveryService';

let discoveryService: RestaurantDiscoveryService | null = null;

export const initializeDiscoveryService = (app: express.Application, io?: Server): void => {
  try {
    // Initialize discovery service
    discoveryService = new RestaurantDiscoveryService();

    // Mount discovery routes here when controllers are created
    // app.use('/api/v1/discovery', discoveryRoutes);

    // Set up Socket.IO event handlers if available
    if (io) {
      io.on('connection', (socket) => {
        console.log(`Client connected to discovery service: ${socket.id}`);

        // Discovery-specific socket events
        socket.on('join-discovery', () => {
          socket.join('restaurant-discovery');
          console.log(`Socket ${socket.id} joined restaurant discovery`);
        });

        socket.on('leave-discovery', () => {
          socket.leave('restaurant-discovery');
          console.log(`Socket ${socket.id} left restaurant discovery`);
        });

        socket.on('disconnect', () => {
          console.log(`Client disconnected from discovery service: ${socket.id}`);
        });
      });
    }

    console.log('✅ Discovery service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize discovery service:', error);
    throw error;
  }
};

export const getDiscoveryService = (): RestaurantDiscoveryService | null => {
  return discoveryService;
};

export const shutdownDiscoveryService = async (): Promise<void> => {
  try {
    console.log('🔄 Shutting down discovery service...');
    discoveryService = null;
    console.log('✅ Discovery service shutdown complete');
  } catch (error) {
    console.error('❌ Error during discovery service shutdown:', error);
    throw error;
  }
};