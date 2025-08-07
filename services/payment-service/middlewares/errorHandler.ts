import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware for the payment service
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Payment Service Error:', err);
  
  // Default error status and message
  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred in the payment service';
  
  // Return error response
  res.status(status).json({
    error: {
      message,
      status,
    }
  });
};
