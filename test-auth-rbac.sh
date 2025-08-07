#!/bin/bash

# Script to test the auth-service authentication and RBAC features
# This script demonstrates how to use the API with curl commands

# Set base URL
BASE_URL="http://localhost:3001/api"
AUTH_URL="$BASE_URL/auth"
ADMIN_URL="$BASE_URL/admin"

# Colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}==============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==============================================${NC}\n"
}

# Function to print success/error messages
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Store tokens and IDs
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
ROLE_ID=""
PERMISSION_ID=""

# Register a new user
register_user() {
    print_header "1. Register a new user"
    
    response=$(curl -s -X POST "$AUTH_URL/register" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "password123",
            "firstName": "Test",
            "lastName": "User"
        }')
    
    echo "$response" | jq '.'
    
    # Check if registration was successful and store tokens and user ID
    if echo "$response" | grep -q "token"; then
        ACCESS_TOKEN=$(echo "$response" | jq -r '.token')
        REFRESH_TOKEN=$(echo "$response" | jq -r '.refreshToken')
        USER_ID=$(echo "$response" | jq -r '.user.id')
        
        print_result 0 "User registered successfully with ID: $USER_ID"
    else
        print_result 1 "Failed to register user"
    fi
}

# Login with the registered user
login_user() {
    print_header "2. Login with the registered user"
    
    response=$(curl -s -X POST "$AUTH_URL/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "password123"
        }')
    
    echo "$response" | jq '.'
    
    # Check if login was successful and store tokens and user ID
    if echo "$response" | grep -q "token"; then
        ACCESS_TOKEN=$(echo "$response" | jq -r '.token')
        REFRESH_TOKEN=$(echo "$response" | jq -r '.refreshToken')
        USER_ID=$(echo "$response" | jq -r '.user.id')
        
        print_result 0 "User logged in successfully with ID: $USER_ID"
    else
        print_result 1 "Failed to login"
    fi
}

# Get user profile
get_profile() {
    print_header "3. Get authenticated user profile"
    
    response=$(curl -s -X GET "$AUTH_URL/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$response" | jq '.'
    
    # Check if profile was retrieved successfully
    if echo "$response" | grep -q "success"; then
        print_result 0 "Profile retrieved successfully"
    else
        print_result 1 "Failed to retrieve profile"
    fi
}

# Refresh token
refresh_token() {
    print_header "4. Refresh access token using refresh token"
    
    response=$(curl -s -X POST "$AUTH_URL/refresh-token" \
        -H "Content-Type: application/json" \
        -d "{
            \"refreshToken\": \"$REFRESH_TOKEN\"
        }")
    
    echo "$response" | jq '.'
    
    # Check if token was refreshed successfully and update access token
    if echo "$response" | grep -q "token"; then
        ACCESS_TOKEN=$(echo "$response" | jq -r '.token')
        print_result 0 "Token refreshed successfully"
    else
        print_result 1 "Failed to refresh token"
    fi
}

# Try to access admin routes without admin privileges (should fail)
try_admin_access() {
    print_header "5. Try to access admin routes (should fail due to lack of admin role)"
    
    response=$(curl -s -X GET "$ADMIN_URL/roles" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$response" | jq '.'
    
    # Check if access was denied
    if echo "$response" | grep -q "Access denied"; then
        print_result 0 "Access correctly denied (RBAC working)"
    else
        print_result 1 "Access not properly restricted"
    fi
}

# Login as admin
login_admin() {
    print_header "6. Login as admin user"
    
    response=$(curl -s -X POST "$AUTH_URL/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@inseat.com",
            "password": "admin123"
        }')
    
    echo "$response" | jq '.'
    
    # Check if login was successful and store admin token
    if echo "$response" | grep -q "token"; then
        ACCESS_TOKEN=$(echo "$response" | jq -r '.token')
        print_result 0 "Admin logged in successfully"
    else
        print_result 1 "Failed to login as admin"
    fi
}

# Get all roles (admin only)
get_roles() {
    print_header "7. Get all roles (admin access)"
    
    response=$(curl -s -X GET "$ADMIN_URL/roles" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$response" | jq '.'
    
    # Get first role ID for later tests
    if echo "$response" | jq -e '.[0]._id' > /dev/null 2>&1; then
        ROLE_ID=$(echo "$response" | jq -r '.[0]._id')
        print_result 0 "Roles retrieved successfully. Role ID: $ROLE_ID"
    else
        print_result 1 "Failed to retrieve roles"
    fi
}

# Get all permissions (admin only)
get_permissions() {
    print_header "8. Get all permissions (admin access)"
    
    response=$(curl -s -X GET "$ADMIN_URL/permissions" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$response" | jq '.'
    
    # Get first permission ID for later tests
    if echo "$response" | jq -e '.[0]._id' > /dev/null 2>&1; then
        PERMISSION_ID=$(echo "$response" | jq -r '.[0]._id')
        print_result 0 "Permissions retrieved successfully. Permission ID: $PERMISSION_ID"
    else
        print_result 1 "Failed to retrieve permissions"
    fi
}

# Assign role to user
assign_role() {
    print_header "9. Assign role to user"
    
    if [ -z "$USER_ID" ] || [ -z "$ROLE_ID" ]; then
        print_result 1 "Missing user ID or role ID"
        return
    fi
    
    response=$(curl -s -X PUT "$ADMIN_URL/users/$USER_ID/roles/$ROLE_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$response" | jq '.'
    
    # Check if role was assigned successfully
    if echo "$response" | grep -q "assigned successfully"; then
        print_result 0 "Role assigned successfully"
    else
        print_result 1 "Failed to assign role"
    fi
}

# Get user permissions
get_user_permissions() {
    print_header "10. Get user permissions"
    
    if [ -z "$USER_ID" ]; then
        print_result 1 "Missing user ID"
        return
    fi
    
    response=$(curl -s -X GET "$ADMIN_URL/users/$USER_ID/permissions" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$response" | jq '.'
    
    # Check if permissions were retrieved successfully
    if echo "$response" | jq -e '.permissions' > /dev/null 2>&1; then
        print_result 0 "User permissions retrieved successfully"
    else
        print_result 1 "Failed to retrieve user permissions"
    fi
}

# Remove role from user
remove_role() {
    print_header "11. Remove role from user"
    
    if [ -z "$USER_ID" ] || [ -z "$ROLE_ID" ]; then
        print_result 1 "Missing user ID or role ID"
        return
    fi
    
    response=$(curl -s -X DELETE "$ADMIN_URL/users/$USER_ID/roles/$ROLE_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$response" | jq '.'
    
    # Check if role was removed successfully
    if echo "$response" | grep -q "removed successfully"; then
        print_result 0 "Role removed successfully"
    else
        print_result 1 "Failed to remove role"
    fi
}

# Logout
logout() {
    print_header "12. Logout"
    
    response=$(curl -s -X POST "$AUTH_URL/logout" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$response" | jq '.'
    
    # Check if logout was successful
    if echo "$response" | grep -q "Logged out successfully"; then
        print_result 0 "Logged out successfully"
    else
        print_result 1 "Failed to logout"
    fi
}

# Main execution
echo -e "${YELLOW}Authentication and RBAC API Test Script${NC}"
echo -e "${YELLOW}--------------------------------------${NC}"
echo "This script will test the authentication and RBAC features of the auth-service."
echo "Make sure the service is running on http://localhost:3001"
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install it to run this script.${NC}"
    echo "On Ubuntu/Debian: sudo apt-get install jq"
    echo "On macOS: brew install jq"
    exit 1
fi

# Run test sequence
register_user
login_user
get_profile
refresh_token
try_admin_access
login_admin
get_roles
get_permissions
assign_role
get_user_permissions
remove_role
logout

echo -e "\n${GREEN}Tests completed!${NC}"
