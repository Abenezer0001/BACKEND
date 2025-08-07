import { Request, Response, NextFunction } from 'express';
// Use require for CommonJS modules
const passport = require('passport');
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { Secret } from 'jsonwebtoken';

// User type is now defined in /services/auth-service/src/types/express.d.ts

/**
 * Middleware to authenticate using Passport JWT strategy
 */
export const authenticateJWT = passport.authenticate('jwt', { session: false });

/**
 * Legacy middleware to authenticate JWT tokens from Authorization header
 * (Kept for backwards compatibility)
 */
export const authenticateJWTFromHeader = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new Error('Authorization header missing'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new Error('Token missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as Secret) as {
      userId: string;
      email: string;
      role: string;
      restaurantIds?: string[];
    };

    // Use type assertion to avoid TypeScript errors when assigning to req.user
    req.user = decoded as any;
    next();
  } catch (error) {
    next(new Error('Invalid or expired token'));
  }
};

/**
 * Middleware to authenticate using access token cookie
 */
export const authenticateWithCookie = (req: Request, res: Response, next: NextFunction): void => {
  console.log('[Auth Middleware] authenticateWithCookie called for:', req.method, req.url);
  console.log('[Auth Middleware] Available headers:', Object.keys(req.headers));
  console.log('[Auth Middleware] Cookie header:', req.headers.cookie);
  
  // Try multiple ways to get the token
  let token = req.cookies?.access_token || req.cookies?.auth_token;
  
  // If token not found in cookies, try to parse it manually from cookie header
  if (!token && req.headers.cookie) {
    const cookieHeader = req.headers.cookie as string;
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    console.log('[Auth Middleware] Manually parsed cookies:', cookies);
    token = cookies.access_token || cookies.auth_token;
  }
  
  // Also check Authorization header as fallback
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('[Auth Middleware] Using token from Authorization header');
  }

  if (!token) {
    console.log('[Auth Middleware] No access_token or auth_token found anywhere');
    console.log('[Auth Middleware] Available cookies:', req.cookies ? Object.keys(req.cookies) : 'no cookies object');
    return next(new Error('Authentication required'));
  }

  try {
    console.log('[Auth Middleware] Verifying access_token with JWT_SECRET');
    const decoded = jwt.verify(
      token, 
      JWT_SECRET as Secret,
      {
        // Add 5 minutes of clock skew tolerance to handle minor time differences
        clockTolerance: 300, // 5 minutes in seconds
        algorithms: ['HS256'], // Explicitly allow only HS256 algorithm
        ignoreExpiration: false // Force expiration checking
      }
    ) as {
      userId: string;
      email: string;
      role: string;
      businessId?: string;
      iat: number;
      exp: number;
      restaurantIds?: string[];
    };
    
    // Log timing info but don't enforce our own checks
    const now = Math.floor(Date.now() / 1000);
    console.log('[Auth Middleware] Token validation times:', {
      now,
      iat: decoded.iat,
      exp: decoded.exp,
      tokenAge: decoded.exp - decoded.iat,
      timeUntilExpiry: decoded.exp - now
    });

    console.log(`[Auth Middleware] Token verified successfully for user: ${decoded.userId}, role: ${decoded.role}, businessId: ${decoded.businessId || 'none'}`);

    // Handle guest users with device IDs
    if (decoded.role === 'guest' && decoded.userId.startsWith('device_')) {
      console.log('Guest user detected, returning token user data without DB lookup');
      // For guest users, we can use the token data directly without DB lookup
      req.user = decoded as any;
      return next();
    }
    
    // Use type assertion to avoid TypeScript errors when assigning to req.user
    req.user = decoded as any;
    console.log('[Auth Middleware] User set on request, calling next()');
    next();
  } catch (error) {
    // Let jwt.verify handle the actual validation
    console.error('[Auth Middleware] Token verification failed:', error);
    
    // Only extract token data for logging, not for validation
    const token_data = token.split('.')[1];
    try {
      const decoded = JSON.parse(Buffer.from(token_data, 'base64').toString());
      const now = Math.floor(Date.now() / 1000);
      
      // Log detailed time information for debugging
      console.error('[Auth Middleware] Token time details:', {
        serverTime: now,
        tokenIssued: decoded.iat,
        tokenExpires: decoded.exp,
        tokenLifespan: (decoded.exp - decoded.iat),
        tokenIssued_human: new Date(decoded.iat * 1000).toISOString(),
        tokenExpires_human: new Date(decoded.exp * 1000).toISOString(),
        serverTime_human: new Date(now * 1000).toISOString()
      });
    } catch (parseErr) {
      console.error('[Auth Middleware] Could not parse token data for logging:', parseErr);
    }
    
    // Use a generic error message that doesn't rely on our own time checks
    const authError = new Error('Authentication token invalid or expired');
    (authError as any).needsRefresh = true;
    (authError as any).statusCode = 401;
    next(authError);
  }
};

/**
 * Middleware to check for customer role
 */
export const requireCustomerRole = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new Error('Authentication required'));
  }

  // Use type assertion to handle the JWT payload structure
  const tokenUser = req.user as { userId?: string; email?: string; role?: string };
  
  if (tokenUser.role !== 'customer') {
    return next(new Error('Customer role required'));
  }

  next();
};

/**
 * Middleware to check for restaurant admin role
 */
export const requireRestaurantAdminRole = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new Error('Authentication required'));
  }

  // Use type assertion to handle the JWT payload structure
  const tokenUser = req.user as { userId?: string; email?: string; role?: string };
  
  if (tokenUser.role !== 'restaurant_admin') {
    return next(new Error('Restaurant admin role required'));
  }

  next();
};

/**
 * Middleware to check for system admin role
 */
export const requireSystemAdminRole = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    console.log('[Auth Middleware] System admin check failed: No user in request');
    const error = new Error('Authentication required');
    (error as any).statusCode = 401;
    return next(error);
  }

  // Use type assertion to handle the JWT payload structure
  const tokenUser = req.user as { userId?: string; email?: string; role?: string };
  console.log(`[Auth Middleware] Checking system admin role for user: ${tokenUser.userId}, current role: ${tokenUser.role}`);
  
  if (tokenUser.role !== 'system_admin') {
    console.log(`[Auth Middleware] System admin check failed: User has role '${tokenUser.role}' instead of 'system_admin'`);
    const error = new Error('System admin role required');
    (error as any).statusCode = 403;
    return next(error);
  }

  console.log(`[Auth Middleware] System admin role verified for user: ${tokenUser.userId}`);
  next();
};

/**
 * Middleware to check for specific roles
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      console.log('[Auth Middleware] Role check failed: No user in request');
      const error = new Error('Authentication required');
      (error as any).statusCode = 401;
      return next(error);
    }

    // Use type assertion to handle the JWT payload structure
    const tokenUser = req.user as { userId?: string; email?: string; role?: string };
    console.log(`[Auth Middleware] Checking role for user: ${tokenUser.userId}, current role: ${tokenUser.role}, required roles: ${roles.join(', ')}`);
    
    if (!roles.includes(tokenUser.role || '')) {
      console.log(`[Auth Middleware] Role check failed: User has role '${tokenUser.role}' but needs one of: ${roles.join(', ')}`);
      const error = new Error(`Required roles: ${roles.join(', ')}`);
      (error as any).statusCode = 403;
      return next(error);
    }

    console.log(`[Auth Middleware] Role verified for user: ${tokenUser.userId}`);
    next();
  };
};

/**
 * Flexible authentication middleware that checks both Bearer tokens and cookies
 * This is similar to the order service authenticateUser middleware
 */
export const authenticateFlexible = (req: Request, res: Response, next: NextFunction): void => {
  try {
    console.log(`[Auth Middleware] Authenticating request: ${req.method} ${req.path}`);
    console.log(`[Auth Middleware] Headers: ${JSON.stringify({
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      cookie: req.headers.cookie ? 'Present' : 'Missing'
    })}`);
    
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
      console.log('[Auth Middleware] Available cookies:', Object.keys(req.cookies || {}));
      console.log('[Auth Middleware] Request path:', req.path);
      console.log('[Auth Middleware] Request origin:', req.headers.origin || 'No origin');
      
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
      
      // Log timing info for better debugging
      const now = Math.floor(Date.now() / 1000);
      console.log('[Auth Middleware] Token validation times:', {
        now,
        iat: decoded.iat,
        exp: decoded.exp,
        tokenAge: decoded.exp - decoded.iat,
        timeUntilExpiry: decoded.exp - now
      });
      
      // Log token verification success
      console.log(`[Auth Middleware] Token verified for user ${decoded.userId} with role ${decoded.role}`);
      if (decoded.businessId) {
        console.log(`[Auth Middleware] User has businessId: ${decoded.businessId}`);
      }
      if (decoded.restaurantId) {
        console.log(`[Auth Middleware] User has restaurantId: ${decoded.restaurantId}`);
      }
      
      // Set the user property on the request
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('[Auth Middleware] JWT verification error:', jwtError instanceof Error ? jwtError.message : String(jwtError));
      console.log('[Auth Middleware] Token verification failed. Token may be malformed, expired, or invalid signature.');
      
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
    next(authError);
  }
}; 

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
