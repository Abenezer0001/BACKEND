import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import { JWT_SECRET } from '../config';

// JWT options
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    // Extract from cookie first (for browser clients)
    (req) => {
      let token = null;
      if (req && req.cookies) {
        token = req.cookies['access_token'];
      }
      return token;
    },
    // Fallback to Authorization Bearer token (for API clients)
    ExtractJwt.fromAuthHeaderAsBearerToken()
  ]),
  secretOrKey: JWT_SECRET
};

// Google OAuth options
const googleOptions = {
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
};

// Configure JWT strategy
const jwtStrategy = new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
  try {
    // Find the user by ID from JWT payload
    const user = await User.findById(jwtPayload.id);
    
    if (!user) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
});

// Configure Google strategy only if credentials are available
let googleStrategy;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  googleStrategy = new GoogleStrategy(googleOptions, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // Update user information if needed
      user.email = profile.emails?.[0]?.value || user.email;
      user.displayName = profile.displayName || user.displayName;
      user.avatar = profile.photos?.[0]?.value || user.avatar;
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
      user.displayName = profile.displayName || user.displayName;
      user.avatar = profile.photos?.[0]?.value || user.avatar;
      await user.save();
      
      return done(null, user);
    }
    
    // Create brand new user
    const newUser = await User.create({
      email,
      googleId: profile.id,
      displayName: profile.displayName,
      avatar: profile.photos?.[0]?.value,
      isEmailVerified: true,  // Google accounts are considered verified
      authMethod: 'google'
    });
    
    return done(null, newUser);
  } catch (error) {
    return done(error, false);
  }
});
}

// Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Export the passport instance
export default passport;

// Export initialization function for backward compatibility
export const initializePassport = () => {
  // Make sure strategies are initialized
  passport.use('jwt', jwtStrategy);
  // Only use Google strategy if it was initialized
  if (googleStrategy && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Initializing Google OAuth strategy');
    passport.use('google', googleStrategy);
  } else {
    console.log('Google OAuth strategy not initialized: Missing client credentials');
  }
  return passport;
}; 