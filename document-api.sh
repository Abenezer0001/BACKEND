#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
RESPONSE_DIR="api_responses"
DOC_FILE="api-documentation.md"

echo -e "${BLUE}Generating API documentation from test responses...${NC}"

# Check if response directory exists
if [ ! -d "$RESPONSE_DIR" ]; then
    echo -e "${RED}Error: Response directory '$RESPONSE_DIR' not found.${NC}"
    echo -e "${YELLOW}Please run ./test-all-endpoints.sh first to generate API responses.${NC}"
    exit 1
fi

# Function to process an endpoint response file
process_endpoint() {
    local file_pattern="$RESPONSE_DIR/$1"
    local endpoint="$2"
    local method="$3"
    
    # Find matching files
    for file in $file_pattern; do
        if [ ! -f "$file" ]; then
            echo "**Endpoint Not Tested:** No response found for this endpoint."
            return
        fi
        
        # Extract parameters from endpoint
        local params=$(echo "$endpoint" | grep -o '{[^}]*}' | tr -d '{}')
        
        echo "**URL:** \`$method /$endpoint\`"
        
        if [ -n "$params" ]; then
            echo -e "\n**URL Parameters:**"
            for param in $params; do
                echo "- \`$param\`: Required. The ID of the $param."
            done
        fi
        
        # Add request body examples based on method and endpoint
        if [ "$method" != "GET" ]; then
            echo -e "\n**Request Body:**"
            
            if [[ "$endpoint" == "auth/register" ]]; then
                cat << EOF
\`\`\`json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "First",
  "lastName": "Last"
}
\`\`\`
EOF
            elif [[ "$endpoint" == "auth/login" ]]; then
                cat << EOF
\`\`\`json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
\`\`\`
EOF
            elif [[ "$endpoint" == *"restaurants"* && ! "$endpoint" =~ "/[0-9]+" ]]; then
                cat << EOF
\`\`\`json
{
  "name": "Restaurant Name",
  "locations": [
    {
      "address": "123 Example Street, City",
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    }
  ]
}
\`\`\`
EOF
            elif [[ "$endpoint" == *"venues"* && "$endpoint" =~ "restaurants/.*venues" ]]; then
                cat << EOF
\`\`\`json
{
  "name": "Venue Name",
  "description": "Venue Description",
  "capacity": 100
}
\`\`\`
EOF
            elif [[ "$endpoint" == *"tableTypes"* ]]; then
                cat << EOF
\`\`\`json
{
  "name": "Table Type Name",
  "description": "Table Type Description"
}
\`\`\`
EOF
            elif [[ "$endpoint" == *"tables"* && "$endpoint" =~ "venues/.*tables" ]]; then
                cat << EOF
\`\`\`json
{
  "number": "T123",
  "capacity": 4,
  "tableTypeId": "table-type-id"
}
\`\`\`
EOF
            elif [[ "$endpoint" == *"menus"* && "$endpoint" =~ "venues/.*menus" ]]; then
                cat << EOF
\`\`\`json
{
  "name": "Menu Name",
  "description": "Menu Description"
}
\`\`\`
EOF
            elif [[ "$endpoint" == *"categories"* && "$endpoint" =~ "menus/.*categories" ]]; then
                cat << EOF
\`\`\`json
{
  "name": "Category Name",
  "description": "Category Description"
}
\`\`\`
EOF
            elif [[ "$endpoint" == *"menuItems"* ]]; then
                cat << EOF
\`\`\`json
{
  "name": "Item Name",
  "description": "Item Description",
  "price": 9.99,
  "isAvailable": true
}
\`\`\`
EOF
            elif [[ "$endpoint" == *"orders"* && "$endpoint" =~ "tables/.*orders" ]]; then
                cat << EOF
\`\`\`json
{
  "items": [
    {
      "menuItemId": "menu-item-id",
      "quantity": 2,
      "notes": "Special instructions"
    }
  ]
}
\`\`\`
EOF
            elif [[ "$endpoint" =~ "orders/.*" && "$method" == "PATCH" ]]; then
                cat << EOF
\`\`\`json
{
  "status": "preparing"
}
\`\`\`
EOF
            else
                echo "Response body format not documented."
            fi
        fi
        
        # Check if response is valid JSON
        if jq '.' "$file" > /dev/null 2>&1; then
            echo -e "\n**Response Example:**"
            echo "\`\`\`json"
            jq '.' "$file"
            echo "\`\`\`"
            
            # Extract status or error from JSON if available
            if jq -e '.statusCode' "$file" > /dev/null 2>&1; then
                local status=$(jq -r '.statusCode' "$file")
                echo -e "\n**Status Code:** $status"
                
                if [ "$status" != "200" ] && [ "$status" != "201" ]; then
                    echo -e "\n**Note:** This endpoint returned an error response."
                fi
            fi
        else
            echo -e "\n**Invalid Response:**"
            echo "\`\`\`"
            cat "$file"
            echo "\`\`\`"
            echo -e "\n**Note:** This endpoint did not return valid JSON."
        fi
        
        # Only process the first matching file
        break
    done
}

# Initialize documentation file
cat > "$DOC_FILE" << EOF
# INSEAT API Documentation

This document provides a comprehensive reference for the INSEAT API endpoints.

## Table of Contents

- [Authentication](#authentication)
- [Restaurant Service](#restaurant-service)
- [Order Service](#order-service)

## Authentication
EOF

# Process authentication endpoints
echo -e "${YELLOW}Processing authentication endpoints...${NC}"
echo -e "\n### Register User\n" >> "$DOC_FILE"
process_endpoint "POST__auth_register.json" "auth/register" "POST" >> "$DOC_FILE"

echo -e "\n### Login User\n" >> "$DOC_FILE"
process_endpoint "POST__auth_login.json" "auth/login" "POST" >> "$DOC_FILE"

echo -e "\n### Get Current User\n" >> "$DOC_FILE"
process_endpoint "GET__auth_me.json" "auth/me" "GET" >> "$DOC_FILE"

# Add Restaurant Service section
cat >> "$DOC_FILE" << EOF

## Restaurant Service
EOF

# Process restaurant endpoints
echo -e "${YELLOW}Processing restaurant endpoints...${NC}"
echo -e "\n### Create Restaurant\n" >> "$DOC_FILE"
process_endpoint "POST__restaurant-service_restaurants.json" "restaurant-service/restaurants" "POST" >> "$DOC_FILE"

echo -e "\n### Get Restaurants\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_restaurants.json" "restaurant-service/restaurants" "GET" >> "$DOC_FILE"

echo -e "\n### Get Restaurant by ID\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_restaurants_*.json" "restaurant-service/restaurants/{id}" "GET" >> "$DOC_FILE"

echo -e "\n### Create Venue\n" >> "$DOC_FILE"
process_endpoint "POST__restaurant-service_restaurants_*_venues.json" "restaurant-service/restaurants/{restaurantId}/venues" "POST" >> "$DOC_FILE"

echo -e "\n### Get Venues\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_restaurants_*_venues.json" "restaurant-service/restaurants/{restaurantId}/venues" "GET" >> "$DOC_FILE"

echo -e "\n### Get Venue by ID\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_venues_*.json" "restaurant-service/venues/{id}" "GET" >> "$DOC_FILE"

echo -e "\n### Create Table Type\n" >> "$DOC_FILE"
process_endpoint "POST__restaurant-service_venues_*_tableTypes.json" "restaurant-service/venues/{venueId}/tableTypes" "POST" >> "$DOC_FILE"

echo -e "\n### Get Table Types\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_venues_*_tableTypes.json" "restaurant-service/venues/{venueId}/tableTypes" "GET" >> "$DOC_FILE"

echo -e "\n### Create Table\n" >> "$DOC_FILE"
process_endpoint "POST__restaurant-service_venues_*_tables.json" "restaurant-service/venues/{venueId}/tables" "POST" >> "$DOC_FILE"

echo -e "\n### Get Tables\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_venues_*_tables.json" "restaurant-service/venues/{venueId}/tables" "GET" >> "$DOC_FILE"

echo -e "\n### Get Table by ID\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_tables_*.json" "restaurant-service/tables/{id}" "GET" >> "$DOC_FILE"

echo -e "\n### Create Menu\n" >> "$DOC_FILE"
process_endpoint "POST__restaurant-service_venues_*_menus.json" "restaurant-service/venues/{venueId}/menus" "POST" >> "$DOC_FILE"

echo -e "\n### Get Menus\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_venues_*_menus.json" "restaurant-service/venues/{venueId}/menus" "GET" >> "$DOC_FILE"

echo -e "\n### Create Category\n" >> "$DOC_FILE"
process_endpoint "POST__restaurant-service_menus_*_categories.json" "restaurant-service/menus/{menuId}/categories" "POST" >> "$DOC_FILE"

echo -e "\n### Get Categories\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_menus_*_categories.json" "restaurant-service/menus/{menuId}/categories" "GET" >> "$DOC_FILE"

echo -e "\n### Create Menu Item\n" >> "$DOC_FILE"
process_endpoint "POST__restaurant-service_categories_*_menuItems.json" "restaurant-service/categories/{categoryId}/menuItems" "POST" >> "$DOC_FILE"

echo -e "\n### Get Menu Items\n" >> "$DOC_FILE"
process_endpoint "GET__restaurant-service_categories_*_menuItems.json" "restaurant-service/categories/{categoryId}/menuItems" "GET" >> "$DOC_FILE"

# Add Order Service section
cat >> "$DOC_FILE" << EOF

## Order Service
EOF

# Process order endpoints
echo -e "${YELLOW}Processing order endpoints...${NC}"
echo -e "\n### Create Order\n" >> "$DOC_FILE"
process_endpoint "POST__order-service_tables_*_orders.json" "order-service/tables/{tableId}/orders" "POST" >> "$DOC_FILE"

echo -e "\n### Get Orders for Table\n" >> "$DOC_FILE"
process_endpoint "GET__order-service_tables_*_orders.json" "order-service/tables/{tableId}/orders" "GET" >> "$DOC_FILE"

echo -e "\n### Get Order by ID\n" >> "$DOC_FILE"
process_endpoint "GET__order-service_orders_*.json" "order-service/orders/{id}" "GET" >> "$DOC_FILE"

echo -e "\n### Update Order Status\n" >> "$DOC_FILE"
process_endpoint "PATCH__order-service_orders_*.json" "order-service/orders/{id}" "PATCH" >> "$DOC_FILE"

# Add notes section
cat >> "$DOC_FILE" << EOF

## Notes

- Authentication is required for most endpoints. Include the Authorization header with a valid JWT token.
- All requests with a body should use the Content-Type: application/json header.
- Successful responses have status codes 200 (OK) or 201 (Created).
- Error responses include a status code and error message.
EOF

echo -e "${GREEN}API documentation generated: $DOC_FILE${NC}"

exit 0