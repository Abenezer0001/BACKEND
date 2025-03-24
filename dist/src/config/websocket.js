"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketManager = exports.WebSocketManager = void 0;
const ws_1 = require("ws");
class WebSocketManager {
    constructor(server) {
        this.wss = new ws_1.Server({ server });
        this.clients = new Map();
        this.setupWebSocket();
        this.pingInterval = this.startPingInterval();
    }
    setupWebSocket() {
        this.wss.on('connection', async (ws, request) => {
            const extWs = ws;
            try {
                // Set up client properties
                extWs.isAlive = true;
                this.clients.set(request.headers['sec-websocket-key'], extWs);
                console.log(`Client connected: ${request.headers['sec-websocket-key']}`);
                // Set up ping-pong
                extWs.on('pong', () => {
                    extWs.isAlive = true;
                });
                // Handle messages
                extWs.on('message', (data) => {
                    console.log('Received:', data);
                });
                // Handle client disconnect
                extWs.on('close', () => {
                    this.clients.delete(request.headers['sec-websocket-key']);
                    console.log(`Client disconnected: ${request.headers['sec-websocket-key']}`);
                });
                // Send initial connection success message
                extWs.send(JSON.stringify({
                    type: 'CONNECTION_ESTABLISHED',
                    message: 'Successfully connected to WebSocket server',
                    timestamp: Date.now()
                }));
            }
            catch (error) {
                console.error('WebSocket connection error:', error);
                extWs.close();
            }
        });
    }
    startPingInterval() {
        return setInterval(() => {
            this.wss.clients.forEach((ws) => {
                const extWs = ws;
                if (!extWs.isAlive) {
                    return ws.terminate();
                }
                extWs.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }
    static initialize(server) {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager(server);
        }
        return WebSocketManager.instance;
    }
    static getInstance() {
        if (!WebSocketManager.instance) {
            throw new Error('WebSocketManager not initialized');
        }
        return WebSocketManager.instance;
    }
    notifyNewOrder(order) {
        this.broadcast({
            type: 'NEW_ORDER',
            data: order,
            timestamp: Date.now()
        });
    }
    notifyOrderUpdate(order) {
        this.broadcast({
            type: 'ORDER_UPDATE',
            data: order,
            timestamp: Date.now()
        });
    }
    sendOrderAlert(alertData) {
        this.broadcast({
            type: 'ORDER_ALERT',
            data: alertData,
            timestamp: Date.now()
        });
    }
    broadcast(message) {
        this.wss.clients.forEach((ws) => {
            const extWs = ws;
            if (extWs.readyState === ws_1.WebSocket.OPEN) {
                extWs.send(JSON.stringify(message));
            }
        });
    }
    cleanup() {
        clearInterval(this.pingInterval);
        this.wss.close();
    }
}
exports.WebSocketManager = WebSocketManager;
const getWebSocketManager = () => {
    return WebSocketManager.getInstance();
};
exports.getWebSocketManager = getWebSocketManager;
