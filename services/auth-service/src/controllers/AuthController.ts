import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User, { 
    IUser, 
    UserRole, 
    getUserModel, 
    findUserByEmail, 
    findUserById,
    createUser,
    
} from '../models/user.model';

/**
 * Database operation helpers
 * These are simplified wrappers around the utilities from user.model.ts
 */

// Helper function to ensure User model is properly initialized
const ensureUserModel = async () => {
  try {
    // This will verify connection and return the singleton model instance
    return getUserModel();
  } catch (error) {
    console.error('Error ensuring User model initialization:', error);
    throw new Error(`User model initialization failed: ${(error as Error).message}`);
  }
};

dotenv.config();

// Import JWT_SECRET from config for consistency
import { JWT_SECRET } from '../config';

// JWT configuration
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_here';
const ACCESS_TOKEN_EXPIRY = '24h'; // Force 24 hour expiration for admin operations regardless of environment variables
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // Longer-lived refresh token

// Cookie configuration
const cookieOptions: Record<string, any> = {
  httpOnly: true, // Prevents JavaScript access to cookie
  secure: process.env.NODE_ENV === 'production', // Only sent over HTTPS in production
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Protect against CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

class AuthController {
    async register(req: Request, res: Response) {
        try {
            console.log('=============================================');
            console.log('REGISTER ENDPOINT CALLED');
            console.log('Registration request body:', { 
                ...req.body, 
                password: req.body.password ? '[REDACTED]' : undefined 
            });
            console.log('Registration role specified:', req.body.role || 'DEFAULT');
            console.log('Headers:', req.headers);
            
            const { email, password, firstName, lastName, username, role = UserRole.CUSTOMER } = req.body;

            // Validate required fields
            if (!email || !password || !firstName || !lastName) {
                console.log('Registration failed: Missing required fields');
                console.log('Validation details:', {
                    hasEmail: !!email,
                    hasPassword: !!password,
                    hasFirstName: !!firstName,
                    hasLastName: !!lastName
                });
                return res.status(400).json({ 
                    message: 'Missing required fields',
                    details: {
                        email: email ? undefined : 'Email is required',
                        password: password ? undefined : 'Password is required',
                        firstName: firstName ? undefined : 'First name is required',
                        lastName: lastName ? undefined : 'Last name is required'
                    }
                });
            }

            // Ensure database connection
            try {
                // Ensure User model is properly initialized
                await ensureUserModel();
                console.log('Database connection verified');
            } catch (connError) {
                console.error('Database connection error during registration:', connError);
                throw new Error(`Cannot register user: Database not available (${(connError as Error).message})`);
            }

            // Check if user already exists
            console.log(`Checking if user exists with email: ${email}`);
            const existingUser = await findUserByEmail(email);

            if (existingUser) {
                console.log(`Registration failed: User with email ${email} already exists`);
                return res.status(400).json({ message: 'User already exists' });
            }

            // Extract business and restaurant IDs from request body
            const { businessId, restaurantId, tableId } = req.body;
            
            // Handle restaurant ID resolution for customers
            let resolvedRestaurantId = restaurantId;
            
            if (role === UserRole.CUSTOMER) {
                // If tableId is provided but restaurantId is not, try to resolve restaurantId from tableId
                if (tableId && !restaurantId) {
                    try {
                        // Import Table model dynamically to avoid circular dependencies
                        const Table = require('../../../restaurant-service/src/models/Table').default;
                        const table = await Table.findById(tableId).select('restaurantId');
                        
                        if (table && table.restaurantId) {
                            resolvedRestaurantId = table.restaurantId.toString();
                            console.log(`Resolved restaurantId ${resolvedRestaurantId} from tableId ${tableId}`);
                        } else {
                            console.log(`Table with ID ${tableId} not found or has no restaurantId`);
                        }
                    } catch (tableError) {
                        console.error('Error resolving restaurantId from tableId:', tableError);
                        // Continue without setting restaurantId - it's now optional
                    }
                }
                
                // Log the registration context
                console.log('Customer registration context:', {
                    providedRestaurantId: restaurantId || 'Not provided',
                    providedTableId: tableId || 'Not provided',
                    resolvedRestaurantId: resolvedRestaurantId || 'Not resolved'
                });
            }
            
            // Prepare user data with businessId and restaurantId if resolved
            const userData = {
                email,
                password,
                firstName,
                lastName,
                role,
                ...(businessId && { businessId }),
                ...(resolvedRestaurantId && { restaurantId: resolvedRestaurantId })
            };
            
            console.log('Creating user with data:', {
                ...userData,
                password: '[REDACTED]',
                businessId: businessId || 'Not provided',
                restaurantId: resolvedRestaurantId || 'Not provided'
            });

            // Get model instance with verification
            const UserModel = getUserModel();
            const newUser = new UserModel(userData);
            const user = await newUser.save();
            
            console.log(`User registered successfully: ${user._id} (${email}, role: ${role})`);
            console.log('User document saved to database:', { 
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                created: user.createdAt
            });

            // Generate tokens
            const { accessToken, refreshToken } = this.generateTokens(user);
            console.log('Tokens generated for new user');

            // Set tokens in HTTP-only cookies
            this.setTokenCookies(res, accessToken, refreshToken);
            console.log('Cookies set for new user');

            res.status(201).json({
                success: true,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    businessId: user.businessId
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            res.status(500).json({ 
                message: 'Error registering user', 
                details: process.env.NODE_ENV !== 'production' ? (error as Error).message : undefined 
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            console.log('=============================================');
            console.log('LOGIN ENDPOINT CALLED');
            console.log('Login attempt for:', req.body.email);
            console.log('Login request headers:', {
                'content-type': req.headers['content-type'],
                'user-agent': req.headers['user-agent'],
                'authorization': req.headers['authorization'] ? '[PRESENT]' : '[MISSING]',
                'cookie': req.headers['cookie'] ? '[PRESENT]' : '[MISSING]'
            });
            console.log('Cookies received:', req.cookies ? Object.keys(req.cookies) : 'No cookies');
            
            // Get user credentials first
            const { email, password } = req.body;
            
            // Trim whitespace from credentials to prevent login issues
            const trimmedEmail = email?.trim();
            const trimmedPassword = password?.trim();
            
            if (!trimmedEmail || !trimmedPassword) {
                console.log('Login failed: Missing email or password');
                return res.status(400).json({ 
                    message: 'Email and password are required',
                    details: {
                        email: trimmedEmail ? undefined : 'Email is required',
                        password: trimmedPassword ? undefined : 'Password is required'
                    }
                });
            }
            
            // Ensure database connection and model initialization
            try {
                // This will verify connection and initialize model if needed
                await ensureUserModel();
                console.log('Database connection and model verified');
            } catch (dbError) {
                console.error('Database initialization error:', dbError);
                throw new Error(`Database connection error: ${(dbError as Error).message}`);
            }
            
            // Get connection diagnostic info
            console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);
            
            try {
                console.log(`Database name: ${mongoose.connection.db?.databaseName || 'unknown'}`);
            } catch (dbNameError) {
                console.error('Error getting database name:', dbNameError);
            }
            
            console.log('Connection verified, proceeding with login');

            // Find user by email
            console.log(`Looking up user with email: ${trimmedEmail}`);
            const user = await findUserByEmail(trimmedEmail);
            
            if (!user) {
                console.log(`Login failed: User with email ${trimmedEmail} not found`);
                console.log('Database lookup returned null');
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Check password
            console.log(`Validating password for user: ${user._id}`);
            console.log(`User stored password hash: ${user.password.substring(0, 10)}...`);
            console.log(`Submitted password length: ${trimmedPassword.length}`);
            console.log(`Password first 2 chars: ${trimmedPassword.substring(0, 2)}...`);
            
            // Try direct bcrypt comparison first for debugging
            try {
                const directComparison = await bcrypt.compare(trimmedPassword, user.password);
                console.log(`Direct bcrypt.compare result: ${directComparison ? 'SUCCESS' : 'FAILED'}`);
                
                // Try comparing a test hash of the provided password
                const testSalt = await bcrypt.genSalt(10);
                const testHash = await bcrypt.hash(trimmedPassword, testSalt);
                console.log(`Test hash generated: ${testHash.substring(0, 10)}...`);
            } catch (compareError) {
                console.error('Error during direct comparison:', compareError);
            }
            
            // Use the model's comparePassword method (which ultimately uses bcrypt.compare)
            const isPasswordValid = await user.comparePassword(trimmedPassword);
            console.log(`Model comparePassword method result: ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);
            
            if (!isPasswordValid) {
                console.log(`Login failed: Invalid password for ${trimmedEmail}`);
                console.log('Password hash comparison failed');
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            
            // CRITICAL FIX: Check for S3 configuration and skip it during login
            console.log('S3 Configuration:');
            console.log(`- AWS_ACCESS_KEY_ID is set: ${process.env.AWS_ACCESS_KEY_ID ? 'YES' : 'NO'}`);
            console.log(`- AWS_SECRET_ACCESS_KEY is set: ${process.env.AWS_SECRET_ACCESS_KEY ? 'YES' : 'NO'}`);
            console.log(`- S3_REGION is set: ${process.env.S3_REGION ? 'YES (' + process.env.S3_REGION + ')' : 'NO'}`);
            console.log(`- S3_BUCKET is set: ${process.env.S3_BUCKET ? 'YES (' + process.env.S3_BUCKET + ')' : 'NO'}`);
            
            // SKIP S3 bucket check during login to prevent crashes
            console.log('Skipping S3 bucket check during login to prevent potential issues');
            
            // Update last login with error handling
            try {
                console.log(`Updating last login for user: ${user._id}`);
                user.lastLogin = new Date();
                await user.save();
                console.log('Last login timestamp updated successfully');
            } catch (saveError) {
                console.error('Error updating last login timestamp:', saveError);
                // Continue processing - non-critical error
            }
            
            console.log(`User logged in: ${user._id} (${trimmedEmail})`);
            console.log(`User details: Role: ${user.role}, Name: ${user.firstName} ${user.lastName}`);

            // Generate tokens with error handling
            let accessToken, refreshToken;
            try {
                // Generate tokens
                console.log('Generating auth tokens...');
                const tokens = this.generateTokens(user);
                accessToken = tokens.accessToken;
                refreshToken = tokens.refreshToken;
                console.log('Tokens generated successfully');
            } catch (tokenError) {
                console.error('Error generating tokens:', tokenError);
                return res.status(500).json({ message: 'Error generating authentication tokens' });
            }

            // Set cookies with error handling
            try {
                // Set tokens in HTTP-only cookies
                console.log('Setting auth cookies...');
                this.setTokenCookies(res, accessToken, refreshToken);
                console.log('Cookies set successfully');
            } catch (cookieError) {
                console.error('Error setting cookies:', cookieError);
                // Continue processing - we can still return tokens in response body
            }

            // Send response with safeguards
            try {
                console.log('Sending successful login response');
                return res.status(200).json({
                    success: true,
                    token: accessToken, // Include token for API testing
                    user: {
                        id: user._id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        businessId: user.businessId
                    }
                });
            } catch (responseError) {
                console.error('Error sending response:', responseError);
                // Last-ditch effort to send something back
                return res.status(200).send('Login successful');
            }
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error stack:', (error as Error).stack);
            console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            
            // Provide a more descriptive error for database connection issues
            let statusCode = 500;
            let errorMessage = 'Error logging in';
            let errorDetails = (error as Error).message;
            
            // Check for specific database connection errors with more detailed messages
            if (errorDetails.includes('buffering timed out')) {
                errorMessage = 'Database operation timed out';
                errorDetails = 'The database operation took too long to complete. Please try again later.';
                console.error('Database operation timeout detected during login');
            } else if (errorDetails.includes('connection timed out')) {
                errorMessage = 'Database connection timed out';
                errorDetails = 'Could not establish a connection to the database. Please try again later.';
                console.error('Database connection timeout detected during login');
            } else if (errorDetails.includes('failed to connect') || errorDetails.includes('Database not connected')) {
                errorMessage = 'Database connection error';
                errorDetails = 'Unable to connect to the database. Please try again later.';
                console.error('Database connection issue detected during login');
            }
            
            // Check MongoDB connection state for additional diagnostics
            const connectionState = mongoose.connection.readyState;
            console.error(`Final MongoDB connection state: ${connectionState}`);
            
            // Try to reconnect if database is disconnected
            if (connectionState === 0) {
                console.log('Attempting to reconnect to database after error...');
                // Don't wait for reconnection, just trigger it for future requests
                mongoose.connect(process.env.MONGO_URL!).catch(e => 
                    console.error('Failed to reconnect:', e)
                );
            }
            
            res.status(statusCode).json({ 
                message: errorMessage,
                details: process.env.NODE_ENV !== 'production' ? errorDetails : undefined
            });
        }
    }

    async refreshToken(req: Request, res: Response) {
        try {
            console.log('Token refresh requested');
            // Get refresh token from cookies
            const refreshToken = req.cookies.refresh_token;
            
            if (!refreshToken) {
                console.log('Token refresh failed: No refresh token in cookies');
                return res.status(401).json({ message: 'Refresh token missing' });
            }

            // Verify refresh token
            console.log('Verifying refresh token');
            const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as Secret) as { userId: string };

            // Find user
            console.log(`Finding user by ID for token refresh: ${decoded.userId}`);
            const user = await findUserById(decoded.userId);
            
            if (!user) {
                console.log(`Token refresh failed: User ${decoded.userId} not found`);
                return res.status(401).json({ message: 'Invalid refresh token' });
            }
            console.log(`User found for token refresh: ${user._id}`);

            // Generate new tokens
            const tokens = this.generateTokens(user);
            console.log('New tokens generated');

            // Set new tokens in cookies
            this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
            console.log('New cookies set');

            res.status(200).json({ 
                success: true,
                message: 'Token refreshed successfully'
            });
        } catch (error) {
            console.error('Token refresh error:', error);
            
            // Clear cookies on error
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            console.log('Cookies cleared due to refresh error');
            
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
    }

    async logout(req: Request, res: Response) {
        console.log('Logout requested');
        // Clear the auth cookies
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        console.log('Auth cookies cleared');
        
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    }

    async googleAuthSuccess(req: Request, res: Response) {
        try {
            console.log('=============================================');
            console.log('GOOGLE AUTH SUCCESS ENDPOINT CALLED');
            console.log('Google auth success handler called');
            console.log('Google auth request headers:', { 
                'content-type': req.headers['content-type'],
                'user-agent': req.headers['user-agent']
            });
            console.log('Session info:', req.session);
            // User is already authenticated by Passport and attached to request
            if (!req.user) {
                console.log('Google auth failed: No user in request');
                console.log('Passport failed to attach user to request object');
                return res.status(401).json({ message: 'Authentication failed' });
            }

            console.log('Raw user from Passport:', req.user);
            // Use unknown as intermediate type to bypass TypeScript's type checking
            const user = req.user as unknown as IUser;
            console.log(`Google auth successful for user: ${user._id} (${user.email})`);
            console.log(`Google auth user details: Role: ${user.role}, Name: ${user.firstName} ${user.lastName}`);

            // Generate tokens
            console.log(`Generating tokens for Google auth user: ${user._id}`);
            const { accessToken, refreshToken } = this.generateTokens(user);
            console.log('Tokens generated for Google auth user');
            console.log('JWT payload contains role:', user.role);

            // Set tokens in HTTP-only cookies
            this.setTokenCookies(res, accessToken, refreshToken);
            console.log('Cookies set for Google auth user');

            // Redirect to frontend with success
            const redirectUrl = `${process.env.CUSTOMER_FRONTEND_URL || 'http://localhost:8080'}/login/success`;
            console.log(`Redirecting to: ${redirectUrl}`);
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Google auth success error:', error);
            res.redirect(`${process.env.CUSTOMER_FRONTEND_URL || 'http://localhost:8080'}/login/error`);
        }
    }

    async getUserById(id: string): Promise<IUser | null> {
        try {
            await ensureUserModel();
            return await findUserById(id);
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            return null;
        }
    }

    private generateTokens(user: IUser) {
        console.log(`Generating tokens for user: ${user._id}`);
        console.log(`Token generation - User role: ${user.role}`);
        console.log(`Token generation - User businessId: ${user.businessId || 'none'}`);
        console.log(`Using token expiration: ACCESS_TOKEN_EXPIRY=${ACCESS_TOKEN_EXPIRY}`);
        
        // Calculate expiration time for debugging
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const expiresInSeconds = 24 * 60 * 60; // 24 hours in seconds
        const expiryTimestamp = nowInSeconds + expiresInSeconds;
        const expiryDate = new Date(expiryTimestamp * 1000).toISOString();
        
        console.log(`Token will expire at: ${expiryDate} (in ${expiresInSeconds} seconds)`);
        
        const accessTokenPayload: any = { 
            userId: user._id,
            email: user.email,
            role: user.role
        };

        // Add businessId to token if user has one
        if (user.businessId) {
            accessTokenPayload.businessId = user.businessId.toString();
        }
        
        console.log('Access token payload:', { ...accessTokenPayload, userId: user._id.toString() });
        
        const refreshTokenPayload = { userId: user._id };
        
        // Generate access token
        // @ts-ignore - Suppressing TypeScript errors for jwt.sign
        const accessToken = jwt.sign(
            accessTokenPayload,
            JWT_SECRET as Secret,
            { 
                expiresIn: ACCESS_TOKEN_EXPIRY,
                algorithm: 'HS256'  // Explicitly set the algorithm for consistency
            }
        );

        // Generate refresh token
        // @ts-ignore - Suppressing TypeScript errors for jwt.sign
        const refreshToken = jwt.sign(
            refreshTokenPayload,
            REFRESH_TOKEN_SECRET as Secret,
            { expiresIn: REFRESH_TOKEN_EXPIRY }
        );

        console.log('Tokens generated successfully');
        return { accessToken, refreshToken };
    }

    private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
        console.log('Setting auth cookies');
        
        // Set access token in cookie (short lived)
        // Force a 24-hour expiration regardless of environment variables
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        console.log(`Setting access_token cookie with maxAge=${oneDay}ms (24 hours)`);
        res.cookie('access_token', accessToken, {
            ...cookieOptions,
            maxAge: oneDay, // Hardcoded 24-hour expiration for consistency
        });

        // Set refresh token in cookie (long lived)
        res.cookie('refresh_token', refreshToken, cookieOptions);
        
        console.log('Auth cookies set successfully');
    }
}

export default new AuthController();
