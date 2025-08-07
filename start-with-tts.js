#!/usr/bin/env node

// Set environment variables
process.env.ELEVENLABS_API_KEY = 'sk_dec62ca41257009671fef2fce796fb45576ed5fff981faf0';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '3001';

// Set CORS origins for development
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:8080,http://localhost:8081';

console.log('🚀 Starting INSEAT Backend with TTS support...');
console.log('Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'SET' : 'NOT SET');
console.log('- CORS_ORIGINS:', process.env.CORS_ORIGINS);

// Import and start the application
require('ts-node/register');
require('tsconfig-paths/register');
require('./src/app.ts'); 