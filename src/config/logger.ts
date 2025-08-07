import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Custom format that includes service metadata
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'service', 'correlationId']
  }),
  winston.format.printf(({ timestamp, level, message, service, correlationId, stack, metadata }) => {
    const baseInfo = `${timestamp} [${level.toUpperCase()}] [${service || 'MAIN'}]`;
    const corrId = correlationId ? ` [${correlationId}]` : '';
    const metaStr = Object.keys(metadata || {}).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
    
    if (stack) {
      return `${baseInfo}${corrId}: ${message}\n${stack}${metaStr}`;
    }
    return `${baseInfo}${corrId}: ${message}${metaStr}`;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, service, correlationId, stack }) => {
    const serviceTag = service ? `[${service}]` : '[MAIN]';
    const corrTag = correlationId ? `[${typeof correlationId === 'string' ? correlationId.slice(-8) : correlationId}]` : '';
    if (stack) {
      return `${timestamp} ${level} ${serviceTag}${corrTag}: ${message}\n${stack}`;
    }
    return `${timestamp} ${level} ${serviceTag}${corrTag}: ${message}`;
  })
);

// Define transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: logLevel,
    format: isDevelopment ? consoleFormat : customFormat,
    silent: process.env.SILENT_LOGS === 'true'
  }),

  // Combined logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    tailable: true
  }),

  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  }),

  // HTTP access logs
  new winston.transports.File({
    filename: path.join(logsDir, 'access.log'),
    level: 'http',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 10,
    tailable: true
  }),

  // Security logs
  new winston.transports.File({
    filename: path.join(logsDir, 'security.log'),
    level: 'warn',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    tailable: true
  }),

  // Application events log
  new winston.transports.File({
    filename: path.join(logsDir, 'app-events.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    tailable: true
  })
];

// Create the main logger
const logger = winston.createLogger({
  levels: logLevels,
  level: logLevel,
  format: customFormat,
  transports,
  exitOnError: false,
  defaultMeta: {
    service: 'inseat-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
    hostname: require('os').hostname()
  }
});

// Request correlation middleware
interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

export const correlationMiddleware = (req: any, res: any, next: any) => {
  req.correlationId = req.headers['x-correlation-id'] || randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

// Enhanced logger with correlation ID support
class EnhancedLogger {
  private baseLogger: winston.Logger;
  private context: Record<string, any> = {};

  constructor(baseLogger: winston.Logger, service?: string) {
    this.baseLogger = baseLogger;
    if (service) {
      this.context.service = service;
    }
  }

  private log(level: string, message: string, meta: any = {}, correlationId?: string) {
    const logMeta = {
      ...this.context,
      ...meta,
      ...(correlationId && { correlationId })
    };
    
    this.baseLogger.log(level, message, logMeta);
  }

  error(message: string, meta: any = {}, correlationId?: string) {
    this.log('error', message, meta, correlationId);
  }

  warn(message: string, meta: any = {}, correlationId?: string) {
    this.log('warn', message, meta, correlationId);
  }

  info(message: string, meta: any = {}, correlationId?: string) {
    this.log('info', message, meta, correlationId);
  }

  http(message: string, meta: any = {}, correlationId?: string) {
    this.log('http', message, meta, correlationId);
  }

  debug(message: string, meta: any = {}, correlationId?: string) {
    this.log('debug', message, meta, correlationId);
  }

  trace(message: string, meta: any = {}, correlationId?: string) {
    this.log('trace', message, meta, correlationId);
  }

  // Specialized logging methods
  security(event: string, meta: any = {}, correlationId?: string) {
    this.warn(`SECURITY: ${event}`, { event: 'security', ...meta }, correlationId);
  }

  auth(event: string, meta: any = {}, correlationId?: string) {
    this.info(`AUTH: ${event}`, { event: 'auth', ...meta }, correlationId);
  }

  api(method: string, url: string, status: number, duration: number, meta: any = {}, correlationId?: string) {
    this.http(`${method} ${url} ${status} ${duration}ms`, {
      event: 'api_request',
      method,
      url,
      status,
      duration,
      ...meta
    }, correlationId);
  }

  database(operation: string, collection: string, meta: any = {}, correlationId?: string) {
    this.debug(`DB: ${operation} on ${collection}`, {
      event: 'database',
      operation,
      collection,
      ...meta
    }, correlationId);
  }

  performance(operation: string, duration: number, meta: any = {}, correlationId?: string) {
    this.info(`PERF: ${operation} took ${duration}ms`, {
      event: 'performance',
      operation,
      duration,
      ...meta
    }, correlationId);
  }

  business(event: string, meta: any = {}, correlationId?: string) {
    this.info(`BUSINESS: ${event}`, { event: 'business', ...meta }, correlationId);
  }

  // Create a child logger with additional context
  child(context: Record<string, any>) {
    const childLogger = new EnhancedLogger(this.baseLogger, this.context.service);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }
}

// Create service-specific loggers
export const createServiceLogger = (service: string) => {
  return new EnhancedLogger(logger, service);
};

// Main application logger
export const mainLogger = new EnhancedLogger(logger, 'main');

// Export for backward compatibility
export const Log = {
  error: (message: string, meta?: any) => mainLogger.error(message, meta),
  warn: (message: string, meta?: any) => mainLogger.warn(message, meta),
  info: (message: string, meta?: any) => mainLogger.info(message, meta),
  debug: (message: string, meta?: any) => mainLogger.debug(message, meta),
  http: (message: string, meta?: any) => mainLogger.http(message, meta),
  security: (event: string, meta?: any) => mainLogger.security(event, meta),
  auth: (event: string, meta?: any) => mainLogger.auth(event, meta),
  api: (method: string, url: string, status: number, duration: number, meta?: any) => 
    mainLogger.api(method, url, status, duration, meta),
  database: (operation: string, collection: string, meta?: any) => 
    mainLogger.database(operation, collection, meta),
  performance: (operation: string, duration: number, meta?: any) => 
    mainLogger.performance(operation, duration, meta),
  business: (event: string, meta?: any) => mainLogger.business(event, meta)
};

// HTTP request logging middleware
export const httpLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const correlationId = req.correlationId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    mainLogger.api(
      req.method,
      req.originalUrl || req.url,
      res.statusCode,
      duration,
      {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        contentLength: res.get('Content-Length'),
        userId: req.user?.id
      },
      correlationId
    );
  });

  next();
};

// Express winston integration for automatic request logging
export const expressWinston = {
  logger: winston.createLogger({
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'requests.log'),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5
      })
    ],
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false
};

// Stream for morgan integration
export const stream = {
  write: (message: string) => {
    mainLogger.http(message.trim());
  }
};

// Export the base logger and enhanced logger
export { logger, EnhancedLogger };
export default mainLogger; 