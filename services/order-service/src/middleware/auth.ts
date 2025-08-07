import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { HTTP_STATUS } from '../constants/httpStatus';
import logger from '../utils/logger';
import { JWTPayload } from '../../../auth-service/src/types/auth.types';

// Create a custom User interface for order service that extends JWTPayload
interface OrderServiceUser extends JWTPayload {
  id: string;           // Alias for userId for backward compatibility
  email?: string;       // Add email property that OrderController needs
  restaurantIds?: string[];
}

// AuthenticatedRequest with our custom User interface
interface AuthenticatedRequest extends Request {
  user?: OrderServiceUser;
}

interface TokenPayload {
  id?: string;           // Some tokens might use 'id'
  userId?: string;       // Auth service uses 'userId'
  email: string;
  role: string;
  roles?: string[];
  businessId?: string;
  restaurantId?: string;
  restaurantIds?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Authentication middleware to verify user is logged in
 */
export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    let token: string | null = null;
    
    // Get token from authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If no Bearer token, try to get from cookies
    if (!token && ((req as any).cookies?.access_token || (req as any).cookies?.auth_token)) {
      token = (req as any).cookies.access_token || (req as any).cookies.auth_token;
      console.log('Using token from cookies');
    }
    
    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Unauthorized: Authentication token is required'
      });
      return;
    }
    
    // Verify token - use the same default as auth service for consistency
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production') as TokenPayload;
    
    // Extract user ID from either 'userId' or 'id' field
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.error('No user ID found in token payload:', JSON.stringify(decoded, null, 2));
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Unauthorized: Invalid token payload - missing user ID'
      });
      return;
    }
    
    // Log user information
    console.log(`Auth middleware - User ID from token: ${userId}, Email: ${decoded.email}, Role: ${decoded.role}`);
    
    // Check if this is a guest user ID (device_*) - we should keep these as is
    const isGuestId = typeof userId === 'string' && userId.startsWith('device_');
    
    if (!isGuestId && !mongoose.Types.ObjectId.isValid(userId)) {
      // Only for non-guest users who have invalid ObjectIds, we log this issue
      console.log(`Warning: Non-guest user has invalid ObjectId: ${userId}`);
    } else {
      console.log(`User ID is valid: ${userId}, isGuestId: ${isGuestId}`);
    }
    
    // Attach user info to request
    req.user = {
      userId: userId,
      id: userId,           // Alias for backward compatibility with OrderController
      email: decoded.email,
      role: decoded.role,
      businessId: decoded.businessId,
      restaurantId: decoded.restaurantId,
      restaurantIds: decoded.restaurantIds,
      roles: decoded.roles || [decoded.role]     // Use decoded roles or fallback to single role
    } as OrderServiceUser;
    
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
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
export const requireStaffOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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