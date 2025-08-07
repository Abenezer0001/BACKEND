#!/bin/bash

# Test order status endpoint with different status values to see which one works
ORDER_ID="68381815c8ad690f5852683c"
API_URL="http://localhost:3001/api/orders"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MzViMTcxMmE0ODgwZTk0MzFiZDY2NSIsImVtYWlsIjoiYWRtaW5AaW5zZWF0LmNvbSIsInJvbGUiOiJzeXN0ZW1fYWRtaW4iLCJpYXQiOjE3NDg1MDU5NDksImV4cCI6MTc0ODU5MjM0OX0.DhPzRtw5AB0-IN74tNQv4ypDQCDsd8Re5YzM4f1dJCM"

# Check validation middleware to see what it expects
echo "Checking order status validation middleware..."
cat $(find . -path "*/order-service/src/middleware/validation*" -type f) | grep -A 10 "validateUpdateOrder"
echo ""

# Test each valid status value from the enum
echo "Testing with ACCEPTED status"
curl -s -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"ACCEPTED"}'
echo -e "\n\n"

echo "Testing with PREPARING status"
curl -s -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"PREPARING"}'
echo -e "\n\n"

echo "Testing with READY status"
curl -s -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"READY"}'
echo -e "\n\n"

echo "Testing with DELIVERED status"
curl -s -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"DELIVERED"}'
echo -e "\n\n"

echo "Testing with status value converted to proper enum"
curl -v -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"PREPARING", "estimatedPreparationTime": 15}'
echo ""
