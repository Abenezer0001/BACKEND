#!/bin/bash

# Test Business-Level RBAC System
# This script tests all the business RBAC endpoints with curl

BASE_URL="http://localhost:3001"
COOKIE_FILE="test-cookies.txt"

echo "🚀 Testing Business-Level RBAC System"
echo "======================================"

# Function to make authenticated requests
auth_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" \
            "$BASE_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            "$BASE_URL$endpoint"
    fi
}

# Function to parse JWT token from response
extract_token() {
    echo "$1" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4
}

echo ""
echo "📝 Step 1: Create Super Admin Account"
echo "-----------------------------------"

# Register Super Admin
SUPER_ADMIN_DATA='{
  "email": "superadmin@inseat.com",
  "password": "SuperAdmin123!",
  "firstName": "Super",
  "lastName": "Admin",
  "role": "system_admin"
}'

echo "Creating Super Admin account..."
SUPER_ADMIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$SUPER_ADMIN_DATA" \
    "$BASE_URL/api/auth/register")

echo "Super Admin Response: $SUPER_ADMIN_RESPONSE"

# Login Super Admin
echo ""
echo "Logging in Super Admin..."
SUPER_LOGIN_DATA='{"email": "superadmin@inseat.com", "password": "SuperAdmin123!"}'
SUPER_LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$SUPER_LOGIN_DATA" \
    "$BASE_URL/api/auth/login")

echo "Super Admin Login Response: $SUPER_LOGIN_RESPONSE"
SUPER_ADMIN_TOKEN=$(extract_token "$SUPER_LOGIN_RESPONSE")

if [ -z "$SUPER_ADMIN_TOKEN" ]; then
    echo "❌ Failed to get Super Admin token. Exiting."
    exit 1
fi

echo "✅ Super Admin Token: ${SUPER_ADMIN_TOKEN:0:50}..."

echo ""
echo "📝 Step 2: Create Business via Super Admin"
echo "----------------------------------------"

# Create a business
BUSINESS_DATA='{
  "name": "Test Restaurant Group",
  "legalName": "Test Restaurant Group LLC",
  "registrationNumber": "TRG-001",
  "contactInfo": {
    "email": "contact@testrestaurant.com",
    "phone": "+1-555-0123",
    "address": "123 Test St, Test City, TC 12345"
  },
  "ownerEmail": "owner@testrestaurant.com"
}'

echo "Creating business..."
BUSINESS_RESPONSE=$(auth_request "POST" "/api/businesses/admin/businesses" "$BUSINESS_DATA" "$SUPER_ADMIN_TOKEN")
echo "Business Creation Response: $BUSINESS_RESPONSE"

# Extract business ID
BUSINESS_ID=$(echo "$BUSINESS_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
echo "✅ Business ID: $BUSINESS_ID"

echo ""
echo "📝 Step 3: Login as Business Owner"
echo "--------------------------------"

# First, try to get owner password setup (in real scenario, owner would use password reset)
# For testing, let's try to login with temp password or set it up

# Create owner account with proper password
OWNER_DATA='{
  "email": "owner@testrestaurant.com",
  "password": "Owner123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "restaurant_admin"
}'

echo "Creating owner account with proper password..."
OWNER_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$OWNER_DATA" \
    "$BASE_URL/api/auth/register")

echo "Owner Registration Response: $OWNER_RESPONSE"

# Login as owner
echo "Logging in as Business Owner..."
OWNER_LOGIN_DATA='{"email": "owner@testrestaurant.com", "password": "Owner123!"}'
OWNER_LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$OWNER_LOGIN_DATA" \
    "$BASE_URL/api/auth/login")

echo "Owner Login Response: $OWNER_LOGIN_RESPONSE"
OWNER_TOKEN=$(extract_token "$OWNER_LOGIN_RESPONSE")

if [ -z "$OWNER_TOKEN" ]; then
    echo "❌ Failed to get Owner token."
else
    echo "✅ Owner Token: ${OWNER_TOKEN:0:50}..."
fi

echo ""
echo "📝 Step 4: Test Business Operations"
echo "---------------------------------"

# Test getting all businesses (Super Admin only)
echo "Testing GET all businesses (Super Admin)..."
ALL_BUSINESSES_RESPONSE=$(auth_request "GET" "/api/businesses/admin/businesses" "" "$SUPER_ADMIN_TOKEN")
echo "All Businesses Response: $ALL_BUSINESSES_RESPONSE"

# Test getting specific business
if [ -n "$BUSINESS_ID" ]; then
    echo ""
    echo "Testing GET business by ID (Super Admin)..."
    BUSINESS_BY_ID_RESPONSE=$(auth_request "GET" "/api/businesses/admin/businesses/$BUSINESS_ID" "" "$SUPER_ADMIN_TOKEN")
    echo "Business by ID Response: $BUSINESS_BY_ID_RESPONSE"
fi

# Test owner accessing their business
if [ -n "$OWNER_TOKEN" ]; then
    echo ""
    echo "Testing GET my business (Owner)..."
    MY_BUSINESS_RESPONSE=$(auth_request "GET" "/api/businesses/businesses/my-business" "" "$OWNER_TOKEN")
    echo "My Business Response: $MY_BUSINESS_RESPONSE"
fi

echo ""
echo "📝 Step 5: Test Role Management"
echo "-----------------------------"

# Get all roles (Super Admin)
echo "Testing GET all roles (Super Admin)..."
ALL_ROLES_RESPONSE=$(auth_request "GET" "/api/auth/roles" "" "$SUPER_ADMIN_TOKEN")
echo "All Roles Response: $ALL_ROLES_RESPONSE"

# Test getting roles as owner (should show system + business roles)
if [ -n "$OWNER_TOKEN" ]; then
    echo ""
    echo "Testing GET roles (Business Owner)..."
    OWNER_ROLES_RESPONSE=$(auth_request "GET" "/api/auth/roles" "" "$OWNER_TOKEN")
    echo "Owner Roles Response: $OWNER_ROLES_RESPONSE"
fi

echo ""
echo "📝 Step 6: Test User Management in Business"
echo "-----------------------------------------"

# Create a business user
if [ -n "$OWNER_TOKEN" ]; then
    BUSINESS_USER_DATA='{
      "email": "staff@testrestaurant.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "roleIds": []
    }'
    
    echo "Testing CREATE business user (Owner)..."
    CREATE_USER_RESPONSE=$(auth_request "POST" "/api/auth/users/create-business-user" "$BUSINESS_USER_DATA" "$OWNER_TOKEN")
    echo "Create Business User Response: $CREATE_USER_RESPONSE"
    
    echo ""
    echo "Testing GET business users (Owner)..."
    BUSINESS_USERS_RESPONSE=$(auth_request "GET" "/api/auth/users/business-users" "" "$OWNER_TOKEN")
    echo "Business Users Response: $BUSINESS_USERS_RESPONSE"
fi

echo ""
echo "📝 Step 7: Test Permission Boundaries"
echo "-----------------------------------"

# Test owner trying to access admin-only endpoints
if [ -n "$OWNER_TOKEN" ]; then
    echo "Testing Owner access to Super Admin endpoint (should fail)..."
    UNAUTHORIZED_RESPONSE=$(auth_request "GET" "/api/businesses/admin/businesses" "" "$OWNER_TOKEN")
    echo "Unauthorized Access Response: $UNAUTHORIZED_RESPONSE"
fi

# Test unauthenticated access
echo ""
echo "Testing unauthenticated access (should fail)..."
UNAUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/businesses/admin/businesses")
echo "Unauthenticated Response: $UNAUTH_RESPONSE"

echo ""
echo "📝 Step 8: Test Restaurant Creation in Business"
echo "---------------------------------------------"

if [ -n "$OWNER_TOKEN" ] && [ -n "$BUSINESS_ID" ]; then
    RESTAURANT_DATA='{
      "name": "Test Bistro",
      "businessId": "'$BUSINESS_ID'",
      "locations": [{
        "address": "456 Restaurant St, Test City, TC 12345",
        "coordinates": {
          "latitude": 40.7128,
          "longitude": -74.0060
        }
      }]
    }'
    
    echo "Testing CREATE restaurant in business (Owner)..."
    RESTAURANT_RESPONSE=$(auth_request "POST" "/api/restaurants" "$RESTAURANT_DATA" "$OWNER_TOKEN")
    echo "Restaurant Creation Response: $RESTAURANT_RESPONSE"
    
    # Extract restaurant ID for further testing
    RESTAURANT_ID=$(echo "$RESTAURANT_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$RESTAURANT_ID" ]; then
        echo "✅ Restaurant ID: $RESTAURANT_ID"
        
        echo ""
        echo "Testing GET restaurants in business (Owner)..."
        RESTAURANTS_RESPONSE=$(auth_request "GET" "/api/restaurants" "" "$OWNER_TOKEN")
        echo "Restaurants Response: $RESTAURANTS_RESPONSE"
    fi
fi

echo ""
echo "🎉 Business RBAC Testing Complete!"
echo "================================="

# Summary
echo ""
echo "📊 Test Summary:"
echo "- Super Admin Token: ${SUPER_ADMIN_TOKEN:+✅ SUCCESS}${SUPER_ADMIN_TOKEN:-❌ FAILED}"
echo "- Business Creation: ${BUSINESS_ID:+✅ SUCCESS}${BUSINESS_ID:-❌ FAILED}"
echo "- Owner Token: ${OWNER_TOKEN:+✅ SUCCESS}${OWNER_TOKEN:-❌ FAILED}"
echo "- Restaurant Creation: ${RESTAURANT_ID:+✅ SUCCESS}${RESTAURANT_ID:-❌ FAILED}"

echo ""
echo "🔧 Next Steps:"
echo "1. Check server logs for any errors"
echo "2. Verify database entries for created entities"
echo "3. Test additional RBAC scenarios as needed"
echo "4. Run comprehensive integration tests"

# Clean up
rm -f "$COOKIE_FILE" 2>/dev/null

echo ""
echo "✅ Test script completed!" 