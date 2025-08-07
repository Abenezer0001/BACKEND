import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Authentication middleware for payment routes
 * Supports both Bearer tokens and HTTP-only cookies
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token: string | null = null;
    
    console.log('[Payment Auth] Starting authentication check');
    
    // Get token from authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('[Payment Auth] Found Bearer token in Authorization header');
    }
    
    // If no Bearer token, try to get from cookies (HTTP-only cookies)
    if (!token && ((req as any).cookies?.access_token || (req as any).cookies?.auth_token)) {
      token = (req as any).cookies.access_token || (req as any).cookies.auth_token;
      console.log('[Payment Auth] Found token in HTTP-only cookies');
    }
  
  if (!token) {
      console.log('[Payment Auth] No token found in headers or cookies');
    res.status(401).json({
      success: false,
      error: {
          message: 'Authentication required: No token found'
      }
    });
      return;
    }
    
    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
    const decoded = jwt.verify(
      token, 
      JWT_SECRET,
      {
        clockTolerance: 300, // 5 minutes clock skew tolerance
        algorithms: ['HS256'],
        ignoreExpiration: false
      }
    ) as {
      id: string;
      email: string;
      role: string;
      iat: number;
      exp: number;
      restaurantIds?: string[];
    };
    
    console.log(`[Payment Auth] Token verified successfully for user: ${decoded.id}, role: ${decoded.role}`);
    
    // Handle guest users with device IDs
    if (decoded.role === 'guest' && decoded.id.startsWith('device_')) {
      console.log('[Payment Auth] Guest user detected');
    }
  
  // Add user to request for downstream handlers
  (req as any).user = { 
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      restaurantIds: decoded.restaurantIds,
    authenticated: true 
  };
  
  next();
  } catch (error) {
    console.error('[Payment Auth] Token verification failed:', error);
    
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed - invalid or expired token'
      }
    });
    return;
  }
};
