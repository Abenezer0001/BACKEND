import express from 'express';
import { Server } from 'socket.io';
import { TipNotificationService } from './services/TipNotificationService';

let tipNotificationService: TipNotificationService | null = null;

export const initializeTippingService = (app: express.Application, io?: Server): void => {
  try {
    // Initialize notification service
    tipNotificationService = new TipNotificationService(io);

    // Mount tipping routes here when controllers are created
    // app.use('/api/v1/tips', tipRoutes);
    // app.use('/api/v1/staff', staffRoutes);

    // Set up Socket.IO event handlers if available
    if (io) {
      io.on('connection', (socket) => {
        console.log(`Client connected to tipping service: ${socket.id}`);
        
        // Set up tipping-specific socket rooms
        tipNotificationService?.setupSocketRooms(socket);

        socket.on('disconnect', () => {
          console.log(`Client disconnected from tipping service: ${socket.id}`);
        });
      });
    }

    console.log('✅ Tipping service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize tipping service:', error);
    throw error;
  }
};

export const getTipNotificationService = (): TipNotificationService | null => {
  return tipNotificationService;
};

export const shutdownTippingService = async (): Promise<void> => {
  try {
    console.log('🔄 Shutting down tipping service...');
    tipNotificationService = null;
    console.log('✅ Tipping service shutdown complete');
  } catch (error) {
    console.error('❌ Error during tipping service shutdown:', error);
    throw error;
  }
};