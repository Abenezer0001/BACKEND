"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const websocket_1 = require("./config/websocket");
const LiveOrderMonitor_1 = require("./services/LiveOrderMonitor");
const index_1 = __importDefault(require("../services/index"));
const events_1 = __importDefault(require("events"));
// Increase max listeners to avoid memory leak warning
events_1.default.defaultMaxListeners = 20;
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// Initialize WebSocket
websocket_1.WebSocketManager.initialize(server);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.disable('x-powered-by');
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
// Initialize LiveOrderMonitor
LiveOrderMonitor_1.LiveOrderMonitor.getInstance().start();
// Routes
app.use('/api', index_1.default);
// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    // Stop LiveOrderMonitor
    LiveOrderMonitor_1.LiveOrderMonitor.getInstance().stop();
    // Cleanup WebSocketManager
    websocket_1.WebSocketManager.getInstance().cleanup();
    // Close server
    server.close(() => {
        console.log('Server closed');
        // Close MongoDB connection
        mongoose_1.default.connection.close().then(() => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
    // Force close if it takes too long
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};
// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
