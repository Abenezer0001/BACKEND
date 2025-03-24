"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importStar(require("../models/user.model"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class AuthController {
    async register(req, res) {
        try {
            console.log('Registration request body:', req.body);
            const { email, password, firstName, lastName, username, role = user_model_1.UserRole.CUSTOMER } = req.body;
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
            const existingUser = await user_model_1.default.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            // Create new user
            const user = new user_model_1.default({
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
        }
        catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Error registering user' });
        }
    }
    async login(req, res) {
        try {
            const { email, password } = req.body;
            // Find user by email
            const user = await user_model_1.default.findOne({ email });
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
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Error logging in' });
        }
    }
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ message: 'Refresh token is required' });
            }
            // Verify refresh token
            const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh-secret');
            // Find user
            const user = await user_model_1.default.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }
            // Generate new access token
            const newAccessToken = this.generateToken(user);
            res.status(200).json({ token: newAccessToken });
        }
        catch (error) {
            console.error('Token refresh error:', error);
            res.status(401).json({ message: 'Invalid refresh token' });
        }
    }
    async logout(req, res) {
        // In a stateless JWT authentication system, the client is responsible for
        // discarding the token. The server doesn't need to do anything.
        res.status(200).json({ message: 'Logged out successfully' });
    }
    async getUserById(id) {
        try {
            return await user_model_1.default.findById(id);
        }
        catch (error) {
            console.error('Error fetching user by ID:', error);
            return null;
        }
    }
    generateToken(user) {
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
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    generateRefreshToken(user) {
        const secret = process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh-secret';
        const payload = { id: user._id };
        const options = { expiresIn: '7d' };
        // @ts-ignore
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
}
exports.default = new AuthController();
