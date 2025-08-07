import * as dotenv from 'dotenv';

dotenv.config();

interface Config {
  app: {
    nodeEnv: string;
    port: number;
  };
  mongodb: {
    uri: string;
  };
  kafka: {
    clientId: string;
    brokers: string[];
  };
  websocket: {
    port: number;
    cors: {
      allowedOrigins: string[];
    };
  };
  logging: {
    level: string;
    format: string;
  };
}

const config: Config = {
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10)
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat'
  },
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'order-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
  },
  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '3002', 10),
    cors: {
      allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',')
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

// Validate required configurations
function validateConfig(config: Config): void {
  const requiredFields = [
    'mongodb.uri',
    'kafka.brokers'
  ];

  const missingFields = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config as any);
    return !value || (Array.isArray(value) && value.length === 0);
  });

  if (missingFields.length > 0) {
    console.warn(`Warning: Missing configuration fields: ${missingFields.join(', ')}`);
  }
}

// Validate config in non-test environments
if (process.env.NODE_ENV !== 'test') {
  validateConfig(config);
}

export type { Config };
export { config };
export default config; 