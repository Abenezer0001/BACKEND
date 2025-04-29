import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { Secret } from 'jsonwebtoken';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        restaurantIds?: string[];
      };
    }
  }
}

/**
 * Middleware to authenticate using Passport JWT strategy
 */
export const authenticateJWT = passport.authenticate('jwt', { session: false });

/**
 * Legacy middleware to authenticate JWT tokens from Authorization header
 * (Kept for backwards compatibility)
 */
export const authenticateJWTFromHeader = (req: Request, res: Response, next: NextFunction) => {
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
      id: string;
      email: string;
      role: string;
      restaurantIds?: string[];
    };

    req.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid or expired token'));
  }
};

/**
 * Middleware to authenticate using access token cookie
 */
export const authenticateWithCookie = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.access_token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(
      token, 
      process.env.ACCESS_TOKEN_SECRET as Secret || 'your_access_token_secret_here'
    ) as {
      id: string;
      email: string;
      role: string;
      restaurantIds?: string[];
    };

    req.user = decoded;
    next();
  } catch (error) {
    // If access token is expired, pass an error indicating refresh is needed
    const authError = new Error('Access token expired');
    (authError as any).needsRefresh = true;
    next(authError);
  }
};

/**
 * Middleware to check for customer role
 */
export const requireCustomerRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new Error('Authentication required'));
  }

  if (req.user.role !== 'customer') {
    return next(new Error('Customer role required'));
  }

  next();
};

/**
 * Middleware to check for restaurant admin role
 */
export const requireRestaurantAdminRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new Error('Authentication required'));
  }

  if (req.user.role !== 'restaurant_admin') {
    return next(new Error('Restaurant admin role required'));
  }

  next();
};

/**
 * Middleware to check for system admin role
 */
export const requireSystemAdminRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new Error('Authentication required'));
  }

  if (req.user.role !== 'system_admin') {
    return next(new Error('System admin role required'));
  }

  next();
}; 