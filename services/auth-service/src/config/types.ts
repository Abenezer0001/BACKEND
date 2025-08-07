export interface Config {
  app: {
    nodeEnv: string;
    port: number;
  };
  
  mongodb: {
    uri: string;
  };
  
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
  };
  
  email: {
    service: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };
  
  frontend: {
    url: string;
    adminUrl: string;
  };
  
  security: {
    passwordResetTokenExpires: number;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
  };
  
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    setupWindowMs: number;
    setupMaxRequests: number;
  };
  
  logging: {
    level: string;
    format: string;
  };
  
  cors: {
    allowedOrigins: string[];
  };
}

