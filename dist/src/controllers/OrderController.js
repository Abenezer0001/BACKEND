"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const Order_1 = require("../models/Order");
const websocket_1 = require("../config/websocket");
class OrderController {
    async createOrder(req, res) {
        try {
            const orderData = req.body;
            // Add required fields if not present
            if (orderData.items) {
                orderData.items = orderData.items.map((item) => ({
                    ...item,
                    subtotal: item.price * item.quantity,
                    menuItem: item.menuItemId // Ensure menuItem is set from menuItemId
                }));
            }
            const order = new Order_1.Order(orderData);
            await order.save();
            // Convert to plain object before sending to WebSocket
            const plainOrder = order.toObject();
            // Notify connected clients about new order
            (0, websocket_1.getWebSocketManager)().notifyNewOrder(plainOrder);
            res.status(201).json(order);
        }
        catch (error) {
            console.error('Error creating order:', error);
            res.status(500).json({ error: 'Error creating order' });
        }
    }
    async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const order = await Order_1.Order.findByIdAndUpdate(id, { status }, { new: true });
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
            // Convert to plain object before sending to WebSocket
            const plainOrder = order.toObject();
            // Notify connected clients about order update
            (0, websocket_1.getWebSocketManager)().notifyOrderUpdate(plainOrder);
            res.json(order);
        }
        catch (error) {
            console.error('Error updating order:', error);
            res.status(500).json({ error: 'Error updating order' });
        }
    }
    async getLiveOrders(req, res) {
        try {
            const orders = await Order_1.Order.find({
                status: {
                    $in: ['PENDING', 'CONFIRMED', 'IN_PREPARATION', 'READY_FOR_PICKUP']
                }
            }).sort({ createdAt: -1 });
            res.json(orders);
        }
        catch (error) {
            console.error('Error fetching live orders:', error);
            res.status(500).json({ error: 'Error fetching live orders' });
        }
    }
}
exports.OrderController = OrderController;
