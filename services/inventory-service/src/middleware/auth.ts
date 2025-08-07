import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extended Request interface to include user property
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    roles: string[];
    businessId?: string;
    restaurantId?: string;
    iat: number;
    exp: number;
  };
}

/**
 * Flexible authentication middleware that checks both Bearer tokens and cookies
 */
export const authenticateFlexible = (req: Request, res: Response, next: NextFunction): void => {
  try {
    console.log(`[Auth Middleware] Authenticating request: ${req.method} ${req.path}`);
    
    let token: string | null = null;
    
    // Get token from authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('[Auth Middleware] Found Bearer token in Authorization header');
    }
    
    // If no Bearer token, try to get from cookies
    if (!token && (req.cookies?.access_token || req.cookies?.auth_token)) {
      token = req.cookies.access_token || req.cookies.auth_token;
      console.log('[Auth Middleware] Found token in cookies');
    }
    
    if (!token) {
      console.log('[Auth Middleware] No token found in headers or cookies');
      const error = new Error('Authentication required: No token found');
      (error as any).statusCode = 401;
      return next(error);
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
        iat: number;
        exp: number;
      };
      
      console.log(`[Auth Middleware] Token verified for user ${decoded.userId} with role ${decoded.role}`);
      
      // Set the user property on the request
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('[Auth Middleware] JWT verification error:', jwtError instanceof Error ? jwtError.message : String(jwtError));
      
      const authError = new Error(`Invalid or expired token: ${jwtError instanceof Error ? jwtError.message : String(jwtError)}`);
      (authError as any).statusCode = 401;
      (authError as any).needsRefresh = true;
      return next(authError);
    }
  } catch (error) {
    console.error('[Auth Middleware] Unexpected error during flexible authentication:', error);
    const authError = new Error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    (authError as any).statusCode = 401;
    (authError as any).needsRefresh = true;
    return next(authError);
  }
}; 