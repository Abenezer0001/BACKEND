#!/bin/bash

# COMPREHENSIVE INVENTORY ENDPOINT TESTING SCRIPT
# Run this after server restart to test all inventory functionality

echo "🚀 INSEAT Inventory System - Comprehensive Testing"
echo "=================================================="

# Configuration
BASE_URL="http://localhost:3001"
RESTAURANT_ID="6861808c53aed6bbdb915978"  # Sushi Spot
EMAIL="owner@cinemacity.com"
PASSWORD="password123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
print_info "Step 1: Authentication"
echo "----------------------------------------"

# Get JWT Token
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    print_status 0 "Authentication successful"
    print_info "JWT Token obtained: ${TOKEN:0:50}..."
else
    print_status 1 "Authentication failed"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo ""
print_info "Step 2: Basic Health Checks"
echo "----------------------------------------"

# Test basic health
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
if echo $HEALTH_RESPONSE | grep -q '"status":"ok"'; then
    print_status 0 "Basic health check passed"
else
    print_status 1 "Basic health check failed"
fi

echo ""
print_info "Step 3: Inventory Endpoints Testing"
echo "----------------------------------------"

# Test 1: Inventory Health Check
print_info "Testing inventory health endpoint..."
INVENTORY_HEALTH=$(curl -s "$BASE_URL/api/inventory/health")
if echo $INVENTORY_HEALTH | grep -q 'inventory'; then
    print_status 0 "Inventory health endpoint working"
    echo "Response: $INVENTORY_HEALTH" | jq .
else
    print_status 1 "Inventory health endpoint failed"
    echo "Response: $INVENTORY_HEALTH"
fi

echo ""

# Test 2: Get All Inventory Items
print_info "Testing GET /api/inventory/items..."
ITEMS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/inventory/items?restaurantId=$RESTAURANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo $ITEMS_RESPONSE | grep -q '"success":true'; then
    print_status 0 "GET inventory items successful"
    ITEM_COUNT=$(echo $ITEMS_RESPONSE | jq '.data | length')
    print_info "Found $ITEM_COUNT inventory items"
    echo "Sample items:"
    echo $ITEMS_RESPONSE | jq '.data[0:2][] | {name: .name, category: .category, currentStock: .currentStock, unit: .unit}'
else
    print_status 1 "GET inventory items failed"
    echo "Response: $ITEMS_RESPONSE"
fi

echo ""

# Test 3: Get Inventory Item by ID
print_info "Testing GET /api/inventory/items/:id..."
FIRST_ITEM_ID=$(echo $ITEMS_RESPONSE | jq -r '.data[0]._id')
if [ "$FIRST_ITEM_ID" != "null" ] && [ "$FIRST_ITEM_ID" != "" ]; then
    ITEM_DETAIL=$(curl -s -X GET "$BASE_URL/api/inventory/items/$FIRST_ITEM_ID?restaurantId=$RESTAURANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    
    if echo $ITEM_DETAIL | grep -q '"success":true'; then
        print_status 0 "GET inventory item by ID successful"
        echo "Item details:"
        echo $ITEM_DETAIL | jq '.data | {name: .name, currentStock: .currentStock, averageCost: .averageCost, location: .location}'
    else
        print_status 1 "GET inventory item by ID failed"
        echo "Response: $ITEM_DETAIL"
    fi
else
    print_warning "No item ID available for testing"
fi

echo ""

# Test 4: Create New Inventory Item
print_info "Testing POST /api/inventory/items..."
NEW_ITEM_DATA='{
  "name": "Test Ingredient",
  "description": "Test ingredient created by API",
  "category": "Test Category",
  "unit": "pieces",
  "currentStock": 10,
  "minimumStock": 5,
  "averageCost": 2.50,
  "location": "Test Storage"
}'

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/inventory/items?restaurantId=$RESTAURANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$NEW_ITEM_DATA")

if echo $CREATE_RESPONSE | grep -q '"success":true'; then
    print_status 0 "POST inventory item successful"
    NEW_ITEM_ID=$(echo $CREATE_RESPONSE | jq -r '.data._id')
    print_info "Created item ID: $NEW_ITEM_ID"
else
    print_status 1 "POST inventory item failed"
    echo "Response: $CREATE_RESPONSE"
fi

echo ""
print_info "Step 4: Recipe Endpoints Testing"
echo "----------------------------------------"

# Test 5: Get All Recipes
print_info "Testing GET /api/inventory/recipes..."
RECIPES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/inventory/recipes?restaurantId=$RESTAURANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo $RECIPES_RESPONSE | grep -q '"success":true'; then
    print_status 0 "GET recipes successful"
    RECIPE_COUNT=$(echo $RECIPES_RESPONSE | jq '.data | length')
    print_info "Found $RECIPE_COUNT recipes"
    echo "Sample recipes:"
    echo $RECIPES_RESPONSE | jq '.data[] | {name: .name, category: .category, costPerPortion: .costPerPortion, ingredients: (.ingredients | length)}'
else
    print_status 1 "GET recipes failed"
    echo "Response: $RECIPES_RESPONSE"
fi

echo ""

# Test 6: Create New Recipe
print_info "Testing POST /api/inventory/recipes..."
FIRST_INVENTORY_ID=$(echo $ITEMS_RESPONSE | jq -r '.data[0]._id')

if [ "$FIRST_INVENTORY_ID" != "null" ] && [ "$FIRST_INVENTORY_ID" != "" ]; then
    NEW_RECIPE_DATA="{
      \"name\": \"Test Recipe\",
      \"description\": \"Test recipe created by API\",
      \"category\": \"Test Category\",
      \"servingSize\": 4,
      \"prepTime\": 15,
      \"cookTime\": 30,
      \"difficulty\": \"Medium\",
      \"instructions\": [\"Step 1: Prepare\", \"Step 2: Cook\", \"Step 3: Serve\"],
      \"ingredients\": [{
        \"inventoryItemId\": \"$FIRST_INVENTORY_ID\",
        \"quantity\": 2,
        \"unit\": \"units\",
        \"notes\": \"Test ingredient\"
      }],
      \"expectedYield\": {
        \"quantity\": 4,
        \"unit\": \"portions\"
      },
      \"costPerPortion\": 5.00
    }"

    RECIPE_CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/inventory/recipes?restaurantId=$RESTAURANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$NEW_RECIPE_DATA")

    if echo $RECIPE_CREATE_RESPONSE | grep -q '"success":true'; then
        print_status 0 "POST recipe successful"
        NEW_RECIPE_ID=$(echo $RECIPE_CREATE_RESPONSE | jq -r '.data._id')
        print_info "Created recipe ID: $NEW_RECIPE_ID"
    else
        print_status 1 "POST recipe failed"
        echo "Response: $RECIPE_CREATE_RESPONSE"
    fi
else
    print_warning "No inventory item available for recipe creation"
fi

echo ""
print_info "Step 5: Analytics Endpoints Testing"
echo "----------------------------------------"

# Test 7: Inventory Valuation
print_info "Testing GET /api/inventory/analytics/inventory/value..."
ANALYTICS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/inventory/analytics/inventory/value?restaurantId=$RESTAURANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo $ANALYTICS_RESPONSE | grep -q '"success":true'; then
    print_status 0 "GET inventory analytics successful"
    echo "Analytics data:"
    echo $ANALYTICS_RESPONSE | jq '.data | {totalValue: .totalValue, itemCount: .itemCount, categories: (.categoryBreakdown | length)}'
else
    print_status 1 "GET inventory analytics failed"
    echo "Response: $ANALYTICS_RESPONSE"
fi

echo ""
print_info "Step 6: Working Endpoints Verification"
echo "----------------------------------------"

# Test working endpoints that we know exist
print_info "Testing existing menu items endpoint..."
MENU_RESPONSE=$(curl -s -X GET "$BASE_URL/api/menu-items?restaurantId=$RESTAURANT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo $MENU_RESPONSE | grep -q '"name"'; then
    print_status 0 "Menu items endpoint working"
    MENU_COUNT=$(echo $MENU_RESPONSE | jq '. | length')
    print_info "Found $MENU_COUNT menu items"
else
    print_status 1 "Menu items endpoint failed"
fi

echo ""
print_info "Testing restaurants endpoint..."
RESTAURANT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/restaurants" \
  -H "Authorization: Bearer $TOKEN")

if echo $RESTAURANT_RESPONSE | grep -q '"name"'; then
    print_status 0 "Restaurants endpoint working"
    REST_COUNT=$(echo $RESTAURANT_RESPONSE | jq '. | length')
    print_info "Found $REST_COUNT restaurants"
else
    print_status 1 "Restaurants endpoint failed"
fi

echo ""
echo "=================================================="
print_info "TESTING COMPLETE"
echo "=================================================="

echo ""
print_info "Summary of Test Data Created:"
echo "• 5 Inventory Items (Fish, Grains, Vegetables)"
echo "• 3 Recipes (California Roll, Salmon Sashimi, Tuna Nigiri)"
echo "• Restaurant ID: $RESTAURANT_ID"
echo "• All data is scoped to Sushi Spot restaurant"

echo ""
print_info "Next Steps:"
echo "1. Restart the INSEAT-Backend server to load new routes"
echo "2. Run this script again to test all endpoints"
echo "3. Test frontend integration at http://localhost:5173"
echo "4. Verify inventory management UI functionality"
