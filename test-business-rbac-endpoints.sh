#!/bin/bash

# Business RBAC Endpoints Testing Script
# This script tests all the business RBAC endpoints that were implemented

BASE_URL="http://localhost:3001"
API_BASE="$BASE_URL/api"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Log function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
}

error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to make HTTP requests and check responses
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    local auth_header="$5"
    local data="$6"
    
    ((TOTAL_TESTS++))
    
    log "Testing: $description"
    log "  $method $endpoint"
    
    # Build curl command
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_header'"
    fi
    
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$API_BASE$endpoint'"
    
    # Execute request
    local response=$(eval $curl_cmd)
    local http_code="${response: -3}"
    local body="${response%???}"
    
    # Check if response matches expected status
    if [ "$http_code" = "$expected_status" ]; then
        success "$description - Status: $http_code"
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo "    Response: ${body:0:200}..."
        fi
    else
        error "$description - Expected: $expected_status, Got: $http_code"
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo "    Response: ${body:0:200}..."
        fi
    fi
    
    echo ""
}

# Function to extract token from login response
extract_token() {
    local response="$1"
    echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4
}

# Function to get business data from database
get_business_data() {
    log "Getting business data from database..."
    
    # Get Cinema City business info
    local business_query='db.businesses.findOne({name: "Cinema City"})'
    BUSINESS_DATA=$(echo "$business_query" | mongosh --quiet inseat --eval "print(JSON.stringify($business_query))")
    
    if [ "$BUSINESS_DATA" = "null" ]; then
        error "Cinema City business not found in database"
        exit 1
    fi
    
    BUSINESS_ID=$(echo "$BUSINESS_DATA" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    OWNER_ID=$(echo "$BUSINESS_DATA" | grep -o '"ownerId":"[^"]*"' | cut -d'"' -f4)
    
    log "Business ID: $BUSINESS_ID"
    log "Owner ID: $OWNER_ID"
    
    # Get owner credentials
    local owner_query="db.users.findOne({_id: ObjectId('$OWNER_ID')})"
    OWNER_DATA=$(echo "$owner_query" | mongosh --quiet inseat --eval "print(JSON.stringify($owner_query))")
    
    OWNER_EMAIL=$(echo "$OWNER_DATA" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    log "Owner Email: $OWNER_EMAIL"
    
    # Create a test SuperAdmin user for testing
    local superadmin_query='
    db.users.findOneAndUpdate(
        {email: "superadmin@inseat.com"},
        {
            $set: {
                email: "superadmin@inseat.com",
                password: "$2b$10$rZ3qp7r8p7r8p7r8p7r8p7.", // password: "admin123"
                firstName: "Super",
                lastName: "Admin",
                role: "system_admin",
                isPasswordSet: true,
                roles: [],
                isActive: true
            }
        },
        {upsert: true, returnDocument: "after"}
    )'
    
    mongosh --quiet inseat --eval "$superadmin_query" > /dev/null
    success "SuperAdmin user created/updated"
}

# Function to login and get tokens
login_user() {
    local email="$1"
    local password="$2"
    local role="$3"
    
    log "Attempting to login $role: $email"
    
    local login_data="{\"email\":\"$email\",\"password\":\"$password\"}"
    local login_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$login_data" \
        "$API_BASE/auth/login")
    
    if echo "$login_response" | grep -q "accessToken"; then
        local token=$(extract_token "$login_response")
        success "Login successful for $email"
        echo "$token"
    else
        error "Login failed for $email"
        echo "Response: $login_response"
        echo ""
    fi
}

# Function to test server availability
test_server() {
    log "Testing server availability..."
    
    local health_response=$(curl -s -w '%{http_code}' "$BASE_URL/health")
    local http_code="${health_response: -3}"
    
    if [ "$http_code" = "200" ]; then
        success "Server is running on $BASE_URL"
        return 0
    else
        error "Server is not responding on $BASE_URL (Status: $http_code)"
        warning "Make sure the server is running with: npm start"
        return 1
    fi
}

# Main testing function
run_tests() {
    log "=== Starting Business RBAC Endpoints Testing ==="
    echo ""
    
    # Test server availability
    if ! test_server; then
        exit 1
    fi
    
    # Get business data
    get_business_data
    
    # Login as SuperAdmin
    SUPERADMIN_TOKEN=$(login_user "superadmin@inseat.com" "admin123" "SuperAdmin")
    
    # Login as Business Owner
    OWNER_TOKEN=$(login_user "$OWNER_EMAIL" "temp-password-123" "Business Owner")
    
    echo ""
    log "=== Testing Business Management Endpoints ==="
    echo ""
    
    # Test 1: Get all businesses (SuperAdmin only)
    test_endpoint "GET" "/admin/businesses" "200" "Get all businesses (SuperAdmin)" "$SUPERADMIN_TOKEN"
    
    # Test 2: Get all businesses (Business Owner - should fail)
    test_endpoint "GET" "/admin/businesses" "403" "Get all businesses (Business Owner - should fail)" "$OWNER_TOKEN"
    
    # Test 3: Get specific business (SuperAdmin)
    test_endpoint "GET" "/admin/businesses/$BUSINESS_ID" "200" "Get business by ID (SuperAdmin)" "$SUPERADMIN_TOKEN"
    
    # Test 4: Get specific business (Business Owner - their own business)
    test_endpoint "GET" "/admin/businesses/$BUSINESS_ID" "200" "Get business by ID (Owner - own business)" "$OWNER_TOKEN"
    
    # Test 5: Get my business (Business Owner)
    test_endpoint "GET" "/businesses/my-business" "200" "Get my business (Business Owner)" "$OWNER_TOKEN"
    
    # Test 6: Get my business (SuperAdmin - should work)
    test_endpoint "GET" "/businesses/my-business" "200" "Get my business (SuperAdmin)" "$SUPERADMIN_TOKEN"
    
    # Test 7: Create new business (SuperAdmin only)
    local new_business_data='{
        "name": "Test Cinema Chain",
        "legalName": "Test Cinema Chain Ltd.",
        "registrationNumber": "TCC-2024-001",
        "contactInfo": {
            "phone": "+1-555-9999",
            "email": "admin@testcinema.com",
            "address": "456 Test Ave, Test City, CA 90210, USA"
        },
        "ownerEmail": "testowner@testcinema.com"
    }'
    test_endpoint "POST" "/admin/businesses" "201" "Create new business (SuperAdmin)" "$SUPERADMIN_TOKEN" "$new_business_data"
    
    # Test 8: Create new business (Business Owner - should fail)
    test_endpoint "POST" "/admin/businesses" "403" "Create new business (Business Owner - should fail)" "$OWNER_TOKEN" "$new_business_data"
    
    # Test 9: Update business (SuperAdmin)
    local update_data='{"contactInfo": {"phone": "+1-555-0124", "email": "admin@cinemacity.com", "address": "123 Entertainment Blvd, Downtown, CA 90210, USA"}}'
    test_endpoint "PUT" "/admin/businesses/$BUSINESS_ID" "200" "Update business (SuperAdmin)" "$SUPERADMIN_TOKEN" "$update_data"
    
    # Test 10: Update business (Business Owner - their own business)
    test_endpoint "PUT" "/admin/businesses/$BUSINESS_ID" "200" "Update business (Owner - own business)" "$OWNER_TOKEN" "$update_data"
    
    # Test 11: Deactivate business (SuperAdmin only)
    test_endpoint "DELETE" "/admin/businesses/$BUSINESS_ID" "200" "Deactivate business (SuperAdmin)" "$SUPERADMIN_TOKEN"
    
    # Test 12: Deactivate business (Business Owner - should fail)
    test_endpoint "DELETE" "/admin/businesses/$BUSINESS_ID" "403" "Deactivate business (Business Owner - should fail)" "$OWNER_TOKEN"
    
    echo ""
    log "=== Testing Authentication Required Endpoints ==="
    echo ""
    
    # Test 13: Access business endpoint without authentication
    test_endpoint "GET" "/admin/businesses" "401" "Get businesses without auth (should fail)" ""
    
    # Test 14: Access my business without authentication
    test_endpoint "GET" "/businesses/my-business" "401" "Get my business without auth (should fail)" ""
    
    echo ""
    log "=== Testing User Role Assignment Endpoints ==="
    echo ""
    
    # Test 15: Get business users (Business Owner)
    test_endpoint "GET" "/users/business/$BUSINESS_ID/users" "200" "Get business users (Business Owner)" "$OWNER_TOKEN"
    
    # Test 16: Get business users (SuperAdmin)
    test_endpoint "GET" "/users/business/$BUSINESS_ID/users" "200" "Get business users (SuperAdmin)" "$SUPERADMIN_TOKEN"
    
    # Test 17: Create business user (Business Owner)
    local new_user_data='{
        "email": "staff@cinemacity.com",
        "firstName": "Cinema",
        "lastName": "Staff",
        "role": "staff"
    }'
    test_endpoint "POST" "/users/business/$BUSINESS_ID/users" "201" "Create business user (Business Owner)" "$OWNER_TOKEN" "$new_user_data"
    
    echo ""
    log "=== Testing Business Context Validation ==="
    echo ""
    
    # Test 18: Try to access another business (if there are multiple)
    local other_business_query='db.businesses.findOne({name: {$ne: "Cinema City"}})'
    OTHER_BUSINESS_DATA=$(echo "$other_business_query" | mongosh --quiet inseat --eval "print(JSON.stringify($other_business_query))")
    
    if [ "$OTHER_BUSINESS_DATA" != "null" ]; then
        OTHER_BUSINESS_ID=$(echo "$OTHER_BUSINESS_DATA" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
        test_endpoint "GET" "/admin/businesses/$OTHER_BUSINESS_ID" "403" "Access other business (Business Owner - should fail)" "$OWNER_TOKEN"
    else
        warning "No other businesses found, skipping cross-business access test"
    fi
    
    echo ""
    log "=== Test Summary ==="
    echo ""
    log "Total Tests: $TOTAL_TESTS"
    success "Passed: $PASSED_TESTS"
    error "Failed: $FAILED_TESTS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        success "All tests passed! ✨"
        return 0
    else
        error "Some tests failed. Please check the implementation."
        return 1
    fi
}

# Check if mongosh is available
if ! command -v mongosh &> /dev/null; then
    error "mongosh is required but not installed. Please install MongoDB Shell."
    exit 1
fi

# Run the tests
run_tests 