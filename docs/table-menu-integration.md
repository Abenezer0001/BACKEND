**Method:** GET
**Description:** Get tables for a specific venue
**Example Response:** Array of table objects

### 3. Venues
**Endpoint:** `/api/venues`
**Method:** GET
**Description:** Get all venues
**Example Response:** Array of venue objects with name, description, capacity, etc.

### 4. Menus
**Endpoint:** `/api/menus`
**Method:** GET
**Parameters:** 
- `restaurantId` (optional): Filter menus by restaurant

**Example Response:**
```json
{
  "_id": "681a58511a12c59b214b3a7d",
  "name": "Barista Counter Menu",
  "description": "Menu for Barista Counter",
  "venueId": {
    "_id": "681a582a1a12c59b214b3904",
    "name": "Barista Counter"
  },
  "categories": [...],
  "subCategories": [...]
}
```

### 5. Categories
**Endpoint:** `/api/categories`
**Method:** GET
**Description:** Get all menu categories
**Example Response:** Array of category objects

### 6. Subcategories
**Endpoint:** `/api/subcategories`
**Method:** GET
**Parameters:**
- `categoryId` (optional): Filter subcategories by category

**Example Response:** Array of subcategory objects

### 7. Menu Items
**Endpoint:** `/api/menu-items`
**Method:** GET
**Description:** Get all menu items
**Example Response:** Array of menu item objects with prices, descriptions, etc.

## Integration Steps

1. When a QR code is scanned:
   - Extract table ID from URL parameter
   - Call table endpoint to get table details and venue ID

2. Using the venue ID:
   - Fetch venue details
   - Get associated menu for the venue

3. For the menu:
   - Load categories
   - For each category, load subcategories
   - Display menu items organized by category and subcategory

## Frontend Display Structure

```
Menu
├── Category 1 (e.g., "Popcorn & Snacks")
│   ├── Subcategory 1.1 (e.g., "Popcorn")
│   │   ├── Menu Item 1.1.1
│   │   └── Menu Item 1.1.2
│   └── Subcategory 1.2 (e.g., "Nachos")
│       ├── Menu Item 1.2.1
│       └── Menu Item 1.2.2
└── Category 2 (e.g., "Beverages")
    ├── Subcategory 2.1 (e.g., "Cold Drinks")
    └── Subcategory 2.2 (e.g., "Hot Drinks")
```

## Implementation Notes

1. Data consistency: Ensure proper error handling for cases where:
   - Table ID is invalid
   - Venue is inactive
   - Menu items are unavailable

2. Performance optimization:
   - Cache menu data where appropriate
   - Load menu items on demand per category/subcategory
   - Implement pagination for large menu lists

3. User experience:
   - Show loading states during data fetching
   - Implement smooth transitions between categories
   - Display clear error messages if data loading fails

## Example API Flow

```javascript
// 1. Get table info
const tableId = "681a582f1a12c59b214b393a";
const table = await fetch(`/api/tables/${tableId}`);

// 2. Get venue menu
const venueId = table.venueId;
const menu = await fetch(`/api/menus?venueId=${venueId}`);

// 3. Get categories and items
const categories = menu.categories;
for (const category of categories) {
  const subcategories = await fetch(`/api/subcategories?categoryId=${category._id}`);
  // Load and display menu items
}
```

# Table and Menu Integration Guide

This document outlines the REST API endpoints available for integrating table scanning with menu display functionality in the INSEAT system. These endpoints support the flow where a user scans a table QR code, and the system displays the appropriate menu items based on the table's venue and associated menus.

## Data Relationships

The key entities and their relationships in this integration are:

- **Table**: Belongs to a Venue (via `venueId`)
- **Venue**: Belongs to a Restaurant and has many Menus
- **Menu**: Contains Categories and SubCategories
- **Category**: Contains SubCategories
- **SubCategory**: Contains MenuItems
- **MenuItem**: The actual food/beverage items displayed on menus

## Integration Flow

1. User scans a QR code with a table ID
2. System identifies the table by ID
3. System determines the venue associated with the table
4. System gets active menus for that venue
5. System loads the menu hierarchy (categories, subcategories, and menu items)
6. Menu data is displayed to the user on the frontend

## API Endpoints

Base URL: `http://localhost:3001/api`

### Tables

#### Get All Tables for a Restaurant

```
GET /api/restaurants/{restaurantId}/tables
```

**Path Parameters:**
- `restaurantId` (number): ID of the restaurant

**Response:**
```json
[
  {
    "id": 1,
    "name": "Table 1",
    "venueId": 1,
    "restaurantId": 1,
    "qrCode": "table1-qr",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Table 2",
    "venueId": 1,
    "restaurantId": 1,
    "qrCode": "table2-qr",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
]
```

#### Get All Tables for a Venue

```
GET /api/restaurants/{restaurantId}/venues/{venueId}/tables
```

**Path Parameters:**
- `restaurantId` (number): ID of the restaurant
- `venueId` (number): ID of the venue

**Response:**
```json
[
  {
    "id": 1,
    "name": "Table 1",
    "venueId": 1,
    "restaurantId": 1,
    "qrCode": "table1-qr",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Table 2",
    "venueId": 1,
    "restaurantId": 1,
    "qrCode": "table2-qr",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
]
```

#### Get Table by ID

```
GET /api/tables/{tableId}
```

**Path Parameters:**
- `tableId` (number): ID of the table

**Response:**
```json
{
  "id": 1,
  "name": "Table 1",
  "venueId": 1,
  "restaurantId": 1,
  "qrCode": "table1-qr",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

### Venues

#### Get All Venues

```
GET /api/venues
```

**Query Parameters:**
- `restaurantId` (optional, number): Filter venues by restaurant ID

**Response:**
```json
[
  {
    "id": 1,
    "name": "Main Hall",
    "description": "Main dining area",
    "restaurantId": 1,
    "address": "123 Main St",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Patio",
    "description": "Outdoor seating area",
    "restaurantId": 1,
    "address": "123 Main St",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
]
```

#### Get Venue by ID

```
GET /api/venues/{venueId}
```

**Path Parameters:**
- `venueId` (number): ID of the venue

**Response:**
```json
{
  "id": 1,
  "name": "Main Hall",
  "description": "Main dining area",
  "restaurantId": 1,
  "address": "123 Main St",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

### Restaurants

#### Get All Restaurants

```
GET /api/restaurants
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Restaurant Name",
    "description": "Restaurant description",
    "logo": "logo-url.jpg",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
]
```

#### Get Restaurant by ID

```
GET /api/restaurants/{restaurantId}
```

**Path Parameters:**
- `restaurantId` (number): ID of the restaurant

**Response:**
```json
{
  "id": 1,
  "name": "Restaurant Name",
  "description": "Restaurant description",
  "logo": "logo-url.jpg",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

### Menus

#### Get All Menus

```
GET /api/menus
```

**Query Parameters:**
- `restaurantId` (optional, number): Filter menus by restaurant ID
- `venueId` (optional, number): Filter menus by venue ID
- `active` (optional, boolean): Filter by active status

**Response:**
```json
[
  {
    "id": 1,
    "name": "Lunch Menu",
    "description": "Available from 11am to 3pm",
    "restaurantId": 1,
    "active": true,
    "startTime": "11:00:00",
    "endTime": "15:00:00",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Dinner Menu",
    "description": "Available from 5pm to 10pm",
    "restaurantId": 1,
    "active": true,
    "startTime": "17:00:00",
    "endTime": "22:00:00",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
]
```

#### Get Menu by ID

```
GET /api/menus/{menuId}
```

**Path Parameters:**
- `menuId` (number): ID of the menu

**Response:**
```json
{
  "id": 1,
  "name": "Lunch Menu",
  "description": "Available from 11am to 3pm",
  "restaurantId": 1,
  "active": true,
  "startTime": "11:00:00",
  "endTime": "15:00:00",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

### Categories

#### Get All Categories

```
GET /api/categories
```

**Query Parameters:**
- `menuId` (optional, number): Filter categories by menu ID

**Response:**
```json
[
  {
    "id": 1,
    "name": "Appetizers",
    "description": "Starters and small plates",
    "menuId": 1,
    "image": "appetizers.jpg",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Main Courses",
    "description": "Entrees and main dishes",
    "menuId": 1,
    "image": "mains.jpg",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
]
```

#### Get Category by ID

```
GET /api/categories/{categoryId}
```

**Path Parameters:**
- `categoryId` (number): ID of the category

**Response:**
```json
{
  "id": 1,
  "name": "Appetizers",
  "description": "Starters and small plates",
  "menuId": 1,
  "image": "appetizers.jpg",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

### Subcategories

#### Get All Subcategories

```
GET /api/subcategories
```

**Query Parameters:**
- `categoryId` (optional, number): Filter subcategories by category ID

**Response:**
```json
[
  {
    "id": 1,
    "name": "Salads",
    "description": "Fresh salads",
    "categoryId": 1,
    "image": "salads.jpg",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Soups",
    "description": "Hot soups",
    "categoryId": 1,
    "image": "soups.jpg",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
]
```

#### Get Subcategory by ID

```
GET /api/subcategories/{subcategoryId}
```

**Path Parameters:**
- `subcategoryId` (number): ID of the subcategory

**Response:**
```json
{
  "id": 1,
  "name": "Salads",
  "description": "Fresh salads",
  "categoryId": 1,
  "image": "salads.jpg",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

### Menu Items

#### Get All Menu Items

```
GET /api/menu-items
```

**Query Parameters:**
- `subcategoryId` (optional, number): Filter menu items by subcategory ID

**Response:**
```json
[
  {
    "id": 1,
    "name": "Caesar Salad",
    "description": "Romaine lettuce, croutons, parmesan cheese with Caesar dressing",
    "price": 8.99,
    "image": "caesar-salad.jpg",
    "subcategoryId": 1,
    "available": true,
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Greek Salad",
    "description": "Tomatoes, cucumbers, onions, feta cheese with olive oil dressing",
    "price": 7.99,
    "image": "greek-salad.jpg",
    "subcategoryId": 1,
    "available": true,
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
]
```

#### Get Menu Item by ID

```
GET /api/menu-items/{menuItemId}
```

**Path Parameters:**
- `menuItemId` (number): ID of the menu item

**Response:**
```json
{
  "id": 1,
  "name": "Caesar Salad",
  "description": "Romaine lettuce, croutons, parmesan cheese with Caesar dressing",
  "price": 8.99,
  "image": "caesar-salad.jpg",
  "subcategoryId": 1,
  "available": true,
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

## Integration Steps

To implement the table-to-menu integration in the frontend:

1. **Table Scan Handling:**
   - Extract the table ID from the QR code URL parameter
   - Use the `/api/tables/{tableId}` endpoint to get the table details, including `venueId` and `restaurantId`

2. **Menu Loading:**
   - Use `/api/menus?restaurantId={restaurantId}&venueId={venueId}&active=true` to get active menus for this venue
   - Select the appropriate menu based on current time (comparing with `startTime` and `endTime`)

3. **Menu Structure Loading:**
   - Get categories for the selected menu using `/api/categories?menuId={menuId}`
   - For each category, get subcategories using `/api/subcategories?categoryId={categoryId}`
   - For each subcategory, get menu items using `/api/menu-items?subcategoryId={subcategoryId}`

4. **Display:**
   - Present the hierarchical menu structure in the UI with categories, subcategories, and menu items
   - Allow filtering and navigation between different sections

This integration ensures that when a customer scans a table's QR code, they see the appropriate menu for that specific venue, with all categories, subcategories, and menu items properly organized.

# Table Menu Integration Documentation

## Overview
This document outlines the integration between table QR codes and the menu system, detailing the endpoints necessary to retrieve and display menu information when a table is scanned.

## Endpoints

### 1. Get Table Information
Retrieves table details and associated venue information when a table QR code is scanned.

**Endpoint:** `GET /api/tables/details`
**Query Parameters:**
- `tableId`: String (required) - The unique identifier of the table from QR code

**Response:**
```json
{
  "success": true,
  "data": {
    "table": {
      "id": "string",
      "number": "string",
      "venueId": "string",
      "isActive": boolean,
      "menuId": "string" (optional)
    },
    "venue": {
      "id": "string",
      "name": "string",
      "description": "string"
    }
  }
}
```

**Error Responses:**
- 404: Table not found
- 400: Invalid table ID
- 403: Table is inactive

### 2. Get Venue Menu
Retrieves the menu associated with the venue and table.

**Endpoint:** `GET /api/venues/{venueId}/menus`
**Query Parameters:**
- `menuId`: String (optional) - Specific menu ID if table has one assigned

**Response:**
```json
{
  "success": true,
  "data": {
    "menu": {
      "id": "string",
      "name": "string",
      "description": "string",
      "categories": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "image": "string",
          "subCategories": [
            {
              "id": "string",
              "name": "string",
              "description": "string",
              "image": "string",
              "menuItems": [
                {
                  "id": "string",
                  "name": "string",
                  "description": "string",
                  "price": number,
                  "image": "string",
                  "isAvailable": boolean,
                  "preparationTime": number,
                  "allergens": ["string"],
                  "nutritionalInfo": {
                    "calories": number,
                    "protein": number,
                    "carbohydrates": number,
                    "fats": number
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

**Error Responses:**
- 404: Venue not found
- 404: Menu not found
- 403: Venue is inactive

### Integration Flow

1. When a QR code is scanned, the front-end application receives a table ID
2. The application calls the table details endpoint to verify the table and get venue information
3. Using the venue information and optional menuId, the application retrieves the full menu structure
4. The front-end displays:
   - Categories at the top level
   - Subcategories when a category is selected
   - Menu items within each subcategory

### Error Handling
- All endpoints should validate input parameters
- Return appropriate HTTP status codes and error messages
- Handle cases where data is missing or relationships are broken
- Validate active/inactive status of all entities (table, venue, menu items)

### Security Considerations
- No authentication required for menu viewing
- Rate limiting should be implemented on all endpoints
- Validate all input parameters to prevent injection attacks
- Sanitize all response data to prevent XSS

