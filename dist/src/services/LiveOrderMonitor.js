"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveOrderMonitor = void 0;
// import { Order } from '../models/Order';
const Order_1 = __importDefault(require("../../services/order-service/src/models/Order"));
const websocket_1 = require("../config/websocket");
class LiveOrderMonitor {
    constructor() {
        this.checkInterval = null;
        // Private constructor for singleton
    }
    static getInstance() {
        if (!LiveOrderMonitor.instance) {
            LiveOrderMonitor.instance = new LiveOrderMonitor();
        }
        return LiveOrderMonitor.instance;
    }
    start(intervalMs = 10000) {
        if (this.checkInterval) {
            return;
        }
        this.checkInterval = setInterval(async () => {
            try {
                // Get all active orders
                const activeOrders = await Order_1.default.find({
                    status: {
                        $in: ['PENDING', 'CONFIRMED', 'IN_PREPARATION', 'READY_FOR_PICKUP']
                    }
                });
                // Check for orders that need attention (e.g., pending too long)
                const now = new Date();
                activeOrders.forEach(order => {
                    const orderAge = now.getTime() - order.createdAt.getTime();
                    // Alert if order is pending for more than 5 minutes
                    if (order.status === 'PENDING' && orderAge > 5 * 60 * 1000) {
                        (0, websocket_1.getWebSocketManager)().sendOrderAlert({
                            orderId: order._id,
                            message: 'Order pending for more than 5 minutes',
                            age: orderAge
                        });
                    }
                    // Alert if order is in preparation for more than 30 minutes
                    if (order.status === 'IN_PREPARATION' && orderAge > 30 * 60 * 1000) {
                        (0, websocket_1.getWebSocketManager)().sendOrderAlert({
                            orderId: order._id,
                            message: 'Order in preparation for more than 30 minutes',
                            age: orderAge
                        });
                    }
                });
            }
            catch (error) {
                console.error('Error in LiveOrderMonitor:', error);
            }
        }, intervalMs);
    }
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}
exports.LiveOrderMonitor = LiveOrderMonitor;
