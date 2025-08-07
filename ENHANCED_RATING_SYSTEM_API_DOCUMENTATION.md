# Enhanced INSEAT Rating System API Documentation

## Overview

The Enhanced INSEAT Rating System provides comprehensive menu item and restaurant rating functionality with advanced features including:

- **Decimal Rating Support**: Ratings from 1.0 to 5.0 with up to 1 decimal place (e.g., 4.7)
- **Order Verification**: Users can only rate items they have actually ordered
- **Real-time Updates**: Socket.IO integration for live rating updates
- **Advanced Analytics**: Comprehensive admin dashboard with customer insights
- **Rating Aggregation**: Wilson Score, Bayesian Average, and trend analysis

## Base URL
```
http://localhost:3001/api/v1/ratings
```

## Authentication

Most endpoints require authentication using Bearer tokens:
```bash
Authorization: Bearer <your_jwt_token>
```

## Core Rating Endpoints

### 1. Submit Order-Based Rating ⭐ **ENHANCED**

**Endpoint**: `POST /api/v1/ratings/order-item`

**Description**: Submit a rating for a menu item from a specific order. This endpoint ensures users can only rate items they have actually ordered and paid for.

**Authentication**: Required

**Request Body**:
```json
{
  "orderId": "string (ObjectId)",
  "menuItemId": "string (ObjectId)", 
  "rating": "number (1.0-5.0, max 1 decimal)",
  "comment": "string (max 1000 chars)"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3001/api/v1/ratings/order-item \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "507f1f77bcf86cd799439013",
    "menuItemId": "507f1f77bcf86cd799439011", 
    "rating": 4.7,
    "comment": "Excellent dish! Perfect seasoning and presentation."
  }'
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Order item review submitted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "menuItemId": "507f1f77bcf86cd799439011",
    "restaurantId": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439014",
    "orderId": "507f1f77bcf86cd799439013",
    "rating": 4.7,
    "comment": "Excellent dish! Perfect seasoning and presentation.",
    "verifiedPurchase": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses**:
- `400`: Invalid input data, rating out of range, or invalid decimal precision
- `401`: Authentication required
- `404`: Order not found, not paid, or doesn't contain menu item
- `409`: User has already rated this menu item

### 2. Get Menu Item Ratings ⭐ **ENHANCED**

**Endpoint**: `GET /api/v1/ratings/menu-item/:id`

**Alternative**: `GET /api/v1/ratings/menu-items/:id/ratings`

**Description**: Retrieve comprehensive rating data and reviews for a menu item with enhanced decimal rating support.

**Authentication**: Not required

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sortBy`: Sort criteria
  - `recent`: Most recent first (default)
  - `helpful`: Most helpful first
  - `rating_high`: Highest ratings first
  - `rating_low`: Lowest ratings first
  - `verified`: Verified purchases first

**Example Request**:
```bash
curl "http://localhost:3001/api/v1/ratings/menu-item/507f1f77bcf86cd799439011?page=1&limit=5&sortBy=rating_high"
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "aggregated": {
      "average": 4.2,
      "count": 127,
      "wilsonScore": 0.85,
      "bayesianAverage": 4.1,
      "recentTrend": 0.3,
      "distribution": {
        "1": 2,
        "2": 8,
        "3": 15,
        "4": 42,
        "5": 60
      }
    },
    "reviews": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "rating": 4.7,
        "comment": "Excellent dish! Perfect seasoning and presentation.",
        "userId": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "verifiedPurchase": true,
        "helpfulVotes": {
          "up": 5,
          "down": 0
        },
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 26,
      "totalReviews": 127,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### 3. Check Rating Eligibility ⭐ **NEW**

**Endpoint**: `GET /api/v1/ratings/menu-item/:menuItemId/can-rate`

**Description**: Check if the authenticated user can rate a specific menu item (order verification).

**Authentication**: Required

**Example Request**:
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/v1/ratings/menu-item/507f1f77bcf86cd799439011/can-rate"
```

**Success Response** (200) - Can Rate:
```json
{
  "success": true,
  "data": {
    "canRate": true,
    "reason": "eligible",
    "message": "You can rate this menu item",
    "orderDetails": {
      "orderId": "507f1f77bcf86cd799439013",
      "orderNumber": "ORD-2024-001",
      "orderDate": "2024-01-14T18:30:00Z"
    }
  }
}
```

**Success Response** (200) - Already Rated:
```json
{
  "success": true,
  "data": {
    "canRate": false,
    "reason": "already_rated",
    "message": "You have already rated this menu item",
    "existingRating": {
      "id": "507f1f77bcf86cd799439020",
      "rating": 4.7,
      "comment": "Excellent dish!",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Success Response** (200) - Not Purchased:
```json
{
  "success": true,
  "data": {
    "canRate": false,
    "reason": "not_purchased",
    "message": "You can only rate menu items you have ordered"
  }
}
```

## Enhanced Decimal Rating Support

### Supported Rating Values

The system now supports decimal ratings with the following constraints:

- **Range**: 1.0 to 5.0
- **Precision**: Maximum 1 decimal place
- **Valid Examples**: 1.0, 2.5, 3.3, 4.7, 5.0
- **Invalid Examples**: 0.5, 6.0, 4.123, 3.33

### Validation Examples

**Valid Decimal Ratings**:
```bash
# Rating 4.7
curl -X POST http://localhost:3001/api/v1/ratings/order-item \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"...","menuItemId":"...","rating":4.7,"comment":"Great!"}'

# Rating 3.0
curl -X POST http://localhost:3001/api/v1/ratings/order-item \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"...","menuItemId":"...","rating":3.0,"comment":"Average"}'
```

**Invalid Decimal Ratings**:
```bash
# Too many decimal places (will return 400)
curl -X POST http://localhost:3001/api/v1/ratings/order-item \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"...","menuItemId":"...","rating":4.123,"comment":"Invalid"}'

# Out of range (will return 400)
curl -X POST http://localhost:3001/api/v1/ratings/order-item \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"...","menuItemId":"...","rating":6.0,"comment":"Too high"}'
```

## Restaurant Rating Endpoints

### 4. Get Restaurant Ratings

**Endpoint**: `GET /api/v1/ratings/restaurant/:id`

**Description**: Get aggregated rating data for a restaurant.

**Example Request**:
```bash
curl "http://localhost:3001/api/v1/ratings/restaurant/507f1f77bcf86cd799439012"
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "aggregated": {
      "average": 4.3,
      "count": 542,
      "wilsonScore": 0.87,
      "bayesianAverage": 4.25,
      "recentTrend": 0.2,
      "distribution": {
        "1": 12,
        "2": 23,
        "3": 67,
        "4": 198,
        "5": 242
      }
    },
    "topRatedItems": [
      {
        "menuItemId": "507f1f77bcf86cd799439011",
        "name": "Truffle Pasta",
        "averageRating": 4.8,
        "reviewCount": 45
      }
    ]
  }
}
```

## Admin Dashboard Endpoints

### 5. Restaurant Analytics

**Endpoint**: `GET /api/v1/ratings/restaurant/:id/analytics`

**Description**: Comprehensive rating analytics for restaurant admin dashboard.

**Authentication**: Required (Admin/Restaurant Owner)

**Example Request**:
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/v1/ratings/restaurant/507f1f77bcf86cd799439012/analytics"
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "totalReviews": 542,
    "averageRating": 4.3,
    "ratingDistribution": {
      "1": 12,
      "2": 23,
      "3": 67,
      "4": 198,
      "5": 242
    },
    "trends": {
      "period": "month",
      "data": [
        {
          "month": "2024-01",
          "averageRating": 4.2,
          "reviewCount": 89
        }
      ]
    },
    "recentReviews": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "rating": 4.7,
        "comment": "Excellent service!",
        "customerName": "Customer",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 6. Menu Items Performance

**Endpoint**: `GET /api/v1/ratings/restaurant/:id/menu-items/performance`

**Description**: Performance metrics for menu items.

**Query Parameters**:
- `sortBy`: rating (default), reviews, helpful
- `limit`: Number of items (default: 20)

**Example Request**:
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/v1/ratings/restaurant/507f1f77bcf86cd799439012/menu-items/performance?sortBy=reviews&limit=10"
```

### 7. Customer Insights

**Endpoint**: `GET /api/v1/ratings/restaurant/:id/customer-insights`

**Description**: Customer rating behavior insights.

**Query Parameters**:
- `period`: 7d, 30d (default), 90d
- `limit`: Number of customers (default: 50)

**Example Request**:
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/v1/ratings/restaurant/507f1f77bcf86cd799439012/customer-insights?period=30d"
```

## User Management Endpoints

### 8. Update Rating

**Endpoint**: `PUT /api/v1/ratings/:id`

**Description**: Update an existing rating (user can only update their own ratings).

**Authentication**: Required

**Request Body**:
```json
{
  "rating": 4.2,
  "comment": "Updated review with new decimal rating"
}
```

### 9. Delete Rating

**Endpoint**: `DELETE /api/v1/ratings/:id`

**Description**: Delete a rating (user can only delete their own ratings).

**Authentication**: Required

### 10. Mark Review as Helpful

**Endpoint**: `POST /api/v1/ratings/:id/helpful`

**Description**: Mark a review as helpful or not helpful.

**Authentication**: Required

**Request Body**:
```json
{
  "helpful": true
}
```

## Error Handling

### Common Error Responses

**400 Bad Request** - Invalid Input:
```json
{
  "success": false,
  "message": "Rating must be between 1.0 and 5.0",
  "error": "Invalid rating value"
}
```

**400 Bad Request** - Invalid Decimal Precision:
```json
{
  "success": false,
  "message": "Rating must have at most 1 decimal place (e.g., 4.7)",
  "error": "Invalid decimal precision"
}
```

**401 Unauthorized**:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**404 Not Found** - Order Verification Failed:
```json
{
  "success": false,
  "message": "Order not found, not paid, or does not contain the specified menu item"
}
```

**409 Conflict** - Already Rated:
```json
{
  "success": false,
  "message": "You have already rated this menu item"
}
```

## Real-time Features

### Socket.IO Integration

The rating system includes real-time updates via Socket.IO:

**Events Emitted**:
- `rating-updated`: When a new rating is submitted
- `menu-rating-changed`: For restaurant dashboards
- `rating-analytics-update`: For admin dashboards

**Socket Rooms**:
- `menu-item-{menuItemId}`: For specific menu item updates
- `restaurant-{restaurantId}`: For restaurant updates
- `admin-{restaurantId}`: For admin dashboard updates

## Testing

Use the comprehensive test script:

```bash
./test-enhanced-rating-endpoints.sh
```

This script tests:
- ✅ Decimal rating validation
- ✅ Order verification
- ✅ Authentication requirements
- ✅ Error handling
- ✅ Admin dashboard endpoints
- ✅ CRUD operations

## Key Features Summary

✅ **Order Verification**: Users can only rate items they've ordered and paid for
✅ **Decimal Ratings**: Support for ratings like 4.7, 3.2, etc.
✅ **Comprehensive Reviews**: Includes comment, helpful votes, verified purchase status
✅ **Advanced Analytics**: Wilson Score, Bayesian Average, trend analysis
✅ **Real-time Updates**: Socket.IO integration for live updates
✅ **Admin Dashboard**: Complete analytics and customer insights
✅ **Robust Validation**: Comprehensive input validation and error handling
✅ **Authentication**: Secure JWT-based authentication
✅ **Pagination**: Efficient data loading with pagination support

## Frontend Integration Examples

### React/Vue Component Example

```javascript
// Submit order-based rating
const submitRating = async (orderId, menuItemId, rating, comment) => {
  try {
    const response = await fetch('/api/v1/ratings/order-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orderId,
        menuItemId,
        rating: parseFloat(rating), // Ensure decimal precision
        comment
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Rating submitted successfully');
      // Update UI
    }
  } catch (error) {
    console.error('Failed to submit rating:', error);
  }
};

// Check if user can rate
const checkRatingEligibility = async (menuItemId) => {
  const response = await fetch(`/api/v1/ratings/menu-item/${menuItemId}/can-rate`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
};
```

This enhanced rating system provides a robust, scalable solution for managing customer reviews with proper order verification and advanced analytics capabilities.