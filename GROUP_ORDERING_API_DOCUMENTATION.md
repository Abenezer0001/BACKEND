# Group Ordering API Documentation

## Overview

The Group Ordering API allows multiple customers to collaborate on a single order. This is particularly useful for table orders where multiple people want to add items to a shared cart while managing individual spending limits and payment responsibilities.

## Base URL

```
/api/group-orders
```

## Authentication

All endpoints support optional authentication via JWT tokens. If authenticated, the user's information will be automatically associated with group order actions.

## Data Models

### GroupOrder

```typescript
interface IGroupOrder {
  _id: ObjectId;
  sessionId: string;                    // Unique session identifier
  inviteCode: string;                   // 6-character join code
  restaurantId: ObjectId;               // Associated restaurant
  tableId?: ObjectId;                   // Optional table association
  createdBy: ObjectId;                  // User who created the order
  status: 'active' | 'submitted' | 'completed' | 'cancelled' | 'expired';
  expiresAt: Date;                      // When the session expires
  maxParticipants: number;              // Maximum allowed participants (default: 8)
  participants: IGroupOrderParticipant[];
  items: IGroupOrderItem[];
  totals: OrderTotals;
  paymentStructure: 'pay_all' | 'equal_split' | 'pay_own' | 'custom_split';
  paymentSplit: PaymentSplitConfig;
  spendingLimits: ISpendingLimit[];
  spendingLimitRequired: boolean;
  deliveryInfo?: DeliveryInfo;
  settings: GroupOrderSettings;
  createdAt: Date;
  updatedAt: Date;
}
```

### Participant

```typescript
interface IGroupOrderParticipant {
  participantId: ObjectId;              // Unique participant ID
  userId?: ObjectId;                    // Associated user account (optional)
  email?: string;                       // Email address
  name: string;                         // Display name
  isAnonymous: boolean;                 // Whether participant is anonymous
  joinedAt: Date;                       // When they joined
  status: 'active' | 'left';           // Current status
  lastActivity: Date;                   // Last interaction timestamp
  spendingLimit?: number;               // Individual spending limit
  currentSpent: number;                 // Amount spent so far
}
```

## API Endpoints

### 1. Create Group Order

**POST** `/api/group-orders/create`

Creates a new group ordering session.

#### Request Body

```json
{
  "restaurantId": "required|string|ObjectId",
  "tableId": "optional|string|ObjectId",
  "paymentStructure": "optional|string|enum(pay_all,equal_split,pay_own,custom_split)",
  "maxParticipants": "optional|number|default(8)|min(2)|max(20)",
  "spendingLimitRequired": "optional|boolean|default(false)",
  "sessionDuration": "optional|number|default(3600)", // seconds
  "settings": {
    "allowItemModification": "optional|boolean|default(true)",
    "requireApprovalForItems": "optional|boolean|default(false)",
    "allowAnonymousParticipants": "optional|boolean|default(true)"
  },
  "deliveryInfo": {
    "address": "optional|string",
    "instructions": "optional|string",
    "scheduledFor": "optional|date"
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Group order session created successfully",
  "data": {
    "groupOrderId": "ObjectId",
    "sessionId": "string",
    "inviteCode": "string", // 6-character code
    "expiresAt": "date",
    "maxParticipants": 8,
    "paymentStructure": "equal_split",
    "settings": {
      "allowItemModification": true,
      "requireApprovalForItems": false,
      "allowAnonymousParticipants": true
    }
  }
}
```

### 2. Join Group Order

**POST** `/api/group-orders/join`

Join an existing group order using an invite code.

#### Request Body

```json
{
  "inviteCode": "required|string|length(6)",
  "userName": "required|string",
  "userEmail": "optional|string|email",
  "userId": "optional|string|ObjectId" // Auto-filled if authenticated
}
```

#### Response

```json
{
  "success": true,
  "message": "Successfully joined group order",
  "data": {
    "groupOrderId": "ObjectId",
    "participantId": "ObjectId",
    "participant": {
      "participantId": "ObjectId",
      "name": "string",
      "email": "string",
      "isAnonymous": false,
      "joinedAt": "date",
      "spendingLimit": null,
      "currentSpent": 0
    },
    "groupOrder": {
      "_id": "ObjectId",
      "inviteCode": "string",
      "restaurantId": "ObjectId",
      "tableId": "ObjectId",
      "status": "active",
      "expiresAt": "date",
      "maxParticipants": 8,
      "participants": [...],
      "paymentStructure": "equal_split",
      "spendingLimitRequired": false,
      "settings": {...}
    }
  }
}
```

### 3. Get Group Order Details

**GET** `/api/group-orders/:groupOrderId`

Retrieve complete details of a group order.

#### Parameters
- `groupOrderId` - ObjectId of the group order

#### Response

```json
{
  "success": true,
  "data": {
    "groupOrder": {
      "_id": "ObjectId",
      "sessionId": "string",
      "inviteCode": "string",
      "restaurantId": "ObjectId",
      "tableId": "ObjectId",
      "status": "active",
      "expiresAt": "date",
      "maxParticipants": 8,
      "participants": [...],
      "items": [...],
      "totals": {
        "subtotal": 0,
        "tax": 0,
        "deliveryFee": 0,
        "serviceFee": 0,
        "tip": 0,
        "total": 0
      },
      "paymentStructure": "equal_split",
      "paymentSplit": {...},
      "spendingLimits": [...],
      "spendingLimitRequired": false,
      "deliveryInfo": {...},
      "settings": {...},
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
}
```

### 4. Leave Group Order

**POST** `/api/group-orders/:groupOrderId/leave`

Remove a participant from the group order.

#### Parameters
- `groupOrderId` - ObjectId of the group order

#### Request Body

```json
{
  "participantId": "required|string|ObjectId"
}
```

#### Response

```json
{
  "success": true,
  "message": "Successfully left group order",
  "data": {
    "groupOrderId": "ObjectId",
    "participants": [...] // Updated list of active participants
  }
}
```

### 5. Update Spending Limits

**PUT** `/api/group-orders/:groupOrderId/spending-limits`

Update spending limits for the group order.

#### Parameters
- `groupOrderId` - ObjectId of the group order

#### Request Body

```json
{
  "spendingLimitRequired": "optional|boolean",
  "participantLimits": [
    {
      "participantId": "required|string|ObjectId",
      "limit": "required|number|min(0)"
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "message": "Spending limits updated successfully",
  "data": {
    "spendingLimitRequired": true,
    "spendingLimits": [...],
    "participants": [...]
  }
}
```

### 6. Update Individual Spending Limit

**PUT** `/api/group-orders/:groupOrderId/spending-limits/:participantId`

Update spending limit for a specific participant.

#### Parameters
- `groupOrderId` - ObjectId of the group order
- `participantId` - ObjectId of the participant

#### Request Body

```json
{
  "limit": "required|number|min(0)"
}
```

#### Response

```json
{
  "success": true,
  "message": "Participant spending limit updated successfully",
  "data": {
    "participantId": "ObjectId",
    "spendingLimit": 50.00,
    "participant": {...}
  }
}
```

### 7. Update Payment Structure

**PUT** `/api/group-orders/:groupOrderId/payment-structure`

Update the payment structure for the group order.

#### Parameters
- `groupOrderId` - ObjectId of the group order

#### Request Body

```json
{
  "paymentStructure": "required|string|enum(pay_all,equal_split,pay_own,custom_split)"
}
```

#### Response

```json
{
  "success": true,
  "message": "Payment structure updated successfully",
  "data": {
    "paymentStructure": "pay_own",
    "paymentSplit": {
      "method": "individual",
      "assignments": [],
      "completedPayments": 0,
      "totalPayments": 0
    }
  }
}
```

### 8. Validate Join Code

**GET** `/api/group-orders/validate-join-code?code={joinCode}`

Validate a join code without actually joining the group order.

#### Query Parameters
- `code` - The 6-character join code to validate

#### Response (Valid Code)

```json
{
  "success": true,
  "valid": true,
  "data": {
    "groupOrderId": "ObjectId",
    "restaurantId": "ObjectId",
    "tableId": "ObjectId",
    "expiresAt": "date",
    "participantCount": 2,
    "maxParticipants": 8,
    "isFull": false,
    "paymentStructure": "equal_split",
    "spendingLimitRequired": false,
    "settings": {...}
  }
}
```

#### Response (Invalid Code)

```json
{
  "success": false,
  "message": "Invalid or expired join code",
  "valid": false
}
```

## Payment Structures

### 1. pay_all
One person pays for the entire order.

### 2. equal_split
The total is split equally among all participants.

### 3. pay_own
Each participant pays only for their own items.

### 4. custom_split
Custom percentage-based splitting defined by participants.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (development only)"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `404` - Resource not found
- `500` - Internal server error

## Business Rules

### Session Management
- Group orders expire after the specified duration (default: 1 hour)
- Expired sessions automatically change status to 'expired'
- Maximum participants per group order: 20 (configurable per order)

### Join Code Generation
- 6-character alphanumeric codes (uppercase)
- Unique across all active group orders
- Case-insensitive when joining

### Spending Limits
- Can be enabled/disabled at the group level
- Individual limits can be set per participant
- Spending is tracked against limits in real-time

### Participant Management
- Anonymous participants are supported
- Participants can leave at any time
- Leaving removes their items from the order
- Creator cannot leave (becomes anonymous if needed)

## Integration Notes

### Frontend Integration
The API is designed to work with the existing INSEAT menu frontend. The frontend should:

1. Call `/create` to start a group order
2. Display the invite code to share with others
3. Use `/validate-join-code` to check codes before joining
4. Call `/join` to add participants
5. Poll `/api/group-orders/:id` for real-time updates
6. Use spending limit and payment structure endpoints as needed

### Authentication
- All endpoints work with or without authentication
- Authenticated users get better UX (auto-filled user info)
- Anonymous users can participate fully

### Real-time Updates
While not implemented in this version, the API is designed to support WebSocket integration for real-time updates of:
- New participants joining/leaving
- Items being added/removed
- Spending limit changes
- Payment structure updates

## Testing

Use the provided test script to verify all endpoints:

```bash
node test-group-ordering-endpoints.js
```

This will test all endpoints with sample data and provide a comprehensive report of API functionality.