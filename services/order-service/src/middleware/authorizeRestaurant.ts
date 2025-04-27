import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus';

/**
 * Middleware to authorize restaurant access
 * Checks if the authenticated user has access to the specified restaurant
 */
export const authorizeRestaurant = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get restaurant ID from params
    const restaurantId = req.params.restaurantId || req.body.restaurantId;
    
    if (!restaurantId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Restaurant ID is required'
      });
      return;
    }

    // Check if user is authenticated and has access to this restaurant
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated'
      });
      return;
    }

    // For admin users, allow access to all restaurants
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // For restaurant staff, check if they have access to this specific restaurant
    if (req.user.role === 'staff' && req.user.restaurantIds) {
      if (req.user.restaurantIds.includes(restaurantId)) {
        next();
        return;
      }
    }

    // Access denied
    res.status(HTTP_STATUS.FORBIDDEN).json({
      status: 'error',
      message: 'Forbidden: You do not have access to this restaurant'
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Server error while authorizing restaurant access'
    });
  }
};
