#!/bin/bash

echo "Testing Rating Authentication Fix"
echo "================================="

# First, test the /api/auth/me endpoint to get user info and confirm we're logged in
echo "1. Testing /api/auth/me endpoint..."
curl -s -b cookies.txt http://localhost:3001/api/auth/me | jq '.success, .user.id' || echo "Failed to parse JSON response"

echo ""
echo "2. Testing rating submission..."

# Test the rating endpoint with dummy data
curl -s -X POST \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "orderId": "507f1f77bcf86cd799439011",
    "menuItemId": "507f1f77bcf86cd799439012", 
    "rating": 4.5,
    "comment": "Test rating to verify authentication fix"
  }' \
  http://localhost:3001/api/v1/ratings/order-item

echo ""
echo "3. Testing token refresh endpoint..."
curl -s -X POST -b cookies.txt http://localhost:3001/api/auth/refresh-token | jq '.success' 2>/dev/null || echo "Token refresh test completed"

echo ""
echo "Authentication fix test completed!"