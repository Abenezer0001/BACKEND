#!/bin/bash

# Test order status endpoint with proper authentication
API_URL="http://localhost:3001/api/orders"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MzViMTcxMmE0ODgwZTk0MzFiZDY2NSIsImVtYWlsIjoiYWRtaW5AaW5zZWF0LmNvbSIsInJvbGUiOiJzeXN0ZW1fYWRtaW4iLCJpYXQiOjE3NDg1MjYyMjAsImV4cCI6MTc0ODYxMjYyMH0.0MOkBFucS19F-JfexZFtnTfqPyev9Hp8TLX3scGiLtE"

echo "1. Testing get all orders (should work without auth):"
curl -s "$API_URL" | head -5
echo ""
echo ""

echo "2. Testing with a random order ID for status update:"
# Using a properly formatted ObjectId
ORDER_ID="507f1f77bcf86cd799439011" 
echo "Trying to update order $ORDER_ID status to PREPARING"
curl -v -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"PREPARING"}'
echo ""
echo ""

echo "3. Testing with cookies as well:"
curl -v -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
--cookie "access_token=$TOKEN" \
-d '{"status":"PREPARING"}'
echo ""