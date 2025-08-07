#!/bin/bash

# INSEAT Promotion API Test Script
# This script tests all promotion endpoints with proper authentication

BASE_URL="http://localhost:3001"
API_BASE="$BASE_URL/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  INSEAT Promotion API Test Suite${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Function to print test result
print_result() {
    local test_name="$1"
    local status_code="$2"
    local expected="$3"
    
    if [ "$status_code" == "$expected" ]; then
        echo -e "${GREEN}✓ PASS${NC} - $test_name (Status: $status_code)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} - $test_name (Expected: $expected, Got: $status_code)"
        ((TESTS_FAILED++))
    fi
}

echo -e "${YELLOW}1. Testing Health Endpoint${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
print_result "Health Check" "$response" "200"
echo ""

echo -e "${YELLOW}2. Testing Authentication Required Endpoints${NC}"
echo "   These should return 401 (Unauthorized) without authentication:"

# Test admin-promotions endpoint without auth
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/admin-promotions?restaurantId=test")
print_result "GET /api/admin-promotions (no auth)" "$response" "401"

# Test restaurants endpoint without auth
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/restaurants")
print_result "GET /api/restaurants (no auth)" "$response" "401"

# Test specific promotion without auth
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/admin-promotions/testid")
print_result "GET /api/admin-promotions/testid (no auth)" "$response" "401"

# Test create promotion without auth
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/admin-promotions" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}')
print_result "POST /api/admin-promotions (no auth)" "$response" "401"

# Test update promotion without auth
response=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$API_BASE/admin-promotions/testid" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}')
print_result "PUT /api/admin-promotions/testid (no auth)" "$response" "401"

# Test delete promotion without auth
response=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_BASE/admin-promotions/testid")
print_result "DELETE /api/admin-promotions/testid (no auth)" "$response" "401"

# Test menu items endpoint without auth
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/admin-promotions/restaurants/testid/menu-items")
print_result "GET /api/admin-promotions/restaurants/testid/menu-items (no auth)" "$response" "401"

# Test venues endpoint without auth
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/admin-promotions/restaurants/testid/venues")
print_result "GET /api/admin-promotions/restaurants/testid/venues (no auth)" "$response" "401"

# Test restaurants by business without auth
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/restaurants/business/testid")
print_result "GET /api/restaurants/business/testid (no auth)" "$response" "401"

echo ""
echo -e "${YELLOW}3. Testing Invalid Routes${NC}"

# Test non-existent promotion endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/non-existent-endpoint")
print_result "GET /api/non-existent-endpoint" "$response" "404"

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}           Test Summary${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    exit 1
fi 