import express from 'express';
import { Server } from 'socket.io';
import paymentRoutes from '../routes/paymentRoutes';
import stripeConnectBusinessRoutes from '../routes/stripeConnectBusinessRoutes';

let paymentServiceInitialized = false;

export const initializePaymentService = (app: express.Application, io?: Server): void => {
  try {
    if (paymentServiceInitialized) {
      console.log('⚠️ Payment service already initialized, skipping...');
      return;
    }

    console.log('🔄 Initializing Payment Service...');

    // Mount payment routes with multiple path formats for compatibility
    app.use('/api/payments', paymentRoutes);
    app.use('/payments', paymentRoutes);
    
    // Mount Stripe Connect business routes
    app.use('/api/stripe-connect', stripeConnectBusinessRoutes);
    app.use('/stripe-connect', stripeConnectBusinessRoutes);

    console.log('✅ Payment service routes mounted:');
    console.log('   - /api/payments/* (and /payments/*)');
    console.log('   - /api/stripe-connect/* (and /stripe-connect/*)');

    // Set up Socket.IO event handlers for payment notifications if available
    if (io) {
      io.on('connection', (socket) => {
        console.log(`Client connected to payment service: ${socket.id}`);
        
        // Set up payment-specific socket rooms
        socket.on('join-payment-room', (data: { orderId?: string; sessionId?: string }) => {
          if (data.orderId) {
            socket.join(`payment-order-${data.orderId}`);
            console.log(`Socket ${socket.id} joined payment room for order ${data.orderId}`);
          }
          if (data.sessionId) {
            socket.join(`payment-session-${data.sessionId}`);
            console.log(`Socket ${socket.id} joined payment room for session ${data.sessionId}`);
          }
        });

        socket.on('disconnect', () => {
          console.log(`Client disconnected from payment service: ${socket.id}`);
        });
      });
    }

    paymentServiceInitialized = true;
    console.log('✅ Payment service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize payment service:', error);
    throw error;
  }
};

export const shutdownPaymentService = async (): Promise<void> => {
  try {
    console.log('🔄 Shutting down payment service...');
    paymentServiceInitialized = false;
    console.log('✅ Payment service shutdown complete');
  } catch (error) {
    console.error('❌ Error during payment service shutdown:', error);
    throw error;
  }
};

export const getPaymentServiceStatus = (): boolean => {
  return paymentServiceInitialized;
};