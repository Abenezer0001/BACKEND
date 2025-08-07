# Authentication and RBAC API Documentation

## Base URL
`/api/auth`

## Authentication Endpoints

### Register a New User
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer" // Optional, defaults to "customer"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "12345abcdef",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input or user already exists
- `500 Internal Server Error`: Server error

### Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "12345abcdef",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

### Refresh Token
**Endpoint:** `POST /api/auth/refresh-token`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Refresh token is required
- `401 Unauthorized`: Invalid refresh token
- `500 Internal Server Error`: Server error

### Logout
**Endpoint:** `POST /api/auth/logout`

**Request Headers:**
- `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

### Get User Profile
**Endpoint:** `GET /api/auth/me`

**Request Headers:**
- `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "user": {
    "id": "12345abcdef",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

## RBAC Endpoints (Admin Only)

### Get All Roles
**Endpoint:** `GET /api/admin/roles`

**Request Headers:**
- `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "roles": [
    {
      "id": "role1",
      "name": "admin",
      "description": "System administrator",
      "permissions": [
        {
          "id": "perm1",
          "resource": "users",
          "action": "create",
          "description": "Create users"
        },
        // More permissions...
      ]
    },
    // More roles...
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### Create Role
**Endpoint:** `POST /api/admin/roles`

**Request Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "name": "restaurant_manager",
  "description": "Restaurant manager role",
  "permissions": ["perm1", "perm2"] // Array of permission IDs
}
```

**Response (201 Created):**
```json
{
  "role": {
    "id": "role123",
    "name": "restaurant_manager",
    "description": "Restaurant manager role",
    "permissions": ["perm1", "perm2"]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### Update Role
**Endpoint:** `PUT /api/admin/roles/:id`

**Request Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "name": "updated_role_name",
  "description": "Updated description",
  "permissions": ["perm1", "perm3"] // Array of permission IDs
}
```

**Response (200 OK):**
```json
{
  "role": {
    "id": "role123",
    "name": "updated_role_name",
    "description": "Updated description",
    "permissions": ["perm1", "perm3"]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Role not found
- `500 Internal Server Error`: Server error

### Delete Role
**Endpoint:** `DELETE /api/admin/roles/:id`

**Request Headers:**
- `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "message": "Role deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Role not found
- `500 Internal Server Error`: Server error

### Get All Permissions
**Endpoint:** `GET /api/admin/permissions`

**Request Headers:**
- `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "permissions": [
    {
      "id": "perm1",
      "resource": "users",
      "action": "create",
      "description": "Create users"
    },
    // More permissions...
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### Create Permission
**Endpoint:** `POST /api/admin/permissions`

**Request Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "resource": "menu_items",
  "action": "create",
  "description": "Create menu items"
}
```

**Response (201 Created):**
```json
{
  "permission": {
    "id": "perm123",
    "resource": "menu_items",
    "action": "create",
    "description": "Create menu items"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### Update Permission
**Endpoint:** `PUT /api/admin/permissions/:id`

**Request Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "resource": "menu_items",
  "action": "update",
  "description": "Update menu items"
}
```

**Response (200 OK):**
```json
{
  "permission": {
    "id": "perm123",
    "resource": "menu_items",
    "action": "update",
    "description": "Update menu items"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Permission not found
- `500 Internal Server Error`: Server error

### Delete Permission
**Endpoint:** `DELETE /api/admin/permissions/:id`

**Request Headers:**
- `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "message": "Permission deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Permission not found
- `500 Internal Server Error`: Server error

### Assign Role to User
**Endpoint:** `PUT /api/admin/users/:userId/roles/:roleId`

**Request Headers:**
- `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "message": "Role assigned successfully",
  "user": {
    "id": "user123",
    "roles": ["role1", "role2"]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User or role not found
- `500 Internal Server Error`: Server error

### Remove Role from User
**Endpoint:** `DELETE /api/admin/users/:userId/roles/:roleId`

**Request Headers:**
- `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "message": "Role removed successfully",
  "user": {
    "id": "user123",
    "roles": ["role1"]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User or role not found
- `500 Internal Server Error`: Server error

## Authentication Helper Functions (Frontend)

### Token Storage
```javascript
// Store tokens in localStorage
const storeTokens = (token, refreshToken) => {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
};

// Get the access token
const getToken = () => localStorage.getItem('token');

// Get the refresh token
const getRefreshToken = () => localStorage.getItem('refreshToken');

// Remove tokens (logout)
const removeTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};
```

### API Request Configuration
```javascript
// Add the auth token to API requests
const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Example axios instance configuration
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    config.headers = {
      ...config.headers,
      ...authHeader(),
    };
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 error and not a retry
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = getRefreshToken();
        const res = await axios.post('/auth/refresh-token', { refreshToken });
        
        // Store the new token
        const { token } = res.data;
        storeTokens(token, refreshToken);
        
        // Update the header and retry
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axios(originalRequest);
      } catch (error) {
        // If refresh fails, logout
        removeTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

## Testing with cURL

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"John","lastName":"Doe"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Get User Profile
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN_HERE"}'
```

### Get All Roles (Admin)
```bash
curl -X GET http://localhost:3000/api/admin/roles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

### Create Role (Admin)
```bash
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -d '{"name":"editor","description":"Content editor","permissions":["perm1","perm2"]}'
```

### Assign Role to User (Admin)
```bash
curl -X PUT http://localhost:3000/api/admin/users/USER_ID/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```
