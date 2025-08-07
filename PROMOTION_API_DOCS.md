# INSEAT Promotion API Documentation

This document provides comprehensive documentation for the INSEAT Promotion Management API endpoints.

## Base URL
```
http://localhost:3001
```

## Authentication

All endpoints require authentication using JWT tokens. Include the token in one of the following ways:

1. **Bearer Token (Header)**: `Authorization: Bearer <token>`
2. **Cookie**: Authentication cookie will be automatically included if logged in

### Authentication Response for Unauthenticated Requests
```json
{
  "success": false,
  "message": "Authentication required: No token found",
  "error": "Error: Authentication required: No token found..."
}
```

## API Endpoints

### 1. Get All Promotions for a Restaurant

**Endpoint:** `GET /api/admin-promotions`

**Description:** Retrieves all promotions for a specified restaurant with optional venue filtering.

**Authentication:** Required (System Admin or Restaurant Admin)

**Query Parameters:**
- `restaurantId` (required): The ID of the restaurant to fetch promotions for
- `venueId` (optional): Optional venue ID to filter promotions by venue

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/admin-promotions?restaurantId=681a581d1a12c59b214b386f" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response Structure:**
```json
{
  "promotions": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "title": "Summer Special",
      "description": "Get 20% off on all summer items",
      "imageUrl": "https://example.com/summer-special.jpg",
      "restaurantId": "681a581d1a12c59b214b386f",
      "enabledVenues": ["venue1", "venue2"],
      "isActive": true,
      "displayOnSplash": true,
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-08-31T23:59:59.000Z",
      "combos": [
        {
          "name": "Summer Combo",
          "description": "Burger + Drink + Fries",
          "menuItems": ["item1", "item2", "item3"],
          "discountRate": 20
        }
      ],
      "createdAt": "2024-05-15T10:30:00.000Z",
      "updatedAt": "2024-05-20T14:45:00.000Z"
    }
  ],
  "venues": [
    {
      "_id": "venue1",
      "name": "Main Dining Area",
      "description": "Primary dining space",
      "capacity": 50
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (missing required parameters)
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Internal Server Error

---

### 2. Get Specific Promotion by ID

**Endpoint:** `GET /api/admin-promotions/{promotionId}`

**Description:** Retrieves details of a specific promotion by its ID.

**Authentication:** Required (System Admin or Restaurant Admin)

**Path Parameters:**
- `promotionId` (required): The ID of the promotion

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/admin-promotions/64f1a2b3c4d5e6f7g8h9i0j1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response Structure:**
```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
  "title": "Summer Special",
  "description": "Get 20% off on all summer items",
  "imageUrl": "https://example.com/summer-special.jpg",
  "restaurantId": "681a581d1a12c59b214b386f",
  "enabledVenues": ["venue1", "venue2"],
  "isActive": true,
  "displayOnSplash": true,
  "startDate": "2024-06-01T00:00:00.000Z",
  "endDate": "2024-08-31T23:59:59.000Z",
  "combos": [
    {
      "name": "Summer Combo",
      "description": "Burger + Drink + Fries",
      "menuItems": ["item1", "item2", "item3"],
      "discountRate": 20
    }
  ],
  "createdAt": "2024-05-15T10:30:00.000Z",
  "updatedAt": "2024-05-20T14:45:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Promotion not found
- `500` - Internal Server Error

---

### 3. Create New Promotion

**Endpoint:** `POST /api/admin-promotions`

**Description:** Creates a new promotion for a restaurant.

**Authentication:** Required (System Admin or Restaurant Admin with appropriate permissions)

**Request Body:**
```json
{
  "title": "New Promotion",
  "description": "Description of the promotion",
  "imageUrl": "https://example.com/promotion-image.jpg",
  "restaurantId": "681a581d1a12c59b214b386f",
  "enabledVenues": ["venue1", "venue2"],
  "isActive": true,
  "displayOnSplash": false,
  "startDate": "2024-06-01T00:00:00.000Z",
  "endDate": "2024-08-31T23:59:59.000Z",
  "combos": [
    {
      "name": "Special Combo",
      "description": "Combo description",
      "menuItems": ["item1", "item2"],
      "discountRate": 15
    }
  ]
}
```

**Request Example:**
```bash
curl -X POST "http://localhost:3001/api/admin-promotions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Promotion",
    "description": "Description of the promotion",
    "imageUrl": "https://example.com/promotion-image.jpg",
    "restaurantId": "681a581d1a12c59b214b386f",
    "isActive": true,
    "startDate": "2024-06-01T00:00:00.000Z",
    "endDate": "2024-08-31T23:59:59.000Z"
  }'
```

**Response:** Returns the created promotion object with assigned `_id` and timestamps.

**Status Codes:**
- `201` - Created successfully
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Internal Server Error

---

### 4. Update Existing Promotion

**Endpoint:** `PUT /api/admin-promotions/{promotionId}`

**Description:** Updates an existing promotion.

**Authentication:** Required (System Admin or Restaurant Admin with appropriate permissions)

**Path Parameters:**
- `promotionId` (required): The ID of the promotion to update

**Request Body:** (All fields optional, include only fields to update)
```json
{
  "title": "Updated Title",
  "isActive": false,
  "endDate": "2024-09-30T23:59:59.000Z"
}
```

**Request Example:**
```bash
curl -X PUT "http://localhost:3001/api/admin-promotions/64f1a2b3c4d5e6f7g8h9i0j1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Summer Special",
    "isActive": false
  }'
```

**Response:** Returns the updated promotion object.

**Status Codes:**
- `200` - Updated successfully
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Promotion not found
- `500` - Internal Server Error

---

### 5. Delete Promotion

**Endpoint:** `DELETE /api/admin-promotions/{promotionId}`

**Description:** Deletes a promotion permanently.

**Authentication:** Required (System Admin or Restaurant Admin with appropriate permissions)

**Path Parameters:**
- `promotionId` (required): The ID of the promotion to delete

**Request Example:**
```bash
curl -X DELETE "http://localhost:3001/api/admin-promotions/64f1a2b3c4d5e6f7g8h9i0j1" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "message": "Promotion deleted successfully"
}
```

**Status Codes:**
- `200` - Deleted successfully
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Promotion not found
- `500` - Internal Server Error

---

### 6. Get Menu Items for Restaurant

**Endpoint:** `GET /api/admin-promotions/restaurants/{restaurantId}/menu-items`

**Description:** Retrieves all active menu items for a restaurant to help with combo creation.

**Authentication:** Required (System Admin or Restaurant Admin)

**Path Parameters:**
- `restaurantId` (required): The ID of the restaurant

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/admin-promotions/restaurants/681a581d1a12c59b214b386f/menu-items" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
[
  {
    "_id": "item1",
    "name": "Classic Burger",
    "description": "Beef patty with cheese and vegetables",
    "price": 12.99,
    "category": "Main Course",
    "isActive": true
  },
  {
    "_id": "item2",
    "name": "French Fries",
    "description": "Crispy golden fries",
    "price": 4.99,
    "category": "Sides",
    "isActive": true
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Restaurant not found
- `500` - Internal Server Error

---

### 7. Get Venues for Restaurant

**Endpoint:** `GET /api/admin-promotions/restaurants/{restaurantId}/venues`

**Description:** Retrieves all venues for a restaurant to help with venue enablement for promotions.

**Authentication:** Required (System Admin or Restaurant Admin)

**Path Parameters:**
- `restaurantId` (required): The ID of the restaurant

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/admin-promotions/restaurants/681a581d1a12c59b214b386f/venues" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
[
  {
    "_id": "venue1",
    "name": "Main Dining Area",
    "description": "Primary dining space with full service",
    "capacity": 50
  },
  {
    "_id": "venue2",
    "name": "Outdoor Patio",
    "description": "Outdoor seating area",
    "capacity": 30
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Restaurant not found
- `500` - Internal Server Error

---

## Related Restaurant Endpoints

### 8. Get Restaurants by Business

**Endpoint:** `GET /api/restaurants/business/{businessId}`

**Description:** Retrieves all restaurants for a specific business.

**Authentication:** Required (System Admin or Restaurant Admin)

**Path Parameters:**
- `businessId` (required): The ID of the business

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/restaurants/business/68415b8095a2208cec9743a2" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
[
  {
    "_id": "681a581d1a12c59b214b386f",
    "name": "Downtown Restaurant",
    "description": "Modern dining experience in the heart of the city",
    "businessId": "68415b8095a2208cec9743a2",
    "venues": [
      {
        "_id": "venue1",
        "name": "Main Dining Area",
        "description": "Primary dining space"
      }
    ]
  }
]
```

**Status Codes:**
- `200` - Success
- `400` - Invalid business ID
- `401` - Unauthorized
- `403` - Access denied
- `500` - Internal Server Error

---

## Data Models

### Promotion Model
```typescript
interface IPromotion {
  _id?: string;
  title: string;
  description?: string;
  imageUrl: string;
  restaurantId: string;
  enabledVenues: string[]; // Array of venue IDs
  isActive: boolean;
  displayOnSplash: boolean;
  startDate: Date | string;
  endDate: Date | string;
  combos: ICombo[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
```

### Combo Model
```typescript
interface ICombo {
  name: string;
  description?: string;
  menuItems: string[]; // Array of MenuItem IDs
  discountRate: number; // Percentage discount (0-100)
}
```

### Menu Item Model
```typescript
interface IMenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  isActive: boolean;
}
```

### Venue Model
```typescript
interface IVenue {
  _id: string;
  name: string;
  description?: string;
  capacity?: number;
}
```

### Restaurant Model
```typescript
interface IRestaurant {
  _id: string;
  name: string;
  description?: string;
  businessId?: string;
  venues?: IVenue[];
}
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (in development mode)"
}
```

### Common Error Status Codes:
- `400` - Bad Request: Invalid input data or missing required fields
- `401` - Unauthorized: Authentication required or invalid token
- `403` - Forbidden: User doesn't have permission to access the resource
- `404` - Not Found: Requested resource doesn't exist
- `500` - Internal Server Error: Server-side error occurred

---

## Testing Status

✅ **Tested Endpoints:**
- `GET /api/admin-promotions` - Returns proper 401 authentication error
- `GET /api/restaurants` - Returns proper 401 authentication error
- `GET /health` - Returns 200 with service status

⚠️ **Authentication Required:** All promotion endpoints require valid JWT authentication tokens to test fully.

---

## Frontend Integration

The admin frontend at `http://localhost:5173/promotions` is configured to use these endpoints through the `PromotionService` class.

**Key Frontend Service Methods:**
- `getPromotions(restaurantId, venueId?)` - Fetches promotions for a restaurant
- `getPromotion(promotionId)` - Fetches specific promotion details
- `createPromotion(promotionData)` - Creates new promotion
- `updatePromotion(promotionId, promotionData)` - Updates existing promotion
- `deletePromotion(promotionId)` - Deletes promotion
- `getMenuItems(restaurantId)` - Fetches menu items for combo creation
- `getVenues(restaurantId)` - Fetches venues for promotion enablement
- `getRestaurantsByBusiness(businessId)` - Fetches restaurants for a business 