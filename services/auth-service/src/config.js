"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_PREFIX = exports.CORS_ORIGIN = exports.DB_PASSWORD = exports.DB_USER = exports.DB_NAME = exports.DB_PORT = exports.DB_HOST = exports.REFRESH_TOKEN_EXPIRY = exports.REFRESH_TOKEN_SECRET = exports.JWT_EXPIRY = exports.JWT_SECRET = exports.NODE_ENV = exports.PORT = void 0;
// Environment variables
exports.PORT = process.env.PORT || 3001;
exports.NODE_ENV = process.env.NODE_ENV || 'development';
exports.JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
exports.JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
exports.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret';
exports.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
// Database configuration
exports.DB_HOST = process.env.DB_HOST || 'localhost';
exports.DB_PORT = process.env.DB_PORT || '5432';
exports.DB_NAME = process.env.DB_NAME || 'inseat_auth';
exports.DB_USER = process.env.DB_USER || 'postgres';
exports.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
// CORS configuration
exports.CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
// API configuration
exports.API_PREFIX = process.env.API_PREFIX || '/api/v1';
