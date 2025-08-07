import * as dotenv from 'dotenv';
import type { Config } from './types';

dotenv.config();

const config: Config = {
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10)
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production',
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    issuer: process.env.TOKEN_ISSUER || 'inseat-auth-service'
  },
  email: {
    service: process.env.EMAIL_SERVICE || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'INSEAT Admin <noreply@inseat.com>'
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    adminUrl: process.env.ADMIN_FRONTEND_URL || 'http://localhost:5173'
  },
  security: {
    passwordResetTokenExpires: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES || '3600', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    passwordRequireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS !== 'false'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    setupWindowMs: parseInt(process.env.SETUP_RATE_LIMIT_WINDOW_MS || '3600000', 10),
    setupMaxRequests: parseInt(process.env.SETUP_RATE_LIMIT_MAX_REQUESTS || '3', 10)
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'combined'
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
  }
};

// Validate required configurations
function validateConfig(config: Config): void {
  const requiredFields = [
    'jwt.secret',
    'email.user',
    'email.password'
  ];

  const missingFields = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config as any);
    return !value;
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required configuration: ${missingFields.join(', ')}`);
  }

  if (config.app.nodeEnv === 'production') {
    if (config.jwt.secret === 'default-jwt-secret-key-change-in-production') {
      throw new Error('Default JWT secret key cannot be used in production');
    }
  }
}

// Validate config in non-test environments
if (process.env.NODE_ENV !== 'test') {
  validateConfig(config);
}

// Export constants
export const JWT_SECRET = config.jwt.secret;

// Export both the type and the config
export type { Config };
export { config };
export default config;
