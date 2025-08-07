#!/bin/bash

# Quick deployment script for development
# This script provides faster deployment for development iterations

echo "🚀 Quick Deploy - INSEAT Backend"
echo "=================================="

# Stop existing containers
echo "📦 Stopping containers..."
docker compose down

# Rebuild and start
echo "🔨 Building and starting..."
docker compose up -d --build

# Quick health check
echo "🏥 Checking health..."
sleep 5

if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Application is running!"
    echo "🌐 Available at: http://localhost:3001"
    echo "📊 Health check: http://localhost:3001/health"
else
    echo "❌ Health check failed. Checking logs..."
    docker compose logs --tail 10
fi

echo ""
echo "📋 Container status:"
docker compose ps

echo ""
echo "💡 Quick commands:"
echo "   - View logs: docker compose logs -f"
echo "   - Full deploy: ./deploy.sh"
echo "   - Stop: docker compose down" 