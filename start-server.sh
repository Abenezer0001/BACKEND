#!/bin/bash

# Simple server startup script for INSEAT Backend

echo "Starting INSEAT Backend Server..."

# Set environment variables
export NODE_ENV=development
export PORT=3001

# Kill any existing processes
pkill -f "ts-node.*app.ts" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Navigate to the project directory
cd "$(dirname "$0")"

# Start the server
echo "Starting server on port $PORT..."
npx ts-node -r tsconfig-paths/register ./src/app.ts &

# Store the PID
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# Function to cleanup on exit
cleanup() {
    echo "Shutting down server..."
    kill $SERVER_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for server to start
echo "Waiting for server to initialize..."
sleep 10

# Test if server is responding
if curl -s --max-time 5 "http://localhost:$PORT/health" > /dev/null 2>&1; then
    echo "✅ Server is responding at http://localhost:$PORT"
else
    echo "⚠️  Server may still be initializing. Check logs above."
fi

# Keep the script running
wait $SERVER_PID 