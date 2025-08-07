import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'inseat-secret-key-development';

/**
 * Optional authentication middleware that allows requests to proceed without authentication
 * Sets req.user if valid token is found, but doesn't throw errors if no token is present
 * This is used for endpoints that support both public and authenticated access
 */
export const authenticateOptional = (req: Request, res: Response, next: NextFunction): void => {
  try {
    console.log(`[Optional Auth Middleware] Processing request: ${req.method} ${req.path}`);
    
    let token: string | null = null;
    
    // Get token from authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('[Optional Auth Middleware] Found Bearer token in Authorization header');
    }
    
    // If no Bearer token, try to get from cookies
    if (!token && (req.cookies?.access_token || req.cookies?.auth_token)) {
      token = req.cookies.access_token || req.cookies.auth_token;
      console.log('[Optional Auth Middleware] Found token in cookies');
    }
    
    if (!token) {
      console.log('[Optional Auth Middleware] No token found - allowing public access');
      // No token found, but allow request to continue without authentication
      return next();
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
        roles: string[];
        businessId?: string;
        restaurantId?: string;
      };
      
      console.log('[Optional Auth Middleware] Token verified successfully');
      console.log('[Optional Auth Middleware] User role:', decoded.role);
      console.log('[Optional Auth Middleware] User ID:', decoded.userId);
      
      // Set user info on request object
      (req as any).user = {
        id: decoded.userId,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        roles: decoded.roles || [decoded.role],
        businessId: decoded.businessId,
        restaurantId: decoded.restaurantId
      };
      
      console.log('[Optional Auth Middleware] Authentication successful, user info set');
      next();
    } catch (tokenError) {
      console.log('[Optional Auth Middleware] Invalid token found - allowing public access');
      console.log('[Optional Auth Middleware] Token error:', tokenError instanceof Error ? tokenError.message : 'Unknown error');
      // Invalid token, but allow request to continue without authentication
      next();
    }
  } catch (error) {
    console.error('[Optional Auth Middleware] Unexpected error:', error);
    // Even on unexpected errors, allow request to continue without authentication
    next();
  }
};