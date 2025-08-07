import { Request, Response, NextFunction } from 'express';
import Log from '../utils/logger';

interface ExtendedRequest extends Request {
  id?: string;
  startTime?: number;
}

interface ResponseError extends Error {
  status?: number;
}

export const apiLogger = (excludePaths: string[] = []) => {
  return (req: ExtendedRequest, res: Response, next: NextFunction) => {
    // Skip logging for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Generate request ID
    req.id = Math.random().toString(36).substring(7);
    req.startTime = Date.now();

    // Log request
    Log.info('API Request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      query: req.query,
      body: sanitizeBody(req.body),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Capture original send
    const originalSend = res.send;

    // Override send
    res.send = function(body): Response {
      // Restore send
      res.send = originalSend;

      // Log response
      const duration = Date.now() - (req.startTime || 0);
      Log.info('API Response', {
        requestId: req.id,
        statusCode: res.statusCode,
        duration,
        body: sanitizeResponse(body)
      });

      // Call original send
      return originalSend.call(this, body);
    };

    // Error handling
    const errorHandler = (error: ResponseError) => {
      Log.error('API Error', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        statusCode: error.status || 500,
        error: {
          message: error.message,
          stack: error.stack
        },
        duration: Date.now() - (req.startTime || 0)
      });
    };

    res.on('error', errorHandler);
    next();
  };
};

// Sanitize sensitive information from request body
function sanitizeBody(body: any): any {
  if (!body) return body;

  const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Sanitize sensitive information from response
function sanitizeResponse(body: any): any {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return body;
    }
  }

  if (!body) return body;

  const sensitiveFields = ['token', 'secret', 'password'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Specific API logging middleware for auth endpoints
export const authApiLogger = apiLogger(['/health', '/metrics']);

// Usage example in app.ts:
/*
import { authApiLogger } from './middleware/apiLogger';

// Apply logger to auth routes
app.use('/api/auth', authApiLogger);
*/

