"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocketServer = void 0;
const ws_1 = __importDefault(require("ws"));
const WebSocketService_1 = require("../services/WebSocketService");
/**
 * Initialize the WebSocket server
 * @param server HTTP server instance
 * @returns WebSocketService instance
 */
const initializeWebSocketServer = (server) => {
    const wss = new ws_1.default.Server({ server });
    const wsService = new WebSocketService_1.WebSocketService(wss);
    wss.on('connection', (ws) => {
        console.log('WebSocket: Client connected');
        // Send initial connection message
        ws.send(JSON.stringify({
            type: 'CONNECTION_ESTABLISHED',
            message: 'Connected to INSEAT order service'
        }));
        // Handle client messages
        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                console.log('WebSocket: Received message:', parsedMessage);
                // Handle ping messages to keep connection alive
                if (parsedMessage.type === 'PING') {
                    ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                }
            }
            catch (error) {
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
exports.initializeWebSocketServer = initializeWebSocketServer;
