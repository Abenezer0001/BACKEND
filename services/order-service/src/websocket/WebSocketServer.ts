
import WebSocket from 'ws';
import http from 'http';
import { WebSocketService } from '../services/WebSocketService';

/**
 * Initialize the WebSocket server
 * @param server HTTP server instance
 * @returns WebSocketService instance
 */
export const initializeWebSocketServer = (server: http.Server): WebSocketService => {
  const wss = new WebSocket.Server({ server });
  const wsService = new WebSocketService(wss);

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket: Client connected');
    
    // Send initial connection message
    ws.send(JSON.stringify({ 
      type: 'CONNECTION_ESTABLISHED', 
      message: 'Connected to INSEAT order service' 
    }));

    // Handle client messages
    ws.on('message', (message: string) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log('WebSocket: Received message:', parsedMessage);
        
        // Handle ping messages to keep connection alive
        if (parsedMessage.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('WebSocket: Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket: Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket: Client error:', error);
    });
  });

  return wsService;
};
