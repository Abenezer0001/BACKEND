import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import Log from '../utils/logger';
import { JWT_SECRET } from '../config';

// Create a config object with the values we need
const config = {
  app: {
    nodeEnv: process.env.NODE_ENV || 'development'
  }
};

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Determine if error is a known AppError
  const isAppError = error instanceof AppError;
  
  // Create base error response
  const errorResponse = {
    error: {
      message: isAppError ? error.message : 'Internal Server Error',
      code: isAppError ? (error as AppError).code : 'INTERNAL_ERROR'
    }
  };

  // Add details in development mode
  if (config.app.nodeEnv !== 'production') {
    (errorResponse.error as any).stack = error.stack;
    if (isAppError && (error as AppError).details) {
      (errorResponse.error as any).details = (error as AppError).details;
    }
  }

  // Log error
  Log.error('Request Error', {
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...(isAppError ? {
        code: (error as AppError).code,
        status: (error as AppError).status,
        details: (error as AppError).details
      } : {})
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  // Send response
  res.status(isAppError ? (error as AppError).status : 500).json(errorResponse);
};

// Async error wrapper with proper TypeScript typing
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

