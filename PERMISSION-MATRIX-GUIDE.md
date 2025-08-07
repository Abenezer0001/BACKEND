# INSEAT Permission Matrix System Guide

## Overview

The INSEAT Permission Matrix System provides a dynamic and flexible way to manage permissions across your application. It allows you to create, manage, and assign permissions for different resources and actions.

## Key Concepts

### 1. Resources
Resources are the entities in your system that need access control. Examples:
- `users` - User management
- `restaurants` - Restaurant data
- `orders` - Order management
- `menu-items` - Menu item management

### 2. Actions
Actions are the operations that can be performed on resources:
- `create` - Create new entities
- `read` - View/read entities
- `update` - Modify existing entities
- `delete` - Remove entities

### 3. Permissions
Permissions are the combination of a resource and an action:
- `create_users` - Permission to create users
- `read_restaurants` - Permission to view restaurants
- `update_orders` - Permission to modify orders

### 4. Roles
Roles are collections of permissions that can be assigned to users:
- `restaurant_admin` - Can manage restaurant operations
- `staff` - Limited permissions for day-to-day operations
- `system_admin` - Full system access

## API Endpoints

### Base URL: `/api/permission-matrix`

#### 1. Get Permission Matrix
```http
GET /api/permission-matrix/permission-matrix
```

**Description**: Returns the current state of all permissions, showing which resource-action combinations exist.

**Response**:
```json
{
  "success": true,
  "data": {
    "availableResources": ["users", "restaurants", "orders"],
    "availableActions": ["create", "read", "update", "delete"],
    "permissionMatrix": {
      "users": {
        "create": true,
        "read": true,
        "update": false,
        "delete": false
      }
    },
    "statistics": {
      "totalPossiblePermissions": 12,
      "totalExistingPermissions": 8,
      "coveragePercentage": 67
    }
  }
}
```

#### 2. Create Selected Permissions
```http
POST /api/permission-matrix/permissions/create-selected
```

**Description**: Creates permissions for selected resources and actions.

**Request Body**:
```json
{
  "resources": ["orders", "menu-items"],
  "actions": ["create", "read", "update"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Created 6 permissions",
  "permissions": [
    {
      "_id": "...",
      "name": "create_orders",
      "description": "Permission to create orders",
      "resource": "orders",
      "action": "create"
    }
  ]
}
```

#### 3. Get All Permissions
```http
GET /api/permission-matrix/permissions
```

**Description**: Returns all existing permissions with details.

#### 4. Get All Roles
```http
GET /api/permission-matrix/roles
```

**Description**: Returns all roles with their associated permissions.

#### 5. Create Role with Permissions
```http
POST /api/permission-matrix/roles/create
```

**Description**: Creates a new role and assigns selected permissions to it.

**Request Body**:
```json
{
  "name": "order_manager",
  "description": "Manages orders and related operations",
  "permissionIds": ["permission_id_1", "permission_id_2"],
  "scope": "business",
  "businessId": "business_id_here"
}
```

#### 6. Delete Permissions (System Admin Only)
```http
DELETE /api/permission-matrix/permissions
```

**Description**: Deletes selected permissions and removes them from all roles.

**Request Body**:
```json
{
  "permissionIds": ["permission_id_1", "permission_id_2"]
}
```

## How to Add a New Resource

### Step 1: Update Available Resources List

Edit `INSEAT-Backend/services/auth-service/src/controllers/PermissionMatrixController.ts`:

```typescript
// In the getPermissionMatrix method, add your new resource
const availableResources = [
  'users',
  'roles', 
  'permissions',
  'businesses',
  'restaurants',
  'venues',
  'tables',
  'menu-items',
  'categories',
  'orders',
  'invoices',
  'customers',
  'inventory',
  'analytics',
  'settings',
  'your-new-resource'  // Add your new resource here
];
```

### Step 2: Create Permissions for the New Resource

Use the Permission Matrix UI or API to create permissions:

1. **Via API**:
```bash
curl -X POST http://localhost:3001/api/permission-matrix/permissions/create-selected \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=your_token_here" \
  -d '{
    "resources": ["your-new-resource"],
    "actions": ["create", "read", "update", "delete"]
  }'
```

2. **Via Frontend**: Navigate to the Permission Matrix page and select your resource with desired actions.

### Step 3: Update Business RBAC Middleware (if needed)

If your resource needs business-scoped access control, update `INSEAT-Backend/services/auth-service/src/middleware/businessRbacMiddleware.ts`:

```typescript
// In the checkBusinessResourceAccess function
async function checkBusinessResourceAccess(
  userBusinessId: string, 
  resourceId: string, 
  resourceType: string, 
  httpMethod: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      // ... existing cases ...
      
      case 'your-new-resource':
        // Add your business access logic here
        const YourModel = require('../../../your-service/src/models/YourModel').default;
        const item = await YourModel.findById(resourceId);
        
        if (item?.businessId) {
          return item.businessId.toString() === userBusinessId;
        }
        return false;

      // ... rest of cases ...
    }
  } catch (error) {
    console.error('Error checking business resource access:', error);
    return false;
  }
}
```

### Step 4: Apply Permissions in Your Routes

In your route files, use the permission middleware:

```typescript
import { requireBusinessPermission } from '../middleware/businessRbacMiddleware';

// Apply permission check to your routes
router.get(
  '/your-new-resource',
  authenticateWithCookie,
  requireBusinessPermission('your-new-resource', 'read'),
  yourController.getYourResource
);

router.post(
  '/your-new-resource',
  authenticateWithCookie,
  requireBusinessPermission('your-new-resource', 'create'),
  yourController.createYourResource
);
```

### Step 5: Create or Update Roles

Use the Permission Matrix to create roles that include permissions for your new resource:

```bash
curl -X POST http://localhost:3001/api/permission-matrix/roles/create \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=your_token_here" \
  -d '{
    "name": "your_resource_manager",
    "description": "Manages your new resource",
    "permissionIds": ["create_your-new-resource", "read_your-new-resource"],
    "scope": "business"
  }'
```

## Frontend Integration

### Accessing the Permission Matrix

The Permission Matrix is accessible to system admins and restaurant admins at:
- **URL**: `/access-control` (Access Control Management page)
- **Tab**: "Permission Matrix"

### Using the Interface

1. **View Current Permissions**: The matrix shows all resources and actions with checkboxes indicating which permissions exist.

2. **Create New Permissions**: 
   - Check the boxes for resource-action combinations you want to create
   - Click "CREATE SELECTED PERMISSIONS"

3. **Create Roles**:
   - Use the roles section to create new roles
   - Select which permissions to include in the role

4. **Assign Roles**: Use the "User Assignments" tab to assign roles to users.

## Permission Hierarchy

### System Admin (`system_admin`)
- Can create, read, update, and delete all permissions
- Can create system-wide roles
- Can access all business data
- Can manage all users

### Restaurant Admin (`restaurant_admin`)
- Can view all permissions
- Can create business-scoped roles for their business
- Can manage users within their business
- Cannot create or delete permissions

### Other Roles
- Limited to permissions explicitly assigned to their role
- Business-scoped access only
- Cannot manage permissions or roles

## Best Practices

1. **Start Small**: Begin with basic CRUD permissions for each resource
2. **Use Descriptive Names**: Make permission and role names clear and descriptive
3. **Regular Review**: Periodically review and clean up unused permissions
4. **Test Thoroughly**: Always test new permissions with different user roles
5. **Document Changes**: Keep track of permission changes in your deployment notes

## Troubleshooting

### Common Issues

1. **Permission Not Working**: Ensure the permission exists and is assigned to the user's role
2. **Business Access Denied**: Check that the resource belongs to the user's business
3. **Role Creation Failed**: Verify the user has the appropriate role creation permissions

### Debug Steps

1. Check user's current permissions:
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Cookie: access_token=your_token_here"
```

2. View all permissions:
```bash
curl -X GET http://localhost:3001/api/permission-matrix/permissions \
  -H "Cookie: access_token=your_token_here"
```

3. Check role assignments:
```bash
curl -X GET http://localhost:3001/api/permission-matrix/roles \
  -H "Cookie: access_token=your_token_here"
```

## Security Considerations

1. **Principle of Least Privilege**: Only grant the minimum permissions necessary
2. **Regular Audits**: Regularly review user permissions and role assignments
3. **Sensitive Operations**: Consider requiring additional authentication for sensitive operations
4. **Logging**: All permission changes are logged for audit purposes

This system provides a robust foundation for managing access control in your INSEAT application while remaining flexible enough to adapt as your system grows. 