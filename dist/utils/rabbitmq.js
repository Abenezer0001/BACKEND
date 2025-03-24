"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqplib_1 = __importDefault(require("amqplib"));
class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
    }
    static getInstance() {
        if (!RabbitMQService.instance) {
            RabbitMQService.instance = new RabbitMQService();
        }
        return RabbitMQService.instance;
    }
    async connect() {
        try {
            this.connection = await amqplib_1.default.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
            this.channel = await this.connection.createChannel();
            // Define queues
            await this.channel.assertQueue('order_created', { durable: true });
            await this.channel.assertQueue('order_updated', { durable: true });
            await this.channel.assertQueue('payment_processed', { durable: true });
            await this.channel.assertQueue('notification', { durable: true });
            console.log('Connected to RabbitMQ');
        }
        catch (error) {
            console.error('RabbitMQ connection error:', error);
            throw error;
        }
    }
    async publishMessage(queue, message) {
        if (!this.channel) {
            throw new Error('Channel not established');
        }
        try {
            this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
        }
        catch (error) {
            console.error('Error publishing message:', error);
            throw error;
        }
    }
    async consumeMessage(queue, callback) {
        if (!this.channel) {
            throw new Error('Channel not established');
        }
        try {
            await this.channel.consume(queue, (message) => {
                var _a;
                if (message) {
                    const content = JSON.parse(message.content.toString());
                    callback(content);
                    (_a = this.channel) === null || _a === void 0 ? void 0 : _a.ack(message);
                }
            });
        }
        catch (error) {
            console.error('Error consuming message:', error);
            throw error;
        }
    }
    async closeConnection() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
        }
        catch (error) {
            console.error('Error closing RabbitMQ connection:', error);
            throw error;
        }
    }
}
exports.default = RabbitMQService;
