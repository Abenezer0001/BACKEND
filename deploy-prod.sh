#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=================================================================================="
echo "                        PRODUCTION Backend Deployment                            "
echo "=================================================================================="
echo ""

print_status "Stopping existing production containers..."
docker compose -f docker-compose.prod.yml down || true

print_status "Building production Docker image..."
if docker compose -f docker-compose.prod.yml build --no-cache; then
    print_success "Docker image built successfully"
else
    print_error "Failed to build Docker image"
    exit 1
fi

print_status "Starting production application..."
if docker compose -f docker-compose.prod.yml up -d; then
    print_success "Application started successfully"
else
    print_error "Failed to start application"
    exit 1
fi

print_status "Checking application health..."
sleep 15

max_attempts=12
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Production application is healthy and responding on port 3001"
        break
    fi
    
    print_status "Health check attempt $attempt/$max_attempts - waiting..."
    sleep 5
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    print_error "Application failed health check after $max_attempts attempts"
    print_status "Checking logs..."
    docker compose -f docker-compose.prod.yml logs --tail 20
    exit 1
fi

print_status "Current production deployment status:"
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""

echo "=================================================================================="
print_success "PRODUCTION Deployment completed successfully!"
echo "Application is running on: http://localhost:3001"
echo "Health check endpoint: http://localhost:3001/health"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Check status: docker compose -f docker-compose.prod.yml ps"
echo "  - Stop application: docker compose -f docker-compose.prod.yml down"
echo "=================================================================================="
