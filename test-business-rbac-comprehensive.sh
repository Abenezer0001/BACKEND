#!/bin/bash

# INSEAT Backend - Business RBAC Comprehensive Testing Script
# Testing all business management and role assignment endpoints

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001/api"
BUSINESS_BASE_URL="http://localhost:3001/api/businesses"
AUTH_BASE_URL="http://localhost:3001/api/auth"

# Test credentials
SYSTEM_ADMIN_EMAIL="admin@inseat.com"
SYSTEM_ADMIN_PASSWORD="Admin@123456"
RESTAURANT_ADMIN_EMAIL="abenezer.t@achievengine.com"
RESTAURANT_ADMIN_PASSWORD="Admin@123456"
RESTAURANT_ADMIN_ID="6837465d87b53a426ff5b20b"

# Global variables
SYSTEM_ADMIN_TOKEN=""
BUSINESS_OWNER_TOKEN=""
BUSINESS_ID=""
BUSINESS_OWNER_ID=""
ROLE_ID=""

# Utility functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to wait for server to be ready
wait_for_server() {
    local max_attempts=30
    local attempt=1
    
    log "Waiting for server to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        log "Attempt $attempt/$max_attempts - Checking server health..."
        
        # Try multiple health check endpoints
        if curl -s --max-time 5 "http://localhost:3001/health" > /dev/null 2>&1; then
            success "Server is responding to health check"
            return 0
        elif curl -s --max-time 5 "http://localhost:3001/api/health" > /dev/null 2>&1; then
            success "Server is responding to API health check"
            return 0
        elif curl -s --max-time 5 "http://localhost:3001/" > /dev/null 2>&1; then
            success "Server is responding to root endpoint"
            return 0
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
    
    error "Server did not respond after $max_attempts attempts"
    return 1
}

# Function to make authenticated requests
auth_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local full_url="$BASE_URL$endpoint"
    
    log "Making $method request to $full_url"
    
    if [ "$method" = "GET" ]; then
        if [ -n "$token" ]; then
            curl -s --max-time 30 -X GET "$full_url" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json"
        else
            curl -s --max-time 30 -X GET "$full_url" \
                -H "Content-Type: application/json"
        fi
    else
        if [ -n "$token" ]; then
            curl -s --max-time 30 -X "$method" "$full_url" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s --max-time 30 -X "$method" "$full_url" \
                -H "Content-Type: application/json" \
                -d "$data"
        fi
    fi
}

# Function to extract value from JSON response
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    keys = '$key'.split('.')
    value = data
    for k in keys:
        if k.isdigit():
            value = value[int(k)]
        else:
            value = value[k]
    print(value)
except:
    pass
"
}

# Function to login and get token
login_user() {
    local email=$1
    local password=$2
    local user_type=$3
    
    log "Logging in $user_type: $email"
    
    local login_data="{\"email\":\"$email\",\"password\":\"$password\"}"
    local response=$(auth_request "POST" "/auth/login" "$login_data" "")
    
    echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'token' in data:
        print(data['token'])
    elif 'accessToken' in data:
        print(data['accessToken'])
    else:
        print('')
except:
    print('')
"
}

# Test server availability
test_server() {
    log "Testing server availability..."
    
    if wait_for_server; then
        success "Server is running and responding"
        return 0
    else
        error "Server is not accessible"
        return 1
    fi
}

# Get all restaurants to associate with business
get_restaurants() {
    log "Getting all restaurants..."
    local response=$(curl -s --max-time 30 "http://localhost:3001/api/restaurants")
    echo "$response"
}

# Test endpoint with expected status
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local token=$5
    local data=$6
    
    log "Testing: $description"
    log "  $method $endpoint"
    
    local response
    local actual_status
    
    if [ "$method" = "GET" ]; then
        if [ -n "$token" ]; then
            response=$(curl -s --max-time 30 -w "|||%{http_code}" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json")
        else
            response=$(curl -s --max-time 30 -w "|||%{http_code}" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json")
        fi
    else
        if [ -n "$token" ]; then
            response=$(curl -s --max-time 30 -w "|||%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -d "$data")
        else
            response=$(curl -s --max-time 30 -w "|||%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    fi
    
    actual_status=$(echo "$response" | sed 's/.*|||//')
    response_body=$(echo "$response" | sed 's/|||.*//')
    
    if [ "$actual_status" = "$expected_status" ]; then
        success "✓ $description (Status: $actual_status)"
        echo "  Response: $(echo "$response_body" | head -c 200)..."
    else
        error "✗ $description (Expected: $expected_status, Got: $actual_status)"
        echo "  Response: $response_body"
    fi
    
    echo ""
    echo "$response_body"
}

# Main testing function
run_comprehensive_tests() {
    echo ""
    echo "=========================================="
    echo "  INSEAT BUSINESS RBAC TESTING SUITE"
    echo "=========================================="
    echo ""
    
    # Test 1: Server availability
    if ! test_server; then
        error "Cannot proceed without server connection"
        exit 1
    fi
    
    echo ""
    log "=== STEP 1: Authentication ==="
    
    # Login as System Admin
    SYSTEM_ADMIN_TOKEN=$(login_user "$SYSTEM_ADMIN_EMAIL" "$SYSTEM_ADMIN_PASSWORD" "System Admin")
    if [ -z "$SYSTEM_ADMIN_TOKEN" ]; then
        error "Failed to login as System Admin"
        exit 1
    fi
    success "System Admin logged in successfully"
    echo "Token: ${SYSTEM_ADMIN_TOKEN:0:50}..."
    
    # Login as Restaurant Admin
    BUSINESS_OWNER_TOKEN=$(login_user "$RESTAURANT_ADMIN_EMAIL" "$RESTAURANT_ADMIN_PASSWORD" "Restaurant Admin")
    if [ -z "$BUSINESS_OWNER_TOKEN" ]; then
        error "Failed to login as Restaurant Admin"
        exit 1
    fi
    success "Restaurant Admin logged in successfully"
    echo "Token: ${BUSINESS_OWNER_TOKEN:0:50}..."
    
    echo ""
    log "=== STEP 2: Business Management Tests ==="
    
    # Test 2.1: Get all businesses (System Admin)
    test_endpoint "GET" "/businesses/admin/businesses" "200" "Get all businesses (System Admin)" "$SYSTEM_ADMIN_TOKEN"
    
    # Test 2.2: Get all businesses (Restaurant Admin - should fail)
    test_endpoint "GET" "/businesses/admin/businesses" "403" "Get all businesses (Restaurant Admin - should fail)" "$BUSINESS_OWNER_TOKEN"
    
    # Test 2.3: Create new business (System Admin)
    local business_data='{
        "name": "Cinema City Entertainment",
        "legalName": "Cinema City Entertainment Ltd.",
        "registrationNumber": "CCE-2024-001",
        "contactInfo": {
            "phone": "+971-4-555-0123",
            "email": "admin@cinemacity.com",
            "address": "123 Entertainment Boulevard, Dubai, UAE"
        },
        "ownerEmail": "owner@cinemacity.com"
    }'
    
    local create_response=$(auth_request "POST" "/businesses/admin/businesses" "$business_data" "$SYSTEM_ADMIN_TOKEN")
    echo "Create Business Response: $create_response"
    BUSINESS_ID=$(extract_json_value "$create_response" "business._id")
    BUSINESS_OWNER_ID=$(extract_json_value "$create_response" "owner.id")
    
    if [ -n "$BUSINESS_ID" ]; then
        success "Business created successfully: $BUSINESS_ID"
    else
        error "Failed to create business"
    fi
    
    # Test 2.4: Get business by ID (System Admin)
    if [ -n "$BUSINESS_ID" ]; then
        test_endpoint "GET" "/businesses/admin/businesses/$BUSINESS_ID" "200" "Get business by ID (System Admin)" "$SYSTEM_ADMIN_TOKEN"
    fi
    
    # Test 2.5: Update business
    if [ -n "$BUSINESS_ID" ]; then
        local update_data='{"contactInfo": {"phone": "+971-4-555-0124", "email": "admin@cinemacity.com", "address": "123 Entertainment Blvd, Downtown, Dubai, UAE"}}'
        test_endpoint "PUT" "/businesses/admin/businesses/$BUSINESS_ID" "200" "Update business (System Admin)" "$SYSTEM_ADMIN_TOKEN" "$update_data"
    fi
    
    echo ""
    log "=== STEP 3: Role Management Tests ==="
    
    # Test 3.1: Get all roles (System Admin)
    local roles_response=$(auth_request "GET" "/auth/roles" "" "$SYSTEM_ADMIN_TOKEN")
    echo "Roles Response: $roles_response"
    
    # Test 3.2: Create business-specific role
    local role_data='{
        "name": "Cinema Manager",
        "description": "Manager role for Cinema City business",
        "permissions": []
    }'
    
    local role_create_response=$(auth_request "POST" "/auth/roles" "$role_data" "$BUSINESS_OWNER_TOKEN")
    echo "Role Creation Response: $role_create_response"
    ROLE_ID=$(extract_json_value "$role_create_response" "_id")
    
    echo ""
    log "=== STEP 4: User Role Assignment Tests ==="
    
    # Test 4.1: Get business users
    test_endpoint "GET" "/auth/users/business-users" "200" "Get business users (System Admin)" "$SYSTEM_ADMIN_TOKEN"
    
    # Test 4.2: Assign role to restaurant admin user
    if [ -n "$ROLE_ID" ] && [ -n "$RESTAURANT_ADMIN_ID" ]; then
        local assign_data="{\"roleId\":\"$ROLE_ID\"}"
        test_endpoint "POST" "/auth/users/$RESTAURANT_ADMIN_ID/assign-role" "200" "Assign role to user" "$BUSINESS_OWNER_TOKEN" "$assign_data"
    fi
    
    # Test 4.3: Create new business user
    local new_user_data='{
        "email": "manager@cinemacity.com",
        "firstName": "Cinema",
        "lastName": "Manager",
        "roleIds": []
    }'
    
    test_endpoint "POST" "/auth/users/create-business-user" "201" "Create business user" "$BUSINESS_OWNER_TOKEN" "$new_user_data"
    
    echo ""
    log "=== STEP 5: Restaurant Association Tests ==="
    
    # Get all restaurants
    local restaurants_response=$(get_restaurants)
    echo "Restaurants Response: $restaurants_response"
    
    echo ""
    log "=== STEP 6: Permission Boundary Tests ==="
    
    # Test 6.1: Restaurant Admin trying to access system admin endpoints
    test_endpoint "POST" "/businesses/admin/businesses" "403" "Create business (Restaurant Admin - should fail)" "$BUSINESS_OWNER_TOKEN" "$business_data"
    
    # Test 6.2: Unauthorized access
    test_endpoint "GET" "/businesses/admin/businesses" "401" "Get businesses without auth (should fail)" ""
    
    echo ""
    success "=== ALL TESTS COMPLETED ==="
    echo ""
    echo "Summary:"
    echo "- System Admin Token: ${SYSTEM_ADMIN_TOKEN:0:50}..."
    echo "- Business Owner Token: ${BUSINESS_OWNER_TOKEN:0:50}..."
    echo "- Business ID: $BUSINESS_ID"
    echo "- Business Owner ID: $BUSINESS_OWNER_ID"
    echo "- Role ID: $ROLE_ID"
}

# Execute tests
run_comprehensive_tests 