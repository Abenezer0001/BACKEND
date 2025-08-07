import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Validation middleware for analytics endpoints
 */

/**
 * Validates date range parameters
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;

  if (startDate && !isValidDate(startDate as string)) {
    return res.status(400).json({
      error: 'Invalid startDate',
      message: 'startDate must be in YYYY-MM-DD format'
    });
  }

  if (endDate && !isValidDate(endDate as string)) {
    return res.status(400).json({
      error: 'Invalid endDate',
      message: 'endDate must be in YYYY-MM-DD format'
    });
  }

  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (start > end) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'startDate must be before or equal to endDate'
      });
    }

    // Prevent excessive date ranges (more than 2 years)
    const maxDays = 365 * 2; // 2 years
    const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffInDays > maxDays) {
      return res.status(400).json({
        error: 'Date range too large',
        message: `Date range cannot exceed ${maxDays} days`
      });
    }
  }

  next();
};

/**
 * Validates restaurant IDs parameter
 */
export const validateRestaurantIds = (req: Request, res: Response, next: NextFunction) => {
  const { restaurantIds } = req.query;

  if (restaurantIds) {
    const ids = (restaurantIds as string).split(',');
    
    // Check if all IDs are valid ObjectIds
    for (const id of ids) {
      const trimmedId = id.trim();
      if (!mongoose.Types.ObjectId.isValid(trimmedId)) {
        return res.status(400).json({
          error: 'Invalid restaurant ID',
          message: `'${trimmedId}' is not a valid restaurant ID`
        });
      }
    }

    // Limit the number of restaurant IDs to prevent performance issues
    if (ids.length > 50) {
      return res.status(400).json({
        error: 'Too many restaurant IDs',
        message: 'Maximum 50 restaurant IDs are allowed'
      });
    }
  }

  next();
};

/**
 * Validates pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;

  if (page && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
    return res.status(400).json({
      error: 'Invalid page number',
      message: 'page must be a positive integer'
    });
  }

  if (limit && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    return res.status(400).json({
      error: 'Invalid limit',
      message: 'limit must be a positive integer between 1 and 100'
    });
  }

  next();
};

/**
 * Validates period parameter for analytics endpoints
 */
export const validatePeriod = (req: Request, res: Response, next: NextFunction) => {
  const { period } = req.query;

  if (period) {
    const validPeriods = ['7d', '30d', '90d', '1y'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({
        error: 'Invalid period',
        message: `period must be one of: ${validPeriods.join(', ')}`
      });
    }
  }

  next();
};

/**
 * Validates sort parameters
 */
export const validateSort = (req: Request, res: Response, next: NextFunction) => {
  const { sortBy, sortOrder } = req.query;

  if (sortOrder && !['asc', 'desc'].includes(sortOrder as string)) {
    return res.status(400).json({
      error: 'Invalid sortOrder',
      message: 'sortOrder must be either "asc" or "desc"'
    });
  }

  // Validate sortBy based on the endpoint
  if (sortBy) {
    const validSortFields = ['name', 'totalSales', 'orders', 'revenue', 'processingTime'];
    if (!validSortFields.includes(sortBy as string)) {
      return res.status(400).json({
        error: 'Invalid sortBy field',
        message: `sortBy must be one of: ${validSortFields.join(', ')}`
      });
    }
  }

  next();
};

/**
 * Validates business ID parameter
 */
export const validateBusinessId = (req: Request, res: Response, next: NextFunction) => {
  const { businessId } = req.query;

  if (businessId && !mongoose.Types.ObjectId.isValid(businessId as string)) {
    return res.status(400).json({
      error: 'Invalid business ID',
      message: 'businessId must be a valid ObjectId'
    });
  }

  next();
};

/**
 * Rate limiting middleware (simple implementation)
 */
export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const clients = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const client = clients.get(clientIp);
    
    if (!client || now > client.resetTime) {
      clients.set(clientIp, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (client.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil((client.resetTime - now) / 1000)
      });
    }
    
    client.count++;
    next();
  };
};

/**
 * Helper function to validate date format
 */
function isValidDate(dateString: string): boolean {
  // Check if date matches YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
}

/**
 * General error handler middleware
 */
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Analytics Error] ${req.method} ${req.path}:`, error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      details: error.errors
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'The provided ID is not in the correct format'
    });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: error.message || 'An error occurred',
      message: error.details || 'Please try again later'
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};