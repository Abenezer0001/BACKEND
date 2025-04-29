import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP_STATUS } from '../constants/httpStatus';
import logger from '../utils/logger';

// Extend Express User interface to include our custom properties
declare global {
  namespace Express {
    // Extend the User interface instead of Request
    interface User {
      id: string;
      email: string;
      role: string;
      restaurantIds?: string[];
    }
  }
}

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  restaurantIds?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Authentication middleware to verify user is logged in
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Unauthorized: Authentication token is required'
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Unauthorized: Authentication token is required'
      });
      return;
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey') as TokenPayload;
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      restaurantIds: decoded.restaurantIds
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      status: 'error',
      message: 'Unauthorized: Invalid authentication token'
    });
  }
};

/**
 * Middleware to verify admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      logger.warn('Admin authorization failed: No user found in request');
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      logger.warn(`Admin authorization failed: User ${req.user.id} with role ${req.user.role} attempted admin access`);
      res.status(403).json({ error: 'Admin privileges required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in admin authorization middleware:', error);
    res.status(500).json({ error: 'Internal server error during authorization' });
  }
};

/**
 * Middleware to verify staff or admin role
 */
export const requireStaffOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      logger.warn('Staff/Admin authorization failed: No user found in request');
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if user has staff or admin role
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      logger.warn(`Staff/Admin authorization failed: User ${req.user.id} with role ${req.user.role} attempted staff/admin access`);
      res.status(403).json({ error: 'Staff or admin privileges required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in staff/admin authorization middleware:', error);
    res.status(500).json({ error: 'Internal server error during authorization' });
  }
}; 