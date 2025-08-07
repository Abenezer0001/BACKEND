import express from 'express';
import { Server } from 'socket.io';
import ratingRoutes from './routes/ratingRoutes';
import { RatingNotificationService } from './services/RatingNotificationService';

let ratingNotificationService: RatingNotificationService | null = null;

export const initializeRatingService = (app: express.Application, io?: Server): void => {
  try {
    // Initialize notification service
    ratingNotificationService = new RatingNotificationService(io);

    // Mount rating routes
    app.use('/api/v1/ratings', ratingRoutes);

    // Set up Socket.IO event handlers if available
    if (io) {
      io.on('connection', (socket) => {
        console.log(`Client connected to rating service: ${socket.id}`);
        
        // Set up rating-specific socket rooms
        ratingNotificationService?.setupSocketRooms(socket);

        socket.on('disconnect', () => {
          console.log(`Client disconnected from rating service: ${socket.id}`);
        });
      });
    }

    console.log('✅ Rating service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize rating service:', error);
    throw error;
  }
};

export const getRatingNotificationService = (): RatingNotificationService | null => {
  return ratingNotificationService;
};

export const shutdownRatingService = async (): Promise<void> => {
  try {
    console.log('🔄 Shutting down rating service...');
    ratingNotificationService = null;
    console.log('✅ Rating service shutdown complete');
  } catch (error) {
    console.error('❌ Error during rating service shutdown:', error);
    throw error;
  }
};