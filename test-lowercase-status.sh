#!/bin/bash

# Test order status endpoint with lowercase status values
ORDER_ID="68381815c8ad690f5852683c"
API_URL="http://localhost:3001/api/orders"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MzViMTcxMmE0ODgwZTk0MzFiZDY2NSIsImVtYWlsIjoiYWRtaW5AaW5zZWF0LmNvbSIsInJvbGUiOiJzeXN0ZW1fYWRtaW4iLCJpYXQiOjE3NDg1MDU5NDksImV4cCI6MTc0ODU5MjM0OX0.DhPzRtw5AB0-IN74tNQv4ypDQCDsd8Re5YzM4f1dJCM"

# Test with lowercase status value
echo "Testing with lowercase preparing status:"
curl -v -X PUT "$API_URL/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"status":"preparing"}'
echo ""
