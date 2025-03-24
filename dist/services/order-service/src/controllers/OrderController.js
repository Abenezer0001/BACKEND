"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const Order_1 = __importDefault(require("../models/Order"));
class OrderController {
    constructor(wsService) {
        this.wsService = wsService;
    }
    // Create a new order
    async create(req, res) {
        try {
            const orderData = req.body;
            // Calculate total amount
            orderData.totalAmount = orderData.items.reduce((total, item) => {
                const modifiersTotal = item.modifiers.reduce((modTotal, mod) => modTotal + mod.price, 0);
                return total + (item.quantity * (item.price + modifiersTotal));
            }, 0);
            const order = new Order_1.default(orderData);
            const savedOrder = await order.save();
            // Notify connected clients about the new order
            if (this.wsService) {
                this.wsService.notifyNewOrder(savedOrder);
            }
            res.status(201).json(savedOrder);
        }
        catch (error) {
            res.status(500).json({ error: 'Error creating order' });
        }
    }
    // Get all orders
    async getAll(req, res) {
        try {
            const { restaurantId } = req.query;
            const query = restaurantId ? { restaurantId } : {};
            const orders = await Order_1.default.find(query);
            res.status(200).json(orders);
        }
        catch (error) {
            res.status(500).json({ error: 'Error fetching orders' });
        }
    }
    // Get order by ID
    async getById(req, res) {
        try {
            const order = await Order_1.default.findById(req.params.id);
            if (!order) {
                res.status(404).json({ error: 'Order not found' });
                return;
            }
            res.status(200).json(order);
        }
        catch (error) {
            res.status(500).json({ error: 'Error fetching order' });
        }
    }
    // Update order status
    async updateStatus(req, res) {
        try {
            const { status } = req.body;
            const order = await Order_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
            if (!order) {
                res.status(404).json({ error: 'Order not found' });
                return;
            }
            // Notify connected clients about the order update
            if (this.wsService) {
                this.wsService.notifyOrderUpdate(order);
            }
            res.status(200).json(order);
        }
        catch (error) {
            res.status(500).json({ error: 'Error updating order status' });
        }
    }
    // Update payment status
    async updatePaymentStatus(req, res) {
        try {
            const { paymentStatus } = req.body;
            const order = await Order_1.default.findByIdAndUpdate(req.params.id, { paymentStatus }, { new: true });
            if (!order) {
                res.status(404).json({ error: 'Order not found' });
                return;
            }
            // Notify connected clients about the order update
            if (this.wsService) {
                this.wsService.notifyOrderUpdate(order);
            }
            res.status(200).json(order);
        }
        catch (error) {
            res.status(500).json({ error: 'Error updating payment status' });
        }
    }
    // Cancel order
    async cancel(req, res) {
        try {
            const order = await Order_1.default.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
            if (!order) {
                res.status(404).json({ error: 'Order not found' });
                return;
            }
            // Notify connected clients about the order cancellation
            if (this.wsService) {
                this.wsService.notifyOrderCancellation(order);
            }
            res.status(200).json(order);
        }
        catch (error) {
            res.status(500).json({ error: 'Error cancelling order' });
        }
    }
    // Get orders by table
    async getByTable(req, res) {
        try {
            const { restaurantId, tableNumber } = req.params;
            const orders = await Order_1.default.find({
                restaurantId,
                tableNumber,
                status: { $nin: ['delivered', 'cancelled'] }
            });
            res.status(200).json(orders);
        }
        catch (error) {
            res.status(500).json({ error: 'Error fetching orders by table' });
        }
    }
}
exports.OrderController = OrderController;
