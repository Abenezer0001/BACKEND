#!/bin/bash

# Script to test order status update with both upper and lowercase status values
ORDER_ID="68381815c8ad690f5852683c"
API_URL="http://localhost:3001/api/orders"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MzViMTcxMmE0ODgwZTk0MzFiZDY2NSIsImVtYWlsIjoiYWRtaW5AaW5zZWF0LmNvbSIsInJvbGUiOiJzeXN0ZW1fYWRtaW4iLCJpYXQiOjE3NDg1MDU5NDksImV4cCI6MTc0ODU5MjM0OX0.DhPzRtw5AB0-IN74tNQv4ypDQCDsd8Re5YzM4f1dJCM"

echo "=== TESTING FIX FOR ORDER STATUS VALIDATION ==="
echo ""

# Test with UPPERCASE (original approach) - should fail
echo "Testing with UPPERCASE (original, expected to fail):"
curl -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"READY"}'
echo -e "\n\n"

# Test with lowercase (fixed approach) - should succeed
echo "Testing with lowercase (fixed approach, expected to succeed):"
curl -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"ready"}'
echo -e "\n\n"

# Test with lowercase and additional params
echo "Testing with lowercase and estimated time (full params):"
curl -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"preparing", "estimatedPreparationTime": 15}'
echo -e "\n\n"
