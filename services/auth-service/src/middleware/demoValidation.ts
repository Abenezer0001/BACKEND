import { Request, Response, NextFunction } from 'express';
import { Log } from '../utils/logger';

/**
 * Validation middleware for demo account creation
 */
export const validateDemoAccountRequest = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req as any).correlationId;
  
  try {
    const { restaurantName, businessEmail } = req.body;
    
    // Check required fields
    const missingFields: string[] = [];
    
    if (!restaurantName) {
      missingFields.push('restaurantName');
    }
    
    if (!businessEmail) {
      missingFields.push('businessEmail');
    }
    
    if (missingFields.length > 0) {
      Log.warn('Demo account validation failed - missing fields', {
        missingFields,
        correlationId
      });
      
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields,
        details: 'restaurantName and businessEmail are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(businessEmail)) {
      Log.warn('Demo account validation failed - invalid email format', {
        businessEmail,
        correlationId
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }
    
    // Validate restaurant name length
    if (restaurantName.length < 2 || restaurantName.length > 100) {
      Log.warn('Demo account validation failed - invalid restaurant name length', {
        restaurantNameLength: restaurantName.length,
        correlationId
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant name',
        details: 'Restaurant name must be between 2 and 100 characters'
      });
    }
    
    // Sanitize inputs
    req.body.restaurantName = restaurantName.trim();
    req.body.businessEmail = businessEmail.trim().toLowerCase();
    
    Log.info('Demo account request validation passed', {
      restaurantName: req.body.restaurantName,
      businessEmail: req.body.businessEmail,
      correlationId
    });
    
    next();
    
  } catch (error) {
    Log.error('Error in demo account validation middleware', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      correlationId
    });
    
    res.status(500).json({
      success: false,
      error: 'Validation error',
      details: 'An error occurred while validating the request'
    });
  }
};

/**
 * Rate limiting middleware for demo account creation
 */
export const rateLimitDemoRequests = (() => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  const MAX_REQUESTS_PER_HOUR = 5;
  const HOUR_IN_MS = 60 * 60 * 1000;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req as any).correlationId;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body.businessEmail;
    const key = `${clientIP}:${email}`;
    
    const now = Date.now();
    const clientData = requestCounts.get(key);
    
    if (!clientData || now > clientData.resetTime) {
      // First request or time window has reset
      requestCounts.set(key, { count: 1, resetTime: now + HOUR_IN_MS });
      
      Log.info('Demo request rate limit - new window started', {
        key,
        correlationId
      });
      
      return next();
    }
    
    if (clientData.count >= MAX_REQUESTS_PER_HOUR) {
      const resetTimeRemaining = Math.ceil((clientData.resetTime - now) / 1000 / 60); // minutes
      
      Log.warn('Demo request rate limit exceeded', {
        key,
        count: clientData.count,
        resetTimeRemaining,
        correlationId
      });
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        details: `Too many demo requests. Please try again in ${resetTimeRemaining} minutes.`,
        retryAfterMinutes: resetTimeRemaining
      });
    }
    
    // Increment counter
    clientData.count++;
    requestCounts.set(key, clientData);
    
    Log.info('Demo request rate limit - request counted', {
      key,
      count: clientData.count,
      remaining: MAX_REQUESTS_PER_HOUR - clientData.count,
      correlationId
    });
    
    next();
  };
})();

/**
 * Security headers middleware for demo endpoints
 */
export const addDemoSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove potentially revealing headers
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Logging middleware for demo requests
 */
export const logDemoRequest = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req as any).correlationId;
  const startTime = Date.now();
  
  Log.info('Demo request started', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    correlationId
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    Log.info('Demo request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      correlationId
    });
  });
  
  next();
};