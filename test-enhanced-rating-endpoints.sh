#!/bin/bash

# ENHANCED INSEAT Backend Rating Service Test Script
# Tests all rating endpoints with enhanced decimal rating support and order verification
# Author: Backend Architect
# Date: $(date +%Y-%m-%d)

echo "🎯 INSEAT Enhanced Rating Service Endpoint Tests"
echo "================================================"

# Base URL
BASE_URL="http://localhost:3001"
API_BASE="$BASE_URL/api/v1/ratings"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

# Function to run test
run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_status="$3"
    local description="$4"
    
    echo -e "\n${BLUE}🧪 Testing: $test_name${NC}"
    echo -e "${CYAN}Description: $description${NC}"
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
    
    # Try different user types
    local credentials=(
        '{"email": "customer@test.com", "password": "password123"}'
        '{"email": "admin@test.com", "password": "admin123"}'
        '{"email": "test@inseat.com", "password": "password123"}'
        '{"username": "testuser", "password": "password123"}'
    )
    
    for cred in "${credentials[@]}"; do
        echo "Trying credentials: $cred"
        login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "$cred")
        
        # Extract token from response (try multiple possible fields)
        token=$(echo "$login_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('token', data.get('accessToken', data.get('access_token', data.get('data', {}).get('token', '')))))
except:
    print('')
" 2>/dev/null)
        
        if [ -n "$token" ] && [ "$token" != "" ]; then
            echo -e "${GREEN}✅ Authentication successful${NC}"
            echo "Token: ${token:0:50}..."
            AUTH_HEADER="Authorization: Bearer $token"
            return 0
        fi
    done
    
    echo -e "${YELLOW}⚠️  Could not get auth token, testing public endpoints only${NC}"
    AUTH_HEADER=""
}

# Start testing
echo "Starting enhanced rating service endpoint tests..."

# Get authentication token
get_auth_token

# Sample data for testing
MENU_ITEM_ID="507f1f77bcf86cd799439011"
RESTAURANT_ID="507f1f77bcf86cd799439012"
ORDER_ID="507f1f77bcf86cd799439013"
USER_ID="507f1f77bcf86cd799439014"

echo -e "\n${PURPLE}======================================${NC}"
echo -e "${PURPLE}     BASIC RATING ENDPOINTS TESTS     ${NC}"
echo -e "${PURPLE}======================================${NC}"

# Test 1: Get menu item ratings (public endpoint)
run_test "Get Menu Item Ratings (Public)" \
    "curl -s '$API_BASE/menu-item/$MENU_ITEM_ID'" \
    "200" \
    "Retrieve ratings and reviews for a specific menu item"

# Test 2: Get menu item ratings with pagination and sorting
run_test "Get Menu Item Ratings with Sorting" \
    "curl -s '$API_BASE/menu-item/$MENU_ITEM_ID?page=1&limit=5&sortBy=rating_high'" \
    "200" \
    "Retrieve ratings sorted by highest rating first"

# Test 3: Alternative menu item ratings endpoint
run_test "Get Menu Item Ratings (Alternative Endpoint)" \
    "curl -s '$API_BASE/menu-items/$MENU_ITEM_ID/ratings?sortBy=verified'" \
    "200" \
    "Test alternative endpoint for menu item ratings"

# Test 4: Get restaurant ratings
run_test "Get Restaurant Ratings" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID'" \
    "200" \
    "Retrieve aggregated ratings for a restaurant"

echo -e "\n${PURPLE}======================================${NC}"
echo -e "${PURPLE}    ORDER VERIFICATION TESTS          ${NC}"
echo -e "${PURPLE}======================================${NC}"

# Test 5: Check if user can rate menu item (requires auth)
if [ -n "$AUTH_HEADER" ]; then
    run_test "Check Rating Eligibility" \
        "curl -s -H '$AUTH_HEADER' '$API_BASE/menu-item/$MENU_ITEM_ID/can-rate'" \
        "200" \
        "Check if authenticated user can rate a menu item (order verification)"
else
    run_test "Check Rating Eligibility (No Auth)" \
        "curl -s '$API_BASE/menu-item/$MENU_ITEM_ID/can-rate'" \
        "401" \
        "Should require authentication"
fi

echo -e "\n${PURPLE}======================================${NC}"
echo -e "${PURPLE}    RATING SUBMISSION TESTS            ${NC}"
echo -e "${PURPLE}======================================${NC}"

# Test 6: Submit order-based rating with decimal rating
if [ -n "$AUTH_HEADER" ]; then
    run_test "Submit Order-Based Rating (Decimal)" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE/order-item' \
        -d '{
            \"orderId\": \"$ORDER_ID\",
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"rating\": 4.7,
            \"comment\": \"Excellent dish from my order! The flavors were perfectly balanced.\"
        }'" \
        "201" \
        "Submit a verified purchase rating with decimal rating (4.7)"
else
    run_test "Submit Order-Based Rating (No Auth)" \
        "curl -s -X POST -H 'Content-Type: application/json' \
        '$API_BASE/order-item' \
        -d '{
            \"orderId\": \"$ORDER_ID\",
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"rating\": 4.7,
            \"comment\": \"Should require authentication\"
        }'" \
        "401" \
        "Should require authentication for order-based rating"
fi

# Test 7: Submit general rating with decimal
if [ -n "$AUTH_HEADER" ]; then
    run_test "Submit General Rating (Decimal)" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"restaurantId\": \"$RESTAURANT_ID\",
            \"rating\": 3.8,
            \"comment\": \"Good dish overall, could use more seasoning.\"
        }'" \
        "201" \
        "Submit a general rating with decimal rating (3.8)"
fi

echo -e "\n${PURPLE}======================================${NC}"
echo -e "${PURPLE}    DECIMAL RATING VALIDATION TESTS    ${NC}"
echo -e "${PURPLE}======================================${NC}"

# Test 8: Test various decimal ratings
if [ -n "$AUTH_HEADER" ]; then
    local decimal_ratings=("1.0" "2.5" "3.3" "4.9" "5.0")
    for rating in "${decimal_ratings[@]}"; do
        run_test "Valid Decimal Rating ($rating)" \
            "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
            '$API_BASE' \
            -d '{
                \"menuItemId\": \"507f1f77bcf86cd799439099\",
                \"restaurantId\": \"$RESTAURANT_ID\",
                \"rating\": $rating,
                \"comment\": \"Testing decimal rating $rating\"
            }'" \
            "201" \
            "Test valid decimal rating: $rating"
    done
fi

echo -e "\n${PURPLE}======================================${NC}"
echo -e "${PURPLE}    VALIDATION ERROR TESTS             ${NC}"
echo -e "${PURPLE}======================================${NC}"

# Test 9: Invalid rating values
if [ -n "$AUTH_HEADER" ]; then
    run_test "Invalid Rating (Too High)" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"restaurantId\": \"$RESTAURANT_ID\",
            \"rating\": 6.0,
            \"comment\": \"Invalid rating test\"
        }'" \
        "400" \
        "Should reject ratings above 5.0"

    run_test "Invalid Rating (Too Low)" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"restaurantId\": \"$RESTAURANT_ID\",
            \"rating\": 0.5,
            \"comment\": \"Invalid rating test\"
        }'" \
        "400" \
        "Should reject ratings below 1.0"

    run_test "Invalid Decimal Precision" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"restaurantId\": \"$RESTAURANT_ID\",
            \"rating\": 4.123,
            \"comment\": \"Invalid decimal precision test\"
        }'" \
        "400" \
        "Should reject ratings with more than 1 decimal place"
fi

# Test 10: Missing required fields
if [ -n "$AUTH_HEADER" ]; then
    run_test "Missing Required Fields" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE' \
        -d '{
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"rating\": 4.0
        }'" \
        "400" \
        "Should reject requests missing required fields (restaurantId, comment)"
fi

# Test 11: Invalid ObjectId format
run_test "Invalid Menu Item ID Format" \
    "curl -s '$API_BASE/menu-item/invalid-id'" \
    "400" \
    "Should reject invalid ObjectId format"

echo -e "\n${PURPLE}======================================${NC}"
echo -e "${PURPLE}    ADMIN DASHBOARD TESTS              ${NC}"
echo -e "${PURPLE}======================================${NC}"

# Test 12: Restaurant analytics
run_test "Restaurant Analytics" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID/analytics'" \
    "200" \
    "Get comprehensive rating analytics for restaurant admin dashboard"

# Test 13: Restaurant reviews with pagination
run_test "Restaurant Reviews (Paginated)" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID/reviews?page=1&limit=5&sortBy=rating_low'" \
    "200" \
    "Get restaurant reviews with pagination, sorted by lowest rating"

# Test 14: Menu items performance
run_test "Menu Items Performance" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID/menu-items/performance?sortBy=reviews&limit=10'" \
    "200" \
    "Get menu item performance metrics sorted by review count"

# Test 15: Customer insights
run_test "Customer Insights" \
    "curl -s '$API_BASE/restaurant/$RESTAURANT_ID/customer-insights?period=7d&limit=20'" \
    "200" \
    "Get customer rating insights for the last 7 days"

echo -e "\n${PURPLE}======================================${NC}"
echo -e "${PURPLE}    USER INTERACTION TESTS             ${NC}"
echo -e "${PURPLE}======================================${NC}"

# Test 16: Get user ratings
run_test "Get User Ratings" \
    "curl -s '$API_BASE/user/$USER_ID?page=1&limit=10'" \
    "200" \
    "Get all ratings submitted by a specific user"

# Test 17: Mark review as helpful (requires auth)
if [ -n "$AUTH_HEADER" ]; then
    REVIEW_ID="507f1f77bcf86cd799439015"
    run_test "Mark Review as Helpful" \
        "curl -s -X POST -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE/$REVIEW_ID/helpful' \
        -d '{\"helpful\": true}'" \
        "200" \
        "Mark a review as helpful"
fi

echo -e "\n${PURPLE}======================================${NC}"
echo -e "${PURPLE}    CRUD OPERATIONS TESTS              ${NC}"
echo -e "${PURPLE}======================================${NC}"

# Test 18: Update rating (requires auth)
if [ -n "$AUTH_HEADER" ]; then
    REVIEW_ID="507f1f77bcf86cd799439015"
    run_test "Update Rating" \
        "curl -s -X PUT -H '$AUTH_HEADER' -H 'Content-Type: application/json' \
        '$API_BASE/$REVIEW_ID' \
        -d '{
            \"rating\": 4.2,
            \"comment\": \"Updated review with decimal rating\"
        }'" \
        "200" \
        "Update an existing rating with new decimal value"
fi

# Test 19: Delete rating (requires auth)
if [ -n "$AUTH_HEADER" ]; then
    REVIEW_ID="507f1f77bcf86cd799439015"
    run_test "Delete Rating" \
        "curl -s -X DELETE -H '$AUTH_HEADER' '$API_BASE/$REVIEW_ID'" \
        "200" \
        "Delete a user's own rating"
fi

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "==============="
echo -e "Tests Run: ${YELLOW}$TESTS_RUN${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$((TESTS_RUN - TESTS_PASSED))${NC}"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Rating system is working correctly.${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Some tests failed. Please review the output above.${NC}"
    echo -e "\n${CYAN}💡 Common issues:${NC}"
    echo "- Authentication token not available (create test users first)"
    echo "- Database not populated with test data"
    echo "- Service not running on localhost:3001"
    echo "- MongoDB connection issues"
    exit 1
fi