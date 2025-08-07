import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions, VerifyCallback } from 'passport-jwt';
import { Request } from 'express';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User, { IUser } from '../models/user.model';
import { Document, Types } from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import JWT_SECRET from config to ensure consistency
import { JWT_SECRET } from '../config';

// Enhanced token extraction with debug logging
const tokenExtractors = [
  // Extract from cookie first (for browser clients)
  (req) => {
    let token = null;
    if (req && req.cookies) {
      token = req.cookies['access_token'];
      if (process.env.NODE_ENV !== 'production') {
        console.log('[JWT Debug] Cookie token extraction attempt:', 
          token ? 'Token found in cookies' : 'No token in cookies');
      }
    }
    return token;
  },
  // Fallback to Authorization Bearer token (for API clients)
  (req) => {
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[JWT Debug] Bearer token extraction attempt:', 
          token ? 'Token found in Authorization header' : 'No token in Authorization header');
      }
    }
    
    return token;
  }
];

// JWT options with consistent secret and enhanced debugging
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors(tokenExtractors),
  secretOrKey: JWT_SECRET, // Use imported JWT_SECRET for consistency
  passReqToCallback: true  // Pass request to callback for better debugging
};

// Configure JWT strategy with proper types and enhanced debugging
// Custom type for the callback with request parameter for passReqToCallback: true
type JwtVerifyCallbackWithRequest = (
  req: Request,
  jwtPayload: any,
  done: (error: any, user?: any, info?: any) => void
) => void;

const verifyCallback: JwtVerifyCallbackWithRequest = async (req, jwtPayload, done) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[JWT Debug] Verifying token payload:', {
        id: jwtPayload.id,
        userId: jwtPayload.userId,
        email: jwtPayload.email,
        role: jwtPayload.role,
        businessId: jwtPayload.businessId,
        iat: jwtPayload.iat,
        exp: jwtPayload.exp
      });
      
      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (jwtPayload.exp && jwtPayload.exp < now) {
        console.log('[JWT Debug] Token expired:', { 
          expiry: new Date(jwtPayload.exp * 1000).toISOString(),
          now: new Date(now * 1000).toISOString(),
          diff: (now - jwtPayload.exp) + ' seconds'
        });
      }
    }

    // Handle both 'id' and 'userId' field names for backward compatibility
    const userId = jwtPayload.userId || jwtPayload.id;
    
    if (!userId) {
      console.log('[JWT Debug] No user ID found in token payload');
      return done(null, false);
    }

    // Find user in database
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[JWT Debug] User not found in database:', userId);
      return done(null, false);
    }
    
    // Log successful verification
    if (process.env.NODE_ENV !== 'production') {
      console.log('[JWT Debug] User authenticated successfully:', {
        id: user._id,
        email: user.email,
        role: user.role,
        businessId: user.businessId
      });
    }
    
    // Return the user with token payload merged (to preserve role from token)
    const authenticatedUser = {
      ...user.toObject(),
      // Ensure token claims are preserved in req.user
      id: userId,
      userId: userId,
      role: jwtPayload.role || user.role,
      businessId: jwtPayload.businessId || user.businessId
    };
    
    return done(null, authenticatedUser);
  } catch (error) {
    console.error('[JWT Debug] Error verifying token:', error);
    return done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, verifyCallback);

// Check for Google OAuth credentials
const hasGoogleCredentials = 
  process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET && 
  process.env.GOOGLE_CALLBACK_URL;

// Log the environment variables to ensure they are loaded
console.log('Google OAuth Configuration:');
console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}`);
console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set'}`);
console.log(`- GOOGLE_CALLBACK_URL: ${process.env.GOOGLE_CALLBACK_URL || 'Not set'}`);

// Google OAuth callback URL
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

// Log the actual callback URL being used
console.log(`Using Google callback URL: ${CALLBACK_URL}`);

// Export the initialization function
export function initializePassport() {
  console.log('==========================================');
  console.log('INITIALIZING PASSPORT');
  
  // Initialize JWT strategy
  passport.use('jwt', jwtStrategy);
  
  // Initialize Google strategy if credentials are available
  if (hasGoogleCredentials) {
    console.log(`Google Client ID: ${process.env.GOOGLE_CLIENT_ID}`);
    console.log(`Google Callback URL: ${CALLBACK_URL}`);
    
    passport.use('google', new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: CALLBACK_URL,
      passReqToCallback: true as true
    }, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          // Update user information if needed
          user.email = profile.emails?.[0]?.value || user.email;
          
          // Update name fields if they're empty
          if (!user.firstName || !user.lastName) {
            if (profile.name) {
              user.firstName = profile.name.givenName || user.firstName;
              user.lastName = profile.name.familyName || user.lastName;
            } else if (profile.displayName) {
              const nameParts = profile.displayName.split(' ');
              if (!user.firstName) user.firstName = nameParts[0] || user.firstName;
              if (!user.lastName) {
                user.lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : user.lastName;
              }
            }
          }
          
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        
        // Create new user if not found
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'), false);
        }
        
        // Check if user exists with this email
        user = await User.findOne({ email });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          if (!user.firstName || !user.lastName) {
            if (profile.name) {
              if (!user.firstName) user.firstName = profile.name.givenName || user.firstName;
              if (!user.lastName) user.lastName = profile.name.familyName || user.lastName;
            } else if (profile.displayName) {
              const nameParts = profile.displayName.split(' ');
              if (!user.firstName) user.firstName = nameParts[0] || user.firstName;
              if (!user.lastName) {
                user.lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : user.lastName;
              }
            }
          }
          
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        
        // Create brand new user
        let firstName = '';
        let lastName = '';
        
        if (profile.name) {
          firstName = profile.name.givenName || '';
          lastName = profile.name.familyName || '';
        } else if (profile.displayName) {
          const nameParts = profile.displayName.split(' ');
          firstName = nameParts[0] || 'Google';
          lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'User';
        } else {
          firstName = 'Google';
          lastName = 'User';
        }
        
        const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
        
        const newUser = await User.create({
          email,
          googleId: profile.id,
          firstName,
          lastName,
          password: randomPassword,
          role: 'customer',
          isActive: true
        });
        
        return done(null, newUser);
      } catch (error) {
        console.error("Error in Google strategy:", error);
        return done(error, false);
      }
    }));
    
    console.log('Google OAuth strategy initialized successfully');
  } else {
    console.warn('Google OAuth login will not be available');
    console.warn('To enable Google login, set the GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL');
    console.warn('environment variables in your .env file');
  }

  // Configure session handling with proper types
  passport.serializeUser((user: any, done: (err: any, id?: string) => void) => {
    done(null, user._id ? user._id.toString() : user.id);
  });

  passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  return passport;
}

// Export passport instance as default
export default passport;
