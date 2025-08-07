#!/bin/bash

# Test auth from the admin perspective
API_URL="http://localhost:3001/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MzViMTcxMmE0ODgwZTk0MzFiZDY2NSIsImVtYWlsIjoiYWRtaW5AaW5zZWF0LmNvbSIsInJvbGUiOiJzeXN0ZW1fYWRtaW4iLCJpYXQiOjE3NDg1MjYyMjAsImV4cCI6MTc0ODYxMjYyMH0.0MOkBFucS19F-JfexZFtnTfqPyev9Hp8TLX3scGiLtE"

echo "Testing admin authentication with both Bearer and Cookie methods:"
echo ""

echo "1. Test with Bearer token only:"
curl -s -X GET "$API_URL/orders" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" | head -5
echo ""
echo ""

echo "2. Test with Cookie only:"
curl -s -X GET "$API_URL/orders" \
-H "Content-Type: application/json" \
--cookie "access_token=$TOKEN" | head -5
echo ""
echo ""

echo "3. Test order status update with Bearer token:"
ORDER_ID="507f1f77bcf86cd799439011"  # Example ObjectId
curl -s -X PUT "$API_URL/orders/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"PREPARING"}'
echo ""
echo ""

echo "4. Test order status update with Cookie:"
curl -s -X PUT "$API_URL/orders/$ORDER_ID/status" \
-H "Content-Type: application/json" \
--cookie "access_token=$TOKEN" \
-d '{"status":"PREPARING"}'
echo ""