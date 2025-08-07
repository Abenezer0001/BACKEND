/**
 * WebSocket Client Test Script
 * Run with: node test-socket-client.js
 */
const { io } = require("socket.io-client");

// Configuration
const socketUrl = "http://localhost:3001";
const restaurantId = "6835b1712a4880e9431bd665"; // Use your actual restaurant ID
const socketOptions = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  withCredentials: true,
  transports: ['websocket', 'polling']
};

// Create socket connection
console.log(`Connecting to WebSocket server at ${socketUrl}...`);
const socket = io(socketUrl, socketOptions);

// Connection event handlers
socket.on("connect", () => {
  console.log(`✅ Connected to WebSocket server with socket ID: ${socket.id}`);
  
  // Join restaurant room
  console.log(`Joining room: restaurant:${restaurantId}`);
  socket.emit("joinRoom", `restaurant:${restaurantId}`);
  
  // Test ping-pong
  console.log("Sending ping...");
  socket.emit("ping", (response) => {
    console.log("Ping response:", response);
  });
});

socket.on("welcome", (data) => {
  console.log("Received welcome message:", data);
});

socket.on("connect_error", (error) => {
  console.error(`❌ Connection error: ${error.message}`);
});

socket.on("disconnect", (reason) => {
  console.log(`❌ Disconnected: ${reason}`);
});

// Order event handlers
socket.on("orderCreated", (order) => {
  console.log("🆕 New order received:");
  console.log(JSON.stringify(order, null, 2));
});

socket.on("orderUpdated", (order) => {
  console.log("🔄 Order updated:");
  console.log(JSON.stringify(order, null, 2));
});

socket.on("orderCancelled", (order) => {
  console.log("❌ Order cancelled:");
  console.log(JSON.stringify(order, null, 2));
});

socket.on("orderCompleted", (order) => {
  console.log("✅ Order completed:");
  console.log(JSON.stringify(order, null, 2));
});

// Keep the script running
console.log("WebSocket client is running. Press Ctrl+C to exit.");

// Handle process termination
process.on("SIGINT", () => {
  console.log("Disconnecting from WebSocket server...");
  socket.disconnect();
  process.exit(0);
});
