import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus';
import logger from '../config/logger';
import { UserRole } from '../types/user';

/**
 * Middleware to check if user has access to a specific restaurant
 */
export const authorizeRestaurant = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get restaurant ID from request params or body
    let restaurantId = req.params.restaurantId || req.body.restaurantId;
    
    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Restaurant ID is required'
      });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'User authentication required'
      });
    }

    // System Admin users have access to all restaurants
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SYSTEM_ADMIN) {
      return next();
    }

    // Restaurant Admin users have access to restaurants in their business
    if (req.user.role === UserRole.RESTAURANT_ADMIN) {
      // Check if they have a businessId and validate restaurant belongs to their business
      if (req.user.businessId) {
        // This should be validated against the restaurant's businessId
        // For now, allow access and let the controller handle the business-level validation
        return next();
      } else {
        logger.warn(`Restaurant admin ${req.user.id} has no businessId`);
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          status: 'error',
          message: 'Restaurant admin must be associated with a business'
        });
      }
    }

    // For staff, check if they have access to this restaurant
    if (req.user.role === UserRole.STAFF && req.user.restaurantIds) {
      const hasAccess = req.user.restaurantIds.includes(restaurantId);
      
      if (hasAccess) {
        return next();
      }
    }

    // Access denied
    logger.warn(`Restaurant access denied: User ${req.user.id} attempted to access restaurant ${restaurantId}`);
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: 'error',
      message: 'You do not have permission to access this restaurant'
    });
  } catch (error) {
    logger.error('Error in restaurant authorization middleware:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error during authorization'
    });
  }
};
