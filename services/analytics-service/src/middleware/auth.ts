import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Secret } from 'jsonwebtoken';

// JWT Secret - in production this should come from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Flexible authentication middleware for analytics service
 * Supports both Bearer tokens and cookies for authentication
 */
export const authenticateAnalytics = (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[Analytics Auth] Authenticating request: ${req.method} ${req.path}`);
    
    let token: string | null = null;
    
    // Get token from authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('[Analytics Auth] Found Bearer token in Authorization header');
    }
    
    // If no Bearer token, try to get from cookies
    if (!token && (req.cookies?.access_token || req.cookies?.auth_token)) {
      token = req.cookies.access_token || req.cookies.auth_token;
      console.log('[Analytics Auth] Found token in cookies');
    }
    
    if (!token) {
      console.log('[Analytics Auth] No authentication token found');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }
    
    try {
      const decoded = jwt.verify(
        token, 
        JWT_SECRET as Secret,
        {
          clockTolerance: 300, // 5 minutes in seconds
          algorithms: ['HS256'],
          ignoreExpiration: false
        }
      ) as {
        userId: string;
        email: string;
        role: string;
        roles?: string[];
        businessId?: string;
        restaurantId?: string;
        iat: number;
        exp: number;
      };
      
      console.log(`[Analytics Auth] Token verified for user ${decoded.userId} with role ${decoded.role}`);
      
      // Set the user property on the request
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('[Analytics Auth] JWT verification error:', jwtError instanceof Error ? jwtError.message : String(jwtError));
      
      return res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please login again to get a valid token'
      });
    }
  } catch (error) {
    console.error('[Analytics Auth] Unexpected authentication error:', error);
    return res.status(500).json({
      error: 'Authentication service error',
      message: 'An unexpected error occurred during authentication'
    });
  }
};

/**
 * Role-based authorization middleware for analytics endpoints
 * Allows system_admin, restaurant_admin, and business_admin roles
 */
export const authorizeAnalytics = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User not authenticated'
    });
  }

  const user = req.user as { userId: string; role: string; businessId?: string; restaurantId?: string };
  const allowedRoles = ['system_admin', 'restaurant_admin', 'business_admin'];
  
  console.log(`[Analytics Auth] Checking authorization for user ${user.userId} with role ${user.role}`);
  
  if (!allowedRoles.includes(user.role)) {
    console.log(`[Analytics Auth] Access denied for role: ${user.role}`);
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'You do not have permission to access analytics data',
      requiredRoles: allowedRoles
    });
  }

  console.log(`[Analytics Auth] Authorization successful for user ${user.userId}`);
  next();
};

/**
 * Business scope validation middleware
 * Ensures users can only access data from their own business
 */
export const validateBusinessScope = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as { userId: string; role: string; businessId?: string };
  
  // System admins can access any business data
  if (user.role === 'system_admin') {
    console.log('[Analytics Auth] System admin - skipping business scope validation');
    return next();
  }

  // For non-system admins, require businessId
  if (!user.businessId) {
    console.log(`[Analytics Auth] User ${user.userId} missing businessId for role ${user.role}`);
    return res.status(403).json({
      error: 'Business access required',
      message: 'Your account is not associated with a business'
    });
  }

  console.log(`[Analytics Auth] Business scope validated for user ${user.userId}, businessId ${user.businessId}`);
  next();
};