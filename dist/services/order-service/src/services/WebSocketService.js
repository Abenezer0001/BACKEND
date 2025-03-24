"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = __importDefault(require("ws"));
class WebSocketService {
    constructor(wss) {
        this.wss = wss;
    }
    /**
     * Broadcast a message to all connected clients
     */
    broadcast(message) {
        this.wss.clients.forEach(client => {
            if (client.readyState === ws_1.default.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
    /**
     * Notify all clients about a new order
     */
    notifyNewOrder(order) {
        this.broadcast({
            type: 'NEW_ORDER',
            data: order
        });
        console.log(`WebSocket: Notified clients about new order ${order.orderNumber}`);
    }
    /**
     * Notify all clients about an order update
     */
    notifyOrderUpdate(order) {
        this.broadcast({
            type: 'ORDER_UPDATE',
            data: order
        });
        console.log(`WebSocket: Notified clients about order update ${order.orderNumber}`);
    }
    /**
     * Notify all clients about an order cancellation
     */
    notifyOrderCancellation(order) {
        this.broadcast({
            type: 'ORDER_CANCELLED',
            data: order
        });
    }
}
exports.WebSocketService = WebSocketService;
