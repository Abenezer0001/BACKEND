#!/bin/bash

# INSEAT Backend Rating Service Test Script
# Tests all rating endpoints with proper authentication

echo "🎯 INSEAT Rating Service Endpoint Tests"
echo "========================================"

# Base URL
BASE_URL="http://localhost:3001"
API_BASE="$BASE_URL/api/v1/ratings"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

# Function to run test
run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_status="$3"
    
    echo -e "\n${BLUE}🧪 Testing: $test_name${NC}"
    echo "Command: $curl_command"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    # Execute curl command and capture response
    response=$(eval "$curl_command" 2>/dev/null)
    status_code=$(eval "$curl_command" -w "%{http_code}" -o /dev/null -s 2>/dev/null)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (Status: $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Pretty print JSON response if it exists
        if [[ $response == *"{"* ]]; then
            echo "Response:"
            echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        echo "Response: $response"
    fi
}

# Function to get auth token
get_auth_token() {
    echo -e "\n${YELLOW}🔐 Attempting to get authentication token...${NC}"
    
    # Try to login and get token (adjust credentials as needed)
    login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "customer@test.com", 
            "password": "password123"
        }')
    
    # Extract token from response (adjust based on your auth response format)
    token=$(echo "$login_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('token', data.get('accessToken', data.get('access_token', ''))))
except:
    print('')
" 2>/dev/null)
    
    if [ -n "$token" ]; then
        echo -e "${GREEN}✅ Authentication successful${NC}"
        echo "Token: ${token:0:50}..."
        AUTH_HEADER="Authorization: Bearer $token"
    else
        echo -e "${YELLOW}⚠️  Could not get auth token, testing public endpoints only${NC}"
        echo "Login response: $login_response"
        AUTH_HEADER=""
    fi
}

# Start testing
echo "Starting rating service endpoint tests..."

# Get authentication token
get_auth_token

# Test 1: Health check
run_test "Rating Service Health Check" \
    "curl -s '$API_BASE/health'" \
    "404"

# Test 2: Get menu item ratings (public endpoint)
MENU_ITEM_ID="507f1f77bcf86cd799439011"  # Sample ObjectId
run_test "Get Menu Item Ratings (Public)" \
    "curl -s '$API_BASE/menu-item/$MENU_ITEM_ID'" \
    "200"

# Test 3: Get restaurant ratings
RESTAURANT_ID="507f1f77bcf86cd799439012"  # Sample ObjectId
run_test "Get Restaurant Ratings" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID'" \
    "200"

# Test 4: Check if user can rate menu item (requires auth)
if [ -n "$AUTH_HEADER" ]; then
    run_test "Check If User Can Rate Menu Item" \
        "curl -s -H '$AUTH_HEADER' '$API_BASE/menu-item/$MENU_ITEM_ID/can-rate'" \
        "200"
else
    run_test "Check If User Can Rate Menu Item (No Auth)" \
        "curl -s '$API_BASE/menu-item/$MENU_ITEM_ID/can-rate'" \
        "401"
fi

# Test 5: Submit a rating (requires auth)
if [ -n "$AUTH_HEADER" ]; then
    run_test "Submit Rating" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"restaurantId\": \"$RESTAURANT_ID\",
            \"rating\": 4.5,
            \"comment\": \"Great dish! Really enjoyed it.\"
        }'" \
        "201"
else
    run_test "Submit Rating (No Auth)" \
        "curl -s -X POST -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"restaurantId\": \"$RESTAURANT_ID\",
            \"rating\": 4.5,
            \"comment\": \"Great dish! Really enjoyed it.\"
        }'" \
        "401"
fi

# Test 5a: Submit order-based rating (NEW ENDPOINT - requires auth)
ORDER_ID="507f1f77bcf86cd799439013"  # Sample ObjectId
if [ -n "$AUTH_HEADER" ]; then
    run_test "Submit Order-Based Rating" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE/order-item' \
        -d '{
            \"orderId\": \"$ORDER_ID\",
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"rating\": 5,
            \"comment\": \"Excellent dish from my order! Highly recommend.\"
        }'" \
        "201"
else
    run_test "Submit Order-Based Rating (No Auth)" \
        "curl -s -X POST -H 'Content-Type: application/json' \
        '$API_BASE/order-item' \
        -d '{
            \"orderId\": \"$ORDER_ID\",
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"rating\": 5,
            \"comment\": \"Excellent dish from my order! Highly recommend.\"
        }'" \
        "401"
fi

# Test 5b: Get menu item ratings (alternative endpoint)
run_test "Get Menu Item Ratings (Alternative Endpoint)" \
    "curl -s '$API_BASE/menu-items/$MENU_ITEM_ID/ratings?page=1&limit=5&sortBy=rating_high'" \
    "200"

# Test 6: Restaurant Analytics (Admin endpoint)
run_test "Restaurant Analytics" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID/analytics'" \
    "200"

# Test 7: Restaurant Reviews with Pagination
run_test "Restaurant Reviews" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID/reviews?page=1&limit=5'" \
    "200"

# Test 8: Menu Items Performance
run_test "Menu Items Performance" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID/menu-items/performance'" \
    "200"

# Test 9: Customer Insights
run_test "Customer Insights" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID/customer-insights?period=30d'" \
    "200"

# Test 10: Invalid ObjectId handling
run_test "Invalid Menu Item ID" \
    "curl -s '$API_BASE/menu-item/invalid-id'" \
    "400"

# Test 11: Invalid rating value
if [ -n "$AUTH_HEADER" ]; then
    run_test "Invalid Rating Value" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"restaurantId\": \"$RESTAURANT_ID\",
            \"rating\": 6,
            \"comment\": \"Invalid rating test\"
        }'" \
        "400"
fi

# Test 12: Missing required fields
if [ -n "$AUTH_HEADER" ]; then
    run_test "Missing Required Fields" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"rating\": 4.0
        }'" \
        "400"
fi

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "==============="
echo -e "Tests Run: ${YELLOW}$TESTS_RUN${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$((TESTS_RUN - TESTS_PASSED))${NC}"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi