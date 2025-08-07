#!/bin/bash

# Login to get authentication token
echo "Logging in to get auth token..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"email":"admin@inseat.com","password":"Admin@123456"}')

echo "Auth response: $AUTH_RESPONSE"

# Extract token from cookies
echo "Checking for cookies..."
COOKIES=$(curl -s -I -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"email":"admin@inseat.com","password":"Admin@123456"}' | grep -i 'set-cookie')

echo "Cookies: $COOKIES"

# Create a new order with auth token
echo "Creating a test order..."
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -H "Cookie: $COOKIES" \
  -b "$COOKIES" \
  -d @/home/abenezer/Desktop/work/INSEAT-Backend/test-order.json -v

echo "Done!"
