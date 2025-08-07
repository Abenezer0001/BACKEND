import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import * as process from 'process';

// Global variable to hold the Socket.IO instance
let io: SocketIOServer | null = null;

/**
 * Initialize the Socket.IO server
 * @param server HTTP server to attach Socket.IO to
 * @returns The Socket.IO server instance
 */
export function initSocketIO(server: http.Server): SocketIOServer {
  if (io) {
    console.log('Socket.IO already initialized, returning existing instance');
    return io;
  }

  console.log('Initializing Socket.IO server');
  // Get CORS origins from environment, with React Native and other local dev ports included
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',   // Generic React dev server
    'http://localhost:3001',   // Backend/API server
    'http://localhost:5173',   // Vite dev server (Admin)
    'http://localhost:5174',   // Vite dev server (Customer)
    'http://localhost:8080',   // React Native Metro bundler
    'http://localhost:8081',   // React Native Metro bundler (alternative)
    'http://localhost:19006',  // Expo web dev server
    'http://localhost:19007'   // Expo React Native dev server
  ];

  io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Set up global Socket.IO event handlers if needed
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

/**
 * Get the Socket.IO server instance
 * @returns The Socket.IO server instance or null if not initialized
 */
export function getSocketIO(): SocketIOServer | null {
  if (!io) {
    console.warn('Socket.IO not initialized yet. Call initSocketIO first.');
  }
  return io;
}

/**
 * Close the Socket.IO server
 */
export function closeSocketIO(): Promise<void> {
  return new Promise((resolve) => {
    if (!io) {
      console.log('Socket.IO not initialized, nothing to close');
      resolve();
      return;
    }

    io.close(() => {
      console.log('Socket.IO closed');
      io = null;
      resolve();
    });
  });
} 