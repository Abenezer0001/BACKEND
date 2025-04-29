import { Request, Response } from 'express';
import User, { IUser, UserRole } from '../models/user.model';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { Secret, SignOptions } from 'jsonwebtoken';

dotenv.config();

// JWT configuration
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_token_secret_here';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_here';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // Short-lived access token
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

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                console.log(`Registration failed: User with email ${email} already exists`);
                return res.status(400).json({ message: 'User already exists' });
            }

            // Create new user
            const user = new User({
                email,
                password,
                firstName,
                lastName,
                role
            });

            console.log(`Creating new user with role: ${role}`);
            await user.save();
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
                    role: user.role
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
            
            const { email, password } = req.body;

            if (!email || !password) {
                console.log('Login failed: Missing email or password');
                return res.status(400).json({ 
                    message: 'Email and password are required',
                    details: {
                        email: email ? undefined : 'Email is required',
                        password: password ? undefined : 'Password is required'
                    }
                });
            }

            // Find user by email
            console.log(`Looking up user with email: ${email}`);
            const user = await User.findOne({ email });
            if (!user) {
                console.log(`Login failed: User with email ${email} not found`);
                console.log('Database lookup returned null');
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Check password
            console.log(`Validating password for user: ${user._id}`);
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                console.log(`Login failed: Invalid password for ${email}`);
                console.log('Password hash comparison failed');
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();
            console.log(`User logged in: ${user._id} (${email})`);
            console.log(`User details: Role: ${user.role}, Name: ${user.firstName} ${user.lastName}`);

            // Generate tokens
            const { accessToken, refreshToken } = this.generateTokens(user);
            console.log('Tokens generated successfully');

            // Set tokens in HTTP-only cookies
            this.setTokenCookies(res, accessToken, refreshToken);
            console.log('Cookies set successfully');

            res.status(200).json({
                success: true,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error stack:', (error as Error).stack);
            console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            res.status(500).json({ 
                message: 'Error logging in',
                details: process.env.NODE_ENV !== 'production' ? (error as Error).message : undefined
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
            const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as Secret) as { id: string };

            // Find user
            const user = await User.findById(decoded.id);
            if (!user) {
                console.log(`Token refresh failed: User ${decoded.id} not found`);
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
            const user = req.user as IUser;
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
            console.log(`Fetching user by ID: ${id}`);
            return await User.findById(id);
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            return null;
        }
    }

    private generateTokens(user: IUser) {
        console.log(`Generating tokens for user: ${user._id}`);
        console.log(`Token generation - User role: ${user.role}`);
        
        const accessTokenPayload = { 
            id: user._id,
            email: user.email,
            role: user.role
        };
        
        console.log('Access token payload:', { ...accessTokenPayload, id: user._id.toString() });
        
        const refreshTokenPayload = { id: user._id };
        
        // Generate access token
        // @ts-ignore - Suppressing TypeScript errors for jwt.sign
        const accessToken = jwt.sign(
            accessTokenPayload,
            ACCESS_TOKEN_SECRET as Secret,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
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
        res.cookie('access_token', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // Set refresh token in cookie (long lived)
        res.cookie('refresh_token', refreshToken, cookieOptions);
        
        console.log('Auth cookies set successfully');
    }
}

export default new AuthController();
