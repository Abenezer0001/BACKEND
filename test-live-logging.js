#!/usr/bin/env node

/**
 * Live Logging Test Script
 * Generates continuous log entries to test the live log monitor
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create loggers for different services
const createTestLogger = (serviceName) => {
  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service: serviceName,
      version: '1.0.0',
      environment: 'development',
      pid: process.pid
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
          winston.format.printf(({ timestamp, level, message, service, correlationId }) => {
            const corrId = correlationId ? `[${correlationId.slice(-8)}]` : '';
            return `${timestamp} ${level} [${service}]${corrId}: ${message}`;
          })
        )
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
        tailable: true
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
        tailable: true
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'access.log'),
        level: 'http',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 10,
        tailable: true
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'security.log'),
        level: 'warn',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
        tailable: true
      })
    ]
  });
};

// Create service loggers
const mainLogger = createTestLogger('main');
const authLogger = createTestLogger('auth-service');
const orderLogger = createTestLogger('order-service');
const paymentLogger = createTestLogger('payment-service');

// Generate correlation IDs
const generateCorrelationId = () => {
  return 'req-' + Math.random().toString(36).substr(2, 9);
};

// Simulate different types of log events
const generateRandomLogs = () => {
  const correlationId = generateCorrelationId();
  const scenarios = [
    // User authentication scenarios
    () => {
      const userId = `user-${Math.floor(Math.random() * 1000)}`;
      const success = Math.random() > 0.1; // 90% success rate
      
      authLogger.info('User login attempt', {
        event: 'auth',
        userId,
        method: 'email',
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (compatible)',
        correlationId
      });
      
      if (success) {
        authLogger.info('User login successful', {
          event: 'auth',
          userId,
          sessionId: `sess-${Math.random().toString(36).substr(2, 9)}`,
          correlationId
        });
      } else {
        authLogger.warn('User login failed', {
          event: 'auth',
          userId,
          reason: 'invalid_credentials',
          correlationId
        });
      }
    },

    // API request scenarios
    () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      const endpoints = ['/api/users', '/api/orders', '/api/products', '/api/restaurants'];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const status = Math.random() > 0.05 ? 200 : (Math.random() > 0.5 ? 404 : 500);
      const duration = Math.floor(Math.random() * 1000) + 50;
      
      mainLogger.log('http', `${method} ${endpoint} ${status} ${duration}ms`, {
        event: 'api_request',
        method,
        url: endpoint,
        status,
        duration,
        responseSize: `${(Math.random() * 10).toFixed(1)}KB`,
        correlationId
      });
    },

    // Order processing scenarios
    () => {
      const orderId = `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const customerId = `CUST-${Math.floor(Math.random() * 1000)}`;
      const total = (Math.random() * 100 + 10).toFixed(2);
      
      orderLogger.info('Order created', {
        event: 'business',
        type: 'order_created',
        orderId,
        customerId,
        total: parseFloat(total),
        items: Math.floor(Math.random() * 5) + 1,
        correlationId
      });
      
      // Simulate order status updates
      setTimeout(() => {
        orderLogger.info('Order confirmed', {
          event: 'business',
          type: 'order_confirmed',
          orderId,
          correlationId
        });
      }, Math.random() * 2000);
    },

    // Security events
    () => {
      const events = [
        { event: 'rate_limit_exceeded', level: 'warn' },
        { event: 'invalid_token', level: 'warn' },
        { event: 'suspicious_activity', level: 'error' },
        { event: 'unauthorized_access', level: 'error' }
      ];
      const secEvent = events[Math.floor(Math.random() * events.length)];
      
      authLogger.log(secEvent.level, `Security event: ${secEvent.event}`, {
        event: 'security',
        type: secEvent.event,
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        endpoint: '/api/auth/login',
        correlationId
      });
    },

    // Payment processing
    () => {
      const orderId = `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const success = Math.random() > 0.05; // 95% success rate
      const amount = (Math.random() * 100 + 10).toFixed(2);
      
      paymentLogger.info('Payment processing started', {
        event: 'payment',
        orderId,
        amount: parseFloat(amount),
        method: 'credit_card',
        correlationId
      });
      
      setTimeout(() => {
        if (success) {
          paymentLogger.info('Payment processed successfully', {
            event: 'payment',
            orderId,
            amount: parseFloat(amount),
            transactionId: `txn-${Math.random().toString(36).substr(2, 10)}`,
            correlationId
          });
        } else {
          paymentLogger.error('Payment processing failed', {
            event: 'payment',
            orderId,
            amount: parseFloat(amount),
            error: 'card_declined',
            correlationId
          });
        }
      }, Math.random() * 1500);
    },

    // Database operations
    () => {
      const operations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
      const collections = ['users', 'orders', 'products', 'restaurants'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      const collection = collections[Math.floor(Math.random() * collections.length)];
      const duration = Math.floor(Math.random() * 500) + 10;
      
      mainLogger.debug('Database operation', {
        event: 'database',
        operation,
        collection,
        duration,
        records: Math.floor(Math.random() * 100) + 1,
        correlationId
      });
    },

    // Performance metrics
    () => {
      const operations = ['data_processing', 'image_resize', 'report_generation', 'cache_refresh'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      const duration = Math.floor(Math.random() * 2000) + 100;
      
      mainLogger.info('Performance metric', {
        event: 'performance',
        operation,
        duration,
        memoryUsage: `${Math.floor(Math.random() * 30) + 50}%`,
        cpuUsage: `${Math.floor(Math.random() * 40) + 30}%`,
        correlationId
      });
    }
  ];

  // Execute a random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
};

// Generate error logs occasionally
const generateErrorLogs = () => {
  const errors = [
    'Database connection timeout',
    'External API service unavailable',
    'Invalid configuration parameter',
    'Memory allocation failed',
    'File system permission denied'
  ];
  
  const error = errors[Math.floor(Math.random() * errors.length)];
  const services = [mainLogger, authLogger, orderLogger, paymentLogger];
  const logger = services[Math.floor(Math.random() * services.length)];
  
  logger.error(error, {
    event: 'error',
    stack: `Error: ${error}\n    at Function.example (/app/src/service.js:123:45)\n    at /app/src/handler.js:67:89`,
    correlationId: generateCorrelationId()
  });
};

console.log('🚀 Starting live logging simulation...');
console.log('📊 Generating continuous log entries for testing');
console.log('📁 Log files: logs/combined.log, logs/error.log, logs/access.log, logs/security.log');
console.log('🔍 Run this in another terminal to monitor logs:');
console.log('   node scripts/log-monitor.js');
console.log('⏹️  Press Ctrl+C to stop\n');

// Generate logs continuously
const logInterval = setInterval(() => {
  // Generate 1-3 normal log entries
  const numLogs = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < numLogs; i++) {
    generateRandomLogs();
  }
  
  // Occasionally generate error logs (5% chance)
  if (Math.random() < 0.05) {
    generateErrorLogs();
  }
}, 1000); // Generate logs every second

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Stopping log generation...');
  clearInterval(logInterval);
  console.log('✅ Log generation stopped. Log files retained for monitoring.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(logInterval);
  process.exit(0);
}); 