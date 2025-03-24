import { Request, Response } from 'express';
import User, { IUser, UserRole } from '../models/user.model';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

class AuthController {
    async register(req: Request, res: Response) {
        try {
            console.log('Registration request body:', req.body);
            const { email, password, firstName, lastName, username, role = UserRole.CUSTOMER } = req.body;

            // Validate required fields
            if (!email || !password || !firstName || !lastName) {
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

            await user.save();

            // Generate JWT token
            const token = this.generateToken(user);
            const refreshToken = this.generateRefreshToken(user);

            res.status(201).json({
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                },
                token,
                refreshToken
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Error registering user' });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Check password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Generate JWT token
            const token = this.generateToken(user);
            const refreshToken = this.generateRefreshToken(user);

            res.status(200).json({
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                },
                token,
                refreshToken
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Error logging in' });
        }
    }

    async refreshToken(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({ message: 'Refresh token is required' });
            }

            // Verify refresh token
            const decoded = jwt.verify(
                refreshToken, 
                process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh-secret'
            ) as { id: string };

            // Find user
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }

            // Generate new access token
            const newAccessToken = this.generateToken(user);

            res.status(200).json({ token: newAccessToken });
        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(401).json({ message: 'Invalid refresh token' });
        }
    }

    async logout(req: Request, res: Response) {
        // In a stateless JWT authentication system, the client is responsible for
        // discarding the token. The server doesn't need to do anything.
        res.status(200).json({ message: 'Logged out successfully' });
    }

    async getUserById(id: string): Promise<IUser | null> {
        try {
            return await User.findById(id);
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            return null;
        }
    }

    private generateToken(user: IUser): string {
        const secret = process.env.JWT_ACCESS_TOKEN_SECRET || 'secret';
        const payload = { 
            id: user._id,
            email: user.email,
            role: user.role
        };
        const options = { 
            expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME || '1h' 
        };
        
        // @ts-ignore
        return jwt.sign(payload, secret, options);
    }

    private generateRefreshToken(user: IUser): string {
        const secret = process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh-secret';
        const payload = { id: user._id };
        const options = { expiresIn: '7d' };
        
        // @ts-ignore
        return jwt.sign(payload, secret, options);
    }
}

export default new AuthController();
