// Use require for CommonJS modules
const winston = require('winston');
// Import the config module
import * as configModule from '../config';
// Import centralized logger configuration
import { createServiceLogger } from '../../../../src/config/logger';

// Create a config object with needed properties
const config = {
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'combined'
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development'
  }
};

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat
    }),
    // Write all logs with level 'error' to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat
    })
  ]
});

// Add Morgan-style HTTP request logging in development
if (config.app.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create auth service specific logger
const authLogger = createServiceLogger('auth-service');

// Export structured logging interface for auth service
export const Log = {
  error: (message: string, meta?: any) => {
    authLogger.error(message, meta);
  },
  
  warn: (message: string, meta?: any) => {
    authLogger.warn(message, meta);
  },
  
  info: (message: string, meta?: any) => {
    authLogger.info(message, meta);
  },
  
  debug: (message: string, meta?: any) => {
    authLogger.debug(message, meta);
  },
  
  http: (message: string, meta?: any) => {
    authLogger.http(message, meta);
  },

  // Auth-specific logging methods
  auth: {
    login: (userId: string, method: string, success: boolean, meta?: any) => {
      authLogger.auth(`User login ${success ? 'successful' : 'failed'}`, {
        userId,
        method,
        success,
        ...meta
      });
    },

    logout: (userId: string, meta?: any) => {
      authLogger.auth('User logout', {
        userId,
        ...meta
      });
    },

    registration: (email: string, success: boolean, meta?: any) => {
      authLogger.auth(`User registration ${success ? 'successful' : 'failed'}`, {
        email,
        success,
        ...meta
      });
    },

    passwordReset: (email: string, success: boolean, meta?: any) => {
      authLogger.auth(`Password reset ${success ? 'initiated' : 'failed'}`, {
        email,
        success,
        ...meta
      });
    },

    tokenRefresh: (userId: string, success: boolean, meta?: any) => {
      authLogger.auth(`Token refresh ${success ? 'successful' : 'failed'}`, {
        userId,
        success,
        ...meta
      });
    }
  },

  security: {
    rateLimitExceeded: (ip: string, endpoint: string, meta?: any) => {
      authLogger.security('Rate limit exceeded', {
        ip,
        endpoint,
        ...meta
      });
    },

    invalidToken: (type: string, meta?: any) => {
      authLogger.security(`Invalid token detected: ${type}`, {
        tokenType: type,
        ...meta
      });
    },

    suspiciousActivity: (event: string, meta?: any) => {
      authLogger.security(`Suspicious activity: ${event}`, {
        event,
        ...meta
      });
    }
  },

  email: {
    sent: (to: string, template: string, meta?: any) => {
      authLogger.info('Email sent', {
        event: 'email_sent',
        recipient: to,
        template,
        ...meta
      });
    },

    failed: (to: string, template: string, error: any, meta?: any) => {
      authLogger.error('Email sending failed', {
        event: 'email_failed',
        recipient: to,
        template,
        error: error.message || error,
        ...meta
      });
    }
  },

  permission: {
    granted: (userId: string, permission: string, resource?: string, meta?: any) => {
      authLogger.info('Permission granted', {
        event: 'permission_granted',
        userId,
        permission,
        resource,
        ...meta
      });
    },

    denied: (userId: string, permission: string, resource?: string, meta?: any) => {
      authLogger.warn('Permission denied', {
        event: 'permission_denied',
        userId,
        permission,
        resource,
        ...meta
      });
    },

    roleAssigned: (userId: string, role: string, assignedBy: string, meta?: any) => {
      authLogger.info('Role assigned', {
        event: 'role_assigned',
        userId,
        role,
        assignedBy,
        ...meta
      });
    }
  }
};

// Export auth logger for direct access if needed
export { authLogger };

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    authLogger.http(message.trim());
  },
};

// Add middleware for HTTP request logging
export const httpLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  next();
};

export default Log;

