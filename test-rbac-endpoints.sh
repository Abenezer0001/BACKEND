#!/bin/bash

# RBAC Endpoints Test Script
# This script tests all the Role-Based Access Control endpoints

BASE_URL="http://localhost:3001"
SYSTEM_ADMIN_TOKEN=""
BUSINESS_OWNER_TOKEN=""

echo "🚀 Starting RBAC Endpoints Test"
echo "================================"

# Function to extract token from login response
extract_token() {
    echo "$1" | jq -r '.token'
}

# Function to make authenticated request
auth_request() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data"
    else
        curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token"
    fi
}

echo "📝 Step 1: Create System Admin"
echo "------------------------------"
SYSTEM_ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/system-admin/setup" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "sysadmin@inseat.com",
        "firstName": "System",
        "lastName": "Administrator"
    }')

echo "System Admin Creation Response:"
echo "$SYSTEM_ADMIN_RESPONSE" | jq '.'

# Extract setup token for password setup (if in development)
SETUP_TOKEN=$(echo "$SYSTEM_ADMIN_RESPONSE" | jq -r '.dev_info.plain_token // empty')

if [ -n "$SETUP_TOKEN" ]; then
    echo "🔑 Setting up System Admin password..."
    curl -s -X POST "$BASE_URL/api/system-admin/setup-password" \
        -H "Content-Type: application/json" \
        -d "{
            \"token\": \"$SETUP_TOKEN\",
            \"password\": \"Admin@123456\"
        }" | jq '.'
fi

echo ""
echo "🔐 Step 2: Login as System Admin"
echo "--------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "sysadmin@inseat.com",
        "password": "Admin@123456"
    }')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.'

SYSTEM_ADMIN_TOKEN=$(extract_token "$LOGIN_RESPONSE")

if [ "$SYSTEM_ADMIN_TOKEN" = "null" ] || [ -z "$SYSTEM_ADMIN_TOKEN" ]; then
    echo "❌ Failed to get system admin token. Exiting."
    exit 1
fi

echo "✅ System Admin Token: ${SYSTEM_ADMIN_TOKEN:0:20}..."

echo ""
echo "🏢 Step 3: Create Business"
echo "-------------------------"
BUSINESS_RESPONSE=$(auth_request "POST" "/api/admin/businesses" "$SYSTEM_ADMIN_TOKEN" '{
    "name": "Test Restaurant Business",
    "legalName": "Test Restaurant Business LLC",
    "registrationNumber": "REG123456",
    "contactInfo": {
        "email": "business@test.com",
        "phone": "+1-555-0123",
        "address": "123 Business St, City, State 12345"
    },
    "ownerEmail": "owner@test.com"
}')

echo "Business Creation Response:"
echo "$BUSINESS_RESPONSE" | jq '.'

BUSINESS_ID=$(echo "$BUSINESS_RESPONSE" | jq -r '.business._id // .business.id')

echo ""
echo "🧑‍💼 Step 4: Create Restaurant Admin"
echo "-----------------------------------"
RESTAURANT_ADMIN_RESPONSE=$(auth_request "POST" "/api/admin/admins" "$SYSTEM_ADMIN_TOKEN" "{
    \"email\": \"restaurantadmin@test.com\",
    \"firstName\": \"Restaurant\",
    \"lastName\": \"Admin\",
    \"role\": \"restaurant_admin\",
    \"businessId\": \"$BUSINESS_ID\"
}")

echo "Restaurant Admin Creation Response:"
echo "$RESTAURANT_ADMIN_RESPONSE" | jq '.'

echo ""
echo "📋 Step 5: List All Admins"
echo "-------------------------"
ADMINS_LIST=$(auth_request "GET" "/api/admin/admins" "$SYSTEM_ADMIN_TOKEN")
echo "Admins List:"
echo "$ADMINS_LIST" | jq '.'

echo ""
echo "🔧 Step 6: Test Permission Endpoints"
echo "-----------------------------------"

echo "📄 6.1: Get all permissions"
PERMISSIONS_RESPONSE=$(auth_request "GET" "/api/permissions" "$SYSTEM_ADMIN_TOKEN")
echo "Permissions Response:"
echo "$PERMISSIONS_RESPONSE" | jq '.permissions | length' | xargs echo "Total permissions:"

echo ""
echo "📄 6.2: Get resources"
RESOURCES_RESPONSE=$(auth_request "GET" "/api/permissions/resources" "$SYSTEM_ADMIN_TOKEN")
echo "Resources Response:"
echo "$RESOURCES_RESPONSE" | jq '.'

echo ""
echo "📄 6.3: Get actions"
ACTIONS_RESPONSE=$(auth_request "GET" "/api/permissions/actions" "$SYSTEM_ADMIN_TOKEN")
echo "Actions Response:"
echo "$ACTIONS_RESPONSE" | jq '.'

echo ""
echo "📄 6.4: Create new permission"
NEW_PERMISSION_RESPONSE=$(auth_request "POST" "/api/permissions" "$SYSTEM_ADMIN_TOKEN" '{
    "resource": "test-resource",
    "action": "test-action",
    "description": "Test permission for RBAC testing"
}')
echo "New Permission Response:"
echo "$NEW_PERMISSION_RESPONSE" | jq '.'

PERMISSION_ID=$(echo "$NEW_PERMISSION_RESPONSE" | jq -r '._id')

echo ""
echo "🛠️ Step 7: Test Role Endpoints"
echo "-----------------------------"

echo "📋 7.1: Get all roles"
ROLES_RESPONSE=$(auth_request "GET" "/api/roles" "$SYSTEM_ADMIN_TOKEN")
echo "Roles Response:"
echo "$ROLES_RESPONSE" | jq 'length' | xargs echo "Total roles:"

echo ""
echo "📋 7.2: Create new system role"
NEW_ROLE_RESPONSE=$(auth_request "POST" "/api/roles" "$SYSTEM_ADMIN_TOKEN" "{
    \"name\": \"test-system-role\",
    \"description\": \"Test system role for RBAC testing\",
    \"permissions\": [\"$PERMISSION_ID\"]
}")
echo "New Role Response:"
echo "$NEW_ROLE_RESPONSE" | jq '.'

ROLE_ID=$(echo "$NEW_ROLE_RESPONSE" | jq -r '._id')

echo ""
echo "📋 7.3: Get role by ID"
ROLE_BY_ID_RESPONSE=$(auth_request "GET" "/api/roles/$ROLE_ID" "$SYSTEM_ADMIN_TOKEN")
echo "Role by ID Response:"
echo "$ROLE_BY_ID_RESPONSE" | jq '.'

echo ""
echo "📋 7.4: Get role permissions"
ROLE_PERMISSIONS_RESPONSE=$(auth_request "GET" "/api/roles/$ROLE_ID/permissions" "$SYSTEM_ADMIN_TOKEN")
echo "Role Permissions Response:"
echo "$ROLE_PERMISSIONS_RESPONSE" | jq '.'

echo ""
echo "👥 Step 8: Test User Role Assignment"
echo "-----------------------------------"

echo "👤 8.1: Get business users"
BUSINESS_USERS_RESPONSE=$(auth_request "GET" "/api/users/business-users" "$SYSTEM_ADMIN_TOKEN")
echo "Business Users Response:"
echo "$BUSINESS_USERS_RESPONSE" | jq '.'

echo ""
echo "👤 8.2: Create business user"
BUSINESS_USER_RESPONSE=$(auth_request "POST" "/api/users/create-business-user" "$SYSTEM_ADMIN_TOKEN" "{
    \"email\": \"staff@test.com\",
    \"firstName\": \"Test\",
    \"lastName\": \"Staff\",
    \"roleIds\": [\"$ROLE_ID\"]
}")
echo "Business User Response:"
echo "$BUSINESS_USER_RESPONSE" | jq '.'

USER_ID=$(echo "$BUSINESS_USER_RESPONSE" | jq -r '.user._id // .user.id')

echo ""
echo "👤 8.3: Assign role to user"
if [ -n "$USER_ID" ] && [ "$USER_ID" != "null" ]; then
    ASSIGN_ROLE_RESPONSE=$(auth_request "POST" "/api/users/$USER_ID/assign-role" "$SYSTEM_ADMIN_TOKEN" "{
        \"roleId\": \"$ROLE_ID\"
    }")
    echo "Assign Role Response:"
    echo "$ASSIGN_ROLE_RESPONSE" | jq '.'
else
    echo "⚠️ Skipping role assignment - no valid user ID"
fi

echo ""
echo "🏪 Step 9: Test Business Endpoints"
echo "---------------------------------"

echo "🏢 9.1: Get all businesses"
ALL_BUSINESSES_RESPONSE=$(auth_request "GET" "/api/admin/businesses" "$SYSTEM_ADMIN_TOKEN")
echo "All Businesses Response:"
echo "$ALL_BUSINESSES_RESPONSE" | jq '.businesses | length' | xargs echo "Total businesses:"

echo ""
echo "🏢 9.2: Get business by ID"
BUSINESS_BY_ID_RESPONSE=$(auth_request "GET" "/api/admin/businesses/$BUSINESS_ID" "$SYSTEM_ADMIN_TOKEN")
echo "Business by ID Response:"
echo "$BUSINESS_BY_ID_RESPONSE" | jq '.name' | xargs echo "Business name:"

echo ""
echo "🏪 9.3: Get business users"
BUSINESS_USERS_LIST=$(auth_request "GET" "/api/businesses/my-business/users" "$SYSTEM_ADMIN_TOKEN")
echo "Business Users List:"
echo "$BUSINESS_USERS_LIST" | jq '.'

echo ""
echo "🧪 Step 10: Test Authentication Check"
echo "------------------------------------"
AUTH_CHECK_RESPONSE=$(auth_request "GET" "/api/auth/me" "$SYSTEM_ADMIN_TOKEN")
echo "Auth Check Response:"
echo "$AUTH_CHECK_RESPONSE" | jq '.'

echo ""
echo "✅ RBAC Endpoints Test Complete!"
echo "==============================="

# Summary
echo ""
echo "📊 Test Summary:"
echo "- System Admin Token: ${SYSTEM_ADMIN_TOKEN:0:20}..."
echo "- Business ID: $BUSINESS_ID"
echo "- Role ID: $ROLE_ID"
echo "- Permission ID: $PERMISSION_ID"
echo "- User ID: $USER_ID"

# Cleanup note
echo ""
echo "🧹 Note: Test data has been created in the database."
echo "   You may want to clean up test records if needed." 