import express from 'express';
import { Server } from 'socket.io';
import { GroupOrderSocketService } from './services/GroupOrderSocketService';
import groupOrderRoutes from './routes/groupOrderRoutes';

let groupOrderSocketService: GroupOrderSocketService | null = null;

export const initializeGroupOrderingService = (app: express.Application, io?: Server): void => {
  try {
    // Mount group ordering routes
    app.use('/api/group-orders', groupOrderRoutes);
    console.log('✅ Group ordering routes mounted at /api/group-orders');

    // Set up Socket.IO event handlers if available - temporarily disabled
    // if (io) {
    //   groupOrderSocketService = new GroupOrderSocketService(io);
    //   console.log('Group ordering Socket.IO service initialized');
    // }
    console.log('Group ordering Socket.IO service temporarily disabled');

    console.log('✅ Group ordering service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize group ordering service:', error);
    throw error;
  }
};

export const getGroupOrderSocketService = (): GroupOrderSocketService | null => {
  return groupOrderSocketService;
};

export const shutdownGroupOrderingService = async (): Promise<void> => {
  try {
    console.log('🔄 Shutting down group ordering service...');
    groupOrderSocketService = null;
    console.log('✅ Group ordering service shutdown complete');
  } catch (error) {
    console.error('❌ Error during group ordering service shutdown:', error);
    throw error;
  }
};