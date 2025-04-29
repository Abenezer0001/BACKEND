import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    methods: string[];
    credentials: boolean;
  }
}

export const createWebSocketServer = (httpServer: HttpServer, config?: Partial<WebSocketConfig>) => {
  const defaultConfig: WebSocketConfig = {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  };

  const mergedConfig = { ...defaultConfig, ...config };
  const io = new Server(httpServer, mergedConfig);

  console.log('WebSocket server initialized with config:', mergedConfig);

  return io;
}; 