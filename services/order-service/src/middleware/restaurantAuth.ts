import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus';
import logger from '../config/logger';
import { UserRole } from '../types/user';
import { JWTPayload } from '../../../auth-service/src/types/auth.types';

// Create a custom User interface for order service that extends JWTPayload
interface OrderServiceUser extends JWTPayload {
  id: string;           // Alias for userId for backward compatibility
  email?: string;       // Add email property that OrderController needs
  restaurantIds?: string[];
}

// Minimal Restaurant interface for this service
interface IRestaurant {
  _id: string;
  ownerId?: string;
  staff?: Array<{
    userId?: string;
  }>;
}

// Mock Restaurant model for this service - in production this would be replaced with a proper service call
const Restaurant = {
  async findById(id: string): Promise<IRestaurant | null> {
    // In a real microservice architecture, this would call the restaurant service API
    // For now, we'll return a mock response to prevent compilation errors
    logger.warn(`Restaurant.findById called with ${id} - this should be replaced with a service call`);
    return null;
  }
};

// Use AuthenticatedRequest with OrderServiceUser for proper typing
interface AuthenticatedRequest extends Request {
  user?: OrderServiceUser;
}

/**
 * Restaurant authentication middleware to verify user has access to the restaurant
 */
export const validateRestaurantAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Unauthorized: User authentication required'
      });
      return;
    }

    // Get restaurant ID from request params or body
    let restaurantId = req.params.restaurantId;
    if (!restaurantId && req.body.restaurantId) {
      restaurantId = req.body.restaurantId;
    }

    if (!restaurantId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Restaurant ID is required'
      });
      return;
    }

    // Check if user is admin/super-admin (they have access to all restaurants)
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    // For restaurant owners or staff, check if they are associated with this restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: 'Restaurant not found'
      });
      return;
    }

    // Check if user is the restaurant owner or staff member
    const isOwner = restaurant.ownerId?.toString() === req.user.userId;
    const isStaff = req.user && restaurant.staff?.some(
      (staff) => staff.userId?.toString() === req.user!.userId
    );

    if (!isOwner && !isStaff) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        status: 'error',
        message: 'Forbidden: You do not have access to this restaurant'
      });
      return;
    }

    // User has access to this restaurant
    next();
  } catch (error) {
    logger.error('Restaurant authentication error:', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error during restaurant authentication'
    });
  }
};

/**
 * Middleware to verify if the user making the request is either:
 * 1. An admin
 * 2. A staff member associated with the restaurant in the request
 */
export const requireRestaurantOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
  try {
    // Get the restaurant ID from the request parameters or body
    const restaurantId = req.params.restaurantId || req.body.restaurantId;
    
    if (!restaurantId) {
      logger.warn('Restaurant access verification failed: Missing restaurantId');
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    // Check if user is admin - admins have access to all restaurants
    if (req.user?.role === UserRole.ADMIN) {
      return next();
    }

    // Check if user is staff and has access to the restaurant
    if (req.user?.role === UserRole.STAFF && req.user.restaurantIds) {
      const hasAccess = req.user.restaurantIds.some(id => id === restaurantId);
      
      if (hasAccess) {
        return next();
      }
    }

    // If we get here, the user doesn't have access
    logger.warn(`Restaurant access denied: User ${req.user?.id} attempted to access restaurant ${restaurantId}`);
    return res.status(403).json({ error: 'You do not have permission to access this restaurant' });
  } catch (error) {
    logger.error('Error in restaurant or admin authorization middleware:', error);
    return res.status(500).json({ error: 'Internal server error during authorization' });
  }
};

/**
 * Middleware to check if user has access to multiple restaurants
 * Verifies if all restaurantIds in the request are accessible to the user
 */
export const verifyMultipleRestaurantAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract restaurant IDs from the request
    let restaurantIds: string[] = [];
    
    if (req.body?.restaurantIds && Array.isArray(req.body.restaurantIds)) {
      restaurantIds = req.body.restaurantIds;
    } else if (req.query?.restaurantIds) {
      const queryIds = req.query.restaurantIds;
      restaurantIds = Array.isArray(queryIds) 
        ? queryIds as string[]
        : [queryIds as string];
    }

    if (restaurantIds.length === 0) {
      return res.status(400).json({ error: 'Restaurant IDs are required' });
    }

    // Admin users have access to all restaurants
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // For restaurant staff, check if they have access to all specified restaurants
    if (req.user.role === UserRole.STAFF && req.user.restaurantIds) {
      const hasAccessToAll = restaurantIds.every(id => 
        req.user!.restaurantIds!.includes(id)
      );
      
      if (hasAccessToAll) {
        return next();
      }
    }

    // If we reach here, user doesn't have access to at least one restaurant
    logger.warn(`User ${req.user.id} attempted unauthorized access to restaurants: ${restaurantIds.join(', ')}`);
    return res.status(403).json({ error: 'You do not have access to one or more of the specified restaurants' });
  } catch (error) {
    logger.error('Error in multi-restaurant authentication middleware:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
}; 