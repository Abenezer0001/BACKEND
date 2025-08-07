#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
RESPONSE_DIR="api_responses"
TEST_EMAIL="testuser@example.com"
TEST_PASSWORD="TestPassword123!"
COOKIE_JAR="$RESPONSE_DIR/cookies.txt"

# Create response directory if it doesn't exist
mkdir -p "$RESPONSE_DIR"

echo -e "${BLUE}Starting API test for INSEAT Backend${NC}"
echo -e "${YELLOW}Responses will be saved to: $RESPONSE_DIR${NC}"

# Remove existing cookie jar if it exists
rm -f "$COOKIE_JAR"

# Function to make an API request and save the response
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    local filename="${method}__$(echo $endpoint | tr '/' '_').json"
    local full_path="$RESPONSE_DIR/$filename"
    local headers=()
    
    echo -e "${BLUE}Testing: $method /$endpoint${NC}"
    
    headers+=("-H" "Content-Type: application/json")
    
    if [ -n "$data" ]; then
        response=$(curl -s -X "$method" "${BASE_URL}/${endpoint}" "${headers[@]}" -d "$data" -c "$COOKIE_JAR" -b "$COOKIE_JAR")
    else
        response=$(curl -s -X "$method" "${BASE_URL}/${endpoint}" "${headers[@]}" -c "$COOKIE_JAR" -b "$COOKIE_JAR")
    fi
    
    echo "$response" > "$full_path"
    
    # Check if the response is valid JSON
    if echo "$response" | jq '.' > /dev/null 2>&1; then
        echo -e "${GREEN}Response saved to: $full_path${NC}"
        
        # Return the response for processing
        echo "$response"
    else
        echo -e "${RED}Invalid JSON response for: $method /$endpoint${NC}"
        echo -e "${RED}Check $full_path for details${NC}"
        return 1
    fi
}

# Step 1: Register a user
echo -e "\n${YELLOW}=== Testing User Registration ===${NC}"
register_response=$(make_request "POST" "api/auth/register" '{
    "email": "'"$TEST_EMAIL"'",
    "password": "'"$TEST_PASSWORD"'",
    "firstName": "Test",
    "lastName": "User"
}')

# Step 2: Login to get cookies
echo -e "\n${YELLOW}=== Testing User Login ===${NC}"
login_response=$(make_request "POST" "api/auth/login" '{
    "email": "'"$TEST_EMAIL"'",
    "password": "'"$TEST_PASSWORD"'"
}')

if [ $? -eq 0 ]; then
    success=$(echo "$login_response" | jq -r '.success')
    if [ "$success" != "true" ]; then
        echo -e "${RED}Login failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}Successfully logged in and stored cookies${NC}"
else
    echo -e "${RED}Login failed${NC}"
    exit 1
fi

# Step 3: Test current user endpoint
echo -e "\n${YELLOW}=== Testing Current User Endpoint ===${NC}"
make_request "GET" "api/auth/me"

# Step 4: Create a restaurant
echo -e "\n${YELLOW}=== Testing Restaurant Creation ===${NC}"
restaurant_response=$(make_request "POST" "api/restaurant-service/restaurants" '{
    "name": "Test Restaurant",
    "locations": [
        {
            "address": "123 Test Street, Test City",
            "coordinates": {
                "latitude": 40.7128,
                "longitude": -74.0060
            }
        }
    ]
}')

restaurant_id=""
if [ $? -eq 0 ]; then
    restaurant_id=$(echo "$restaurant_response" | jq -r '.id')
    if [ -z "$restaurant_id" ] || [ "$restaurant_id" == "null" ]; then
        # Try to get existing restaurant
        echo -e "${YELLOW}Failed to create restaurant, checking existing restaurants...${NC}"
        restaurants_response=$(make_request "GET" "api/restaurant-service/restaurants")
        restaurant_id=$(echo "$restaurants_response" | jq -r '.items[0].id')
        if [ -z "$restaurant_id" ] || [ "$restaurant_id" == "null" ]; then
            echo -e "${RED}Failed to get restaurant ID${NC}"
            exit 1
        else
            echo -e "${GREEN}Using existing restaurant ID: $restaurant_id${NC}"
        fi
    else
        echo -e "${GREEN}Created restaurant with ID: $restaurant_id${NC}"
    fi
else
    echo -e "${RED}Restaurant creation failed${NC}"
    exit 1
fi

# Step 5: Get restaurant details
echo -e "\n${YELLOW}=== Testing Get Restaurant Details ===${NC}"
make_request "GET" "api/restaurant-service/restaurants/$restaurant_id"

# Step 6: Create a venue
echo -e "\n${YELLOW}=== Testing Venue Creation ===${NC}"
venue_response=$(make_request "POST" "api/restaurant-service/restaurants/$restaurant_id/venues" '{
    "name": "Test Venue",
    "description": "A test venue for API testing",
    "capacity": 100
}')

venue_id=""
if [ $? -eq 0 ]; then
    venue_id=$(echo "$venue_response" | jq -r '.id')
    if [ -z "$venue_id" ] || [ "$venue_id" == "null" ]; then
        # Try to get existing venue
        echo -e "${YELLOW}Failed to create venue, checking existing venues...${NC}"
        venues_response=$(make_request "GET" "api/restaurant-service/restaurants/$restaurant_id/venues")
        venue_id=$(echo "$venues_response" | jq -r '.items[0].id')
        if [ -z "$venue_id" ] || [ "$venue_id" == "null" ]; then
            echo -e "${RED}Failed to get venue ID${NC}"
            exit 1
        else
            echo -e "${GREEN}Using existing venue ID: $venue_id${NC}"
        fi
    else
        echo -e "${GREEN}Created venue with ID: $venue_id${NC}"
    fi
else
    echo -e "${RED}Venue creation failed${NC}"
    exit 1
fi

# Step 7: Get venue details
echo -e "\n${YELLOW}=== Testing Get Venue Details ===${NC}"
make_request "GET" "api/restaurant-service/venues/$venue_id"

# Step 8: Create a table type
echo -e "\n${YELLOW}=== Testing Table Type Creation ===${NC}"
table_type_response=$(make_request "POST" "api/restaurant-service/venues/$venue_id/tableTypes" '{
    "name": "Test Table Type",
    "description": "A test table type for API testing"
}')

table_type_id=""
if [ $? -eq 0 ]; then
    table_type_id=$(echo "$table_type_response" | jq -r '.id')
    if [ -z "$table_type_id" ] || [ "$table_type_id" == "null" ]; then
        # Try to get existing table type
        echo -e "${YELLOW}Failed to create table type, checking existing table types...${NC}"
        table_types_response=$(make_request "GET" "api/restaurant-service/venues/$venue_id/tableTypes")
        table_type_id=$(echo "$table_types_response" | jq -r '.items[0].id')
        if [ -z "$table_type_id" ] || [ "$table_type_id" == "null" ]; then
            echo -e "${RED}Failed to get table type ID${NC}"
            exit 1
        else
            echo -e "${GREEN}Using existing table type ID: $table_type_id${NC}"
        fi
    else
        echo -e "${GREEN}Created table type with ID: $table_type_id${NC}"
    fi
else
    echo -e "${RED}Table type creation failed${NC}"
    exit 1
fi

# Step 9: Create a table
echo -e "\n${YELLOW}=== Testing Table Creation ===${NC}"
table_response=$(make_request "POST" "api/restaurant-service/venues/$venue_id/tables" '{
    "number": "T123",
    "capacity": 4,
    "tableTypeId": "'"$table_type_id"'"
}')

table_id=""
if [ $? -eq 0 ]; then
    table_id=$(echo "$table_response" | jq -r '.id')
    if [ -z "$table_id" ] || [ "$table_id" == "null" ]; then
        # Try to get existing table
        echo -e "${YELLOW}Failed to create table, checking existing tables...${NC}"
        tables_response=$(make_request "GET" "api/restaurant-service/venues/$venue_id/tables")
        table_id=$(echo "$tables_response" | jq -r '.items[0].id')
        if [ -z "$table_id" ] || [ "$table_id" == "null" ]; then
            echo -e "${RED}Failed to get table ID${NC}"
            exit 1
        else
            echo -e "${GREEN}Using existing table ID: $table_id${NC}"
        fi
    else
        echo -e "${GREEN}Created table with ID: $table_id${NC}"
    fi
else
    echo -e "${RED}Table creation failed${NC}"
    exit 1
fi

# Step 10: Get table details
echo -e "\n${YELLOW}=== Testing Get Table Details ===${NC}"
make_request "GET" "api/restaurant-service/tables/$table_id"

# Step 11: Create a menu
echo -e "\n${YELLOW}=== Testing Menu Creation ===${NC}"
menu_response=$(make_request "POST" "api/restaurant-service/venues/$venue_id/menus" '{
    "name": "Test Menu",
    "description": "A test menu for API testing"
}')

menu_id=""
if [ $? -eq 0 ]; then
    menu_id=$(echo "$menu_response" | jq -r '.id')
    if [ -z "$menu_id" ] || [ "$menu_id" == "null" ]; then
        # Try to get existing menu
        echo -e "${YELLOW}Failed to create menu, checking existing menus...${NC}"
        menus_response=$(make_request "GET" "api/restaurant-service/venues/$venue_id/menus")
        menu_id=$(echo "$menus_response" | jq -r '.items[0].id')
        if [ -z "$menu_id" ] || [ "$menu_id" == "null" ]; then
            echo -e "${RED}Failed to get menu ID${NC}"
            exit 1
        else
            echo -e "${GREEN}Using existing menu ID: $menu_id${NC}"
        fi
    else
        echo -e "${GREEN}Created menu with ID: $menu_id${NC}"
    fi
else
    echo -e "${RED}Menu creation failed${NC}"
    exit 1
fi

# Step 12: Create a category
echo -e "\n${YELLOW}=== Testing Category Creation ===${NC}"
category_response=$(make_request "POST" "api/restaurant-service/menus/$menu_id/categories" '{
    "name": "Test Category",
    "description": "A test category for API testing"
}')

category_id=""
if [ $? -eq 0 ]; then
    category_id=$(echo "$category_response" | jq -r '.id')
    if [ -z "$category_id" ] || [ "$category_id" == "null" ]; then
        # Try to get existing category
        echo -e "${YELLOW}Failed to create category, checking existing categories...${NC}"
        categories_response=$(make_request "GET" "api/restaurant-service/menus/$menu_id/categories")
        category_id=$(echo "$categories_response" | jq -r '.items[0].id')
        if [ -z "$category_id" ] || [ "$category_id" == "null" ]; then
            echo -e "${RED}Failed to get category ID${NC}"
            exit 1
        else
            echo -e "${GREEN}Using existing category ID: $category_id${NC}"
        fi
    else
        echo -e "${GREEN}Created category with ID: $category_id${NC}"
    fi
else
    echo -e "${RED}Category creation failed${NC}"
    exit 1
fi

# Step 13: Create a menu item
echo -e "\n${YELLOW}=== Testing Menu Item Creation ===${NC}"
menu_item_response=$(make_request "POST" "api/restaurant-service/categories/$category_id/menuItems" '{
    "name": "Test Item",
    "description": "A test menu item for API testing",
    "price": 9.99,
    "isAvailable": true
}')

menu_item_id=""
if [ $? -eq 0 ]; then
    menu_item_id=$(echo "$menu_item_response" | jq -r '.id')
    if [ -z "$menu_item_id" ] || [ "$menu_item_id" == "null" ]; then
        # Try to get existing menu item
        echo -e "${YELLOW}Failed to create menu item, checking existing menu items...${NC}"
        menu_items_response=$(make_request "GET" "api/restaurant-service/categories/$category_id/menuItems")
        menu_item_id=$(echo "$menu_items_response" | jq -r '.items[0].id')
        if [ -z "$menu_item_id" ] || [ "$menu_item_id" == "null" ]; then
            echo -e "${RED}Failed to get menu item ID${NC}"
            exit 1
        else
            echo -e "${GREEN}Using existing menu item ID: $menu_item_id${NC}"
        fi
    else
        echo -e "${GREEN}Created menu item with ID: $menu_item_id${NC}"
    fi
else
    echo -e "${RED}Menu item creation failed${NC}"
    exit 1
fi

# Step 14: Create an order
echo -e "\n${YELLOW}=== Testing Order Creation ===${NC}"
order_response=$(make_request "POST" "api/order-service/tables/$table_id/orders" '{
    "items": [
        {
            "menuItemId": "'"$menu_item_id"'",
            "quantity": 2,
            "notes": "Test notes"
        }
    ]
}')

order_id=""
if [ $? -eq 0 ]; then
    order_id=$(echo "$order_response" | jq -r '.id')
    if [ -z "$order_id" ] || [ "$order_id" == "null" ]; then
        # Try to get existing order
        echo -e "${YELLOW}Failed to create order, checking existing orders...${NC}"
        orders_response=$(make_request "GET" "api/order-service/tables/$table_id/orders")
        order_id=$(echo "$orders_response" | jq -r '.items[0].id')
        if [ -z "$order_id" ] || [ "$order_id" == "null" ]; then
            echo -e "${RED}Failed to get order ID${NC}"
            exit 1
        else
            echo -e "${GREEN}Using existing order ID: $order_id${NC}"
        fi
    else
        echo -e "${GREEN}Created order with ID: $order_id${NC}"
    fi
else
    echo -e "${RED}Order creation failed${NC}"
    exit 1
fi

# Step 15: Get order details
echo -e "\n${YELLOW}=== Testing Get Order Details ===${NC}"
make_request "GET" "api/order-service/orders/$order_id"

# Step 16: Update order status
echo -e "\n${YELLOW}=== Testing Order Status Update ===${NC}"
make_request "PATCH" "api/order-service/orders/$order_id" '{
    "status": "preparing"
}'

echo -e "\n${GREEN}API testing completed. Responses saved in: $RESPONSE_DIR${NC}"
echo -e "${YELLOW}Run ./document-api.sh to generate API documentation from the saved responses${NC}"

exit 0