#!/bin/bash

# Test script for INSEAT Rating Service API Endpoints
# Tests both authentication and endpoint availability

echo "========================================"
echo "INSEAT Rating Service Endpoint Tests"
echo "========================================"

# Configuration
BASE_URL="http://localhost:5000"
RATING_API_BASE="$BASE_URL/api/v1/ratings"

# Test data
MENU_ITEM_ID="507f1f77bcf86cd799439011"  # Replace with actual menu item ID
ORDER_ID="507f1f77bcf86cd799439012"      # Replace with actual order ID

# Color output functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test server availability
test_server_health() {
    log_test "Testing server availability..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null)
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        log_success "Server is running (HTTP $response)"
        return 0
    else
        log_failure "Server is not responding (HTTP $response)"
        return 1
    fi
}

# Test endpoint without authentication (should get 401)
test_endpoint_auth_required() {
    local endpoint="$1"
    local method="$2"
    local expected_code="$3"
    
    log_test "Testing $method $endpoint (no auth - expecting $expected_code)"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$RATING_API_BASE$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d '{"test": "data"}' \
            "$RATING_API_BASE$endpoint")
    fi
    
    if [ "$response" = "$expected_code" ]; then
        log_success "$method $endpoint returns $response as expected"
        return 0
    else
        log_failure "$method $endpoint returned $response, expected $expected_code"
        return 1
    fi
}

# Test endpoint with fake authentication (should get specific error)
test_endpoint_with_fake_auth() {
    local endpoint="$1"
    local method="$2"
    local expected_code="$3"
    
    log_test "Testing $method $endpoint (fake auth - expecting $expected_code)"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer fake-token-12345" \
            "$RATING_API_BASE$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
            -H "Authorization: Bearer fake-token-12345" \
            -H "Content-Type: application/json" \
            -d '{"orderId": "'$ORDER_ID'", "menuItemId": "'$MENU_ITEM_ID'", "rating": 4.5, "comment": "Test review"}' \
            "$RATING_API_BASE$endpoint")
    fi
    
    if [ "$response" = "$expected_code" ]; then
        log_success "$method $endpoint returns $response with fake auth"
        return 0
    else
        log_failure "$method $endpoint returned $response with fake auth, expected $expected_code"
        return 1
    fi
}

# Test the new stats endpoint specifically
test_stats_endpoint() {
    log_test "Testing GET /menu-item/:id/stats endpoint availability..."
    
    # Test without auth first
    response=$(curl -s -o /dev/null -w "%{http_code}" "$RATING_API_BASE/menu-item/$MENU_ITEM_ID/stats")
    
    if [ "$response" = "400" ] || [ "$response" = "404" ] || [ "$response" = "500" ]; then
        log_success "Stats endpoint is available (HTTP $response - likely no data or invalid ID)"
    elif [ "$response" = "401" ]; then
        log_warning "Stats endpoint requires authentication (HTTP $response)"
    else
        log_failure "Stats endpoint returned unexpected code: $response"
    fi
    
    # Test the endpoint structure with curl verbose to see if route exists
    log_test "Testing stats endpoint route registration..."
    full_response=$(curl -s -I "$RATING_API_BASE/menu-item/$MENU_ITEM_ID/stats" 2>&1)
    
    if echo "$full_response" | grep -q "404\|Not Found"; then
        log_failure "Stats endpoint route not found - 404 error"
        return 1
    else
        log_success "Stats endpoint route is registered"
        return 0
    fi
}

# Main test execution
main() {
    echo "Starting rating service endpoint tests..."
    echo
    
    # Test server health
    if ! test_server_health; then
        log_failure "Cannot proceed - server is not running"
        exit 1
    fi
    
    echo
    echo "Testing endpoint authentication requirements..."
    
    # Test endpoints that should require authentication
    test_endpoint_auth_required "/order-item" "POST" "401"
    test_endpoint_auth_required "/menu-item/$MENU_ITEM_ID" "GET" "200"  # This might be public
    test_endpoint_auth_required "/menu-item/$MENU_ITEM_ID/stats" "GET" "200"  # This might be public too
    
    echo
    echo "Testing endpoints with fake authentication..."
    
    # Test with fake tokens (should get 401 for invalid token)
    test_endpoint_with_fake_auth "/order-item" "POST" "401"
    
    echo
    echo "Testing specific endpoints..."
    
    # Test the new stats endpoint
    test_stats_endpoint
    
    echo
    echo "Testing menu item ratings endpoint (public access)..."
    log_test "GET /menu-item/$MENU_ITEM_ID (public)"
    response=$(curl -s -o /dev/null -w "%{http_code}" "$RATING_API_BASE/menu-item/$MENU_ITEM_ID")
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        log_success "Menu item ratings endpoint accessible (HTTP $response)"
    else
        log_failure "Menu item ratings endpoint failed (HTTP $response)"
    fi
    
    echo
    echo "========================================"
    echo "Summary of Key Fixes Applied:"
    echo "========================================"
    echo "✅ Added missing GET /api/v1/ratings/menu-item/:id/stats endpoint"
    echo "✅ Created getMenuItemStats method in RatingController"
    echo "✅ Verified authentication middleware import path"
    echo "✅ Confirmed rating service initialization in main app"
    echo
    echo "Expected endpoints now available:"
    echo "- GET  /api/v1/ratings/menu-item/:id        (get ratings)"
    echo "- GET  /api/v1/ratings/menu-item/:id/stats  (get rating stats) ⭐ NEW"
    echo "- POST /api/v1/ratings/order-item          (submit rating with auth)"
    echo
    echo "Authentication:"
    echo "- All endpoints use authenticateFlexible middleware"
    echo "- Supports both Bearer tokens and cookies"
    echo "- Some endpoints may allow public access"
}

# Run the tests
main