#!/bin/bash

# Simple authentication test
API_URL="http://localhost:3001/api/orders"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MzViMTcxMmE0ODgwZTk0MzFiZDY2NSIsImVtYWlsIjoiYWRtaW5AaW5zZWF0LmNvbSIsInJvbGUiOiJzeXN0ZW1fYWRtaW4iLCJpYXQiOjE3NDg1MjYyMjAsImV4cCI6MTc0ODYxMjYyMH0.0MOkBFucS19F-JfexZFtnTfqPyev9Hp8TLX3scGiLtE"

echo "Testing /my-orders endpoint (requires auth):"
curl -v -X GET "$API_URL/my-orders" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN"
echo ""