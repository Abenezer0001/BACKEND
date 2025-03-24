"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsService = exports.app = exports.server = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const orderRoutes_1 = require("./routes/orderRoutes");
const WebSocketServer_1 = require("./websocket/WebSocketServer");
// Create Express app
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Create HTTP server
const server = http_1.default.createServer(app);
exports.server = server;
// Initialize WebSocket server
const wsService = (0, WebSocketServer_1.initializeWebSocketServer)(server);
exports.wsService = wsService;
// Set up routes with WebSocket service
const orderRouter = (0, orderRoutes_1.createOrderRoutes)(wsService);
app.use('/api', orderRouter);
// Database connection
const connectDB = async () => {
    try {
        await mongoose_1.default.connect('mongodb://localhost:27017/inseat', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
// Start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`WebSocket server initialized`);
    });
});
