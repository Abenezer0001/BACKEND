// Import centralized logger configuration
import { createServiceLogger } from '../../../../src/config/logger';

// Create order service specific logger
const orderLogger = createServiceLogger('order-service');

// Export structured logging interface for order service
export const Log = {
  error: (message: string, meta?: any) => {
    orderLogger.error(message, meta);
  },
  
  warn: (message: string, meta?: any) => {
    orderLogger.warn(message, meta);
  },
  
  info: (message: string, meta?: any) => {
    orderLogger.info(message, meta);
  },
  
  debug: (message: string, meta?: any) => {
    orderLogger.debug(message, meta);
  },
  
  http: (message: string, meta?: any) => {
    orderLogger.http(message, meta);
  },

  // Order-specific logging methods
  order: {
    created: (orderId: string, customerId: string, total: number, meta?: any) => {
      orderLogger.business('Order created', {
        orderId,
        customerId,
        total,
        ...meta
      });
    },

    updated: (orderId: string, status: string, meta?: any) => {
      orderLogger.business('Order status updated', {
        orderId,
        status,
        ...meta
      });
    },

    completed: (orderId: string, meta?: any) => {
      orderLogger.business('Order completed', {
        orderId,
        ...meta
      });
    },

    cancelled: (orderId: string, reason: string, meta?: any) => {
      orderLogger.business('Order cancelled', {
        orderId,
        reason,
        ...meta
      });
    },

    payment: (orderId: string, status: string, amount: number, meta?: any) => {
      orderLogger.business('Order payment processed', {
        orderId,
        paymentStatus: status,
        amount,
        ...meta
      });
    }
  },

  websocket: {
    connected: (socketId: string, meta?: any) => {
      orderLogger.info('WebSocket client connected', {
        event: 'websocket_connected',
        socketId,
        ...meta
      });
    },

    disconnected: (socketId: string, meta?: any) => {
      orderLogger.info('WebSocket client disconnected', {
        event: 'websocket_disconnected',
        socketId,
        ...meta
      });
    },

    messageReceived: (socketId: string, messageType: string, meta?: any) => {
      orderLogger.debug('WebSocket message received', {
        event: 'websocket_message',
        socketId,
        messageType,
        ...meta
      });
    },

    error: (socketId: string, error: string, meta?: any) => {
      orderLogger.error('WebSocket error', {
        event: 'websocket_error',
        socketId,
        error,
        ...meta
      });
    }
  },

  database: {
    query: (operation: string, collection: string, duration: number, meta?: any) => {
      orderLogger.database(operation, collection, {
        duration,
        ...meta
      });
    },

    error: (operation: string, collection: string, error: string, meta?: any) => {
      orderLogger.error('Database operation failed', {
        event: 'database_error',
        operation,
        collection,
        error,
        ...meta
      });
    }
  }
};

// Export order logger for direct access if needed
export { orderLogger };

// Export default for backward compatibility
export default orderLogger; 