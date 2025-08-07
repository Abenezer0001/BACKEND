#!/bin/bash

# Base URL
BASE_URL="http://localhost:3000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Testing Restaurant Management API${NC}\n"

# Create a restaurant
echo "Creating a restaurant..."
RESTAURANT_RESPONSE=$(curl -s -X POST "$BASE_URL/restaurants" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample Restaurant",
    "description": "A sample restaurant for testing",
    "address": {
      "street": "123 Test St",
      "city": "Test City",
      "state": "TS",
      "country": "Test Country",
      "postalCode": "12345"
    },
    "contact": {
      "phone": "123-456-7890",
      "email": "test@test.com",
      "website": "www.test.com"
    },
    "cuisine": ["Italian", "Mediterranean"],
    "priceRange": "$$",
    "features": ["Outdoor Seating", "Wi-Fi"]
  }')

RESTAURANT_ID=$(echo $RESTAURANT_RESPONSE | jq -r '._id')
echo -e "Restaurant created with ID: ${GREEN}$RESTAURANT_ID${NC}\n"

# Create a venue
echo "Creating a venue..."
VENUE_RESPONSE=$(curl -s -X POST "$BASE_URL/restaurants/$RESTAURANT_ID/venues" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Dining Hall",
    "description": "Main indoor dining area",
    "capacity": 100
  }')

VENUE_ID=$(echo $VENUE_RESPONSE | jq -r '._id')
echo -e "Venue created with ID: ${GREEN}$VENUE_ID${NC}\n"

# Create a table
echo "Creating a table..."
TABLE_RESPONSE=$(curl -s -X POST "$BASE_URL/restaurants/$RESTAURANT_ID/venues/$VENUE_ID/tables" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "T1",
    "capacity": 4,
    "type": "REGULAR"
  }')

TABLE_ID=$(echo $TABLE_RESPONSE | jq -r '._id')
echo -e "Table created with ID: ${GREEN}$TABLE_ID${NC}\n"

# Create a menu
echo "Creating a menu..."
MENU_RESPONSE=$(curl -s -X POST "$BASE_URL/restaurants/$RESTAURANT_ID/menus" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunch Menu",
    "categories": [{
      "name": "Appetizers",
      "items": [{
        "name": "Bruschetta",
        "description": "Toasted bread with tomatoes and herbs",
        "price": 8.99,
        "category": "Appetizers",
        "preparationTime": 10,
        "isAvailable": true,
        "allergens": ["gluten"]
      }]
    }]
  }')

MENU_ID=$(echo $MENU_RESPONSE | jq -r '._id')
echo -e "Menu created with ID: ${GREEN}$MENU_ID${NC}\n"

# Generate QR code for table
echo "Generating QR code for table..."
curl -s -X POST "$BASE_URL/restaurants/$RESTAURANT_ID/venues/$VENUE_ID/tables/$TABLE_ID/qrcode"
echo -e "\nQR code generated\n"

# Assign menu to table
echo "Assigning menu to table..."
curl -s -X POST "$BASE_URL/restaurants/$RESTAURANT_ID/venues/$VENUE_ID/tables/$TABLE_ID/menus/$MENU_ID"
echo -e "\nMenu assigned to table\n"

# Get all data
echo -e "\n${GREEN}Getting all data...${NC}"

echo -e "\n${GREEN}Restaurants:${NC}"
curl -s "$BASE_URL/restaurants" | jq '.'

echo -e "\n${GREEN}Venues:${NC}"
curl -s "$BASE_URL/restaurants/$RESTAURANT_ID/venues" | jq '.'

echo -e "\n${GREEN}Tables:${NC}"
curl -s "$BASE_URL/restaurants/$RESTAURANT_ID/venues/$VENUE_ID/tables" | jq '.'

echo -e "\n${GREEN}Menus:${NC}"
curl -s "$BASE_URL/restaurants/$RESTAURANT_ID/menus" | jq '.'

echo -e "\n${GREEN}Table QR Code:${NC}"
curl -s "$BASE_URL/restaurants/$RESTAURANT_ID/venues/$VENUE_ID/tables/$TABLE_ID/qrcode" | jq '.'
