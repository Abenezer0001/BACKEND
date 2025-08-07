#!/bin/bash

# Test the entire authentication flow
API_URL="http://localhost:3001/api"
ORDER_ID="68381815c8ad690f5852683c"

echo "=== TESTING AUTHENTICATION FLOW ==="
echo "1. Verify service is running with health check:"
curl -s $API_URL/health
echo -e "\n\n"

echo "2. Testing login:"
curl -v -X POST "$API_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{"email":"admin@inseat.com","password":"admin123"}' \
--cookie-jar cookies.txt
echo -e "\n\n"

echo "3. Testing token refresh with saved cookies:"
curl -v -X POST "$API_URL/auth/refresh-token" \
--cookie cookies.txt
echo -e "\n\n"

echo "4. Test order status update using cookies (no manual Bearer token):"
curl -v -X PUT "$API_URL/orders/$ORDER_ID/status" \
-H "Content-Type: application/json" \
-d '{"status":"preparing"}' \
--cookie cookies.txt
echo -e "\n\n"

echo "5. Verify order status was updated:"
curl -s -X GET "$API_URL/orders/$ORDER_ID" \
--cookie cookies.txt | grep -o '"status":"[^"]*"'
echo -e "\n"
