# INSEAT Authentication and User Management Guide

This guide covers the complete authentication and user management flow for the INSEAT backend system, including system admin setup, user authentication, and admin user management.

## Table of Contents

1. [System Admin Creation and Setup](#1-system-admin-creation-and-setup)
2. [System Admin Login Process](#2-system-admin-login-process)
3. [Admin User Creation and Management](#3-admin-user-creation-and-management)
4. [JWT Token Management](#4-jwt-token-management)
5. [Troubleshooting](#5-troubleshooting)

## 1. System Admin Creation and Setup

### 1.1 First System Admin Setup

The first system admin can be created using the `/api/system-admin/setup` endpoint. This is a one-time operation:

```bash
# Initial system admin setup
curl -X POST http://localhost:3001/api/system-admin/setup \
-H "Content-Type: application/json" \
-d '{
  "email": "sysadmin@inseat.com",
  "firstName": "System",
  "lastName": "Administrator"
}'
```

Response:
```json
{
  "message": "System administrator account created. Check your email to set up your password."
}
```

> Note: If a system admin already exists, the API will return `{"message":"System administrator already exists"}`.

### 1.2 Setting Up System Admin Password

After creating the system admin account, set up the password using the password setup endpoint:

```bash
# Set system admin password
curl -X POST http://localhost:3001/api/system-admin/setup-password \
-H "Content-Type: application/json" \
-d '{
  "email": "sysadmin@inseat.com",
  "password": "StrongPassword123!",
  "confirmPassword": "StrongPassword123!"
}'
```

Response:
```json
{
  "message": "Password set successfully"
}
```

## 2. System Admin Login Process

### 2.1 Authentication Flow

Authentication uses JWT tokens stored in HTTP-only cookies. The system uses both access tokens (24-hour validity) and refresh tokens (7-day validity).

### 2.2 System Admin Login

Use the following endpoint to log in as a system admin:

```bash
# Login as system admin
curl -X POST http://localhost:3001/api/auth/login \
-H "Content-Type: application/json" \
-c cookies.txt \
-d '{
  "email": "sysadmin@inseat.com",
  "password": "StrongPassword123!"
}'
```

Successful response:
```json
{
  "success": true,
  "user": {
    "id": "681e2410b6a6542d8f174ca4",
    "email": "sysadmin@inseat.com",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "system_admin"
  }
}
```

The response includes access and refresh tokens set as HTTP-only cookies.

### 2.3 Inspecting the JWT Token

You can decode and inspect the JWT token content with:

```bash
# Extract and decode JWT token payload
ACCESS_TOKEN=$(grep access_token cookies.txt | cut -f7)
echo $ACCESS_TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

Sample output:
```json
{
  "id": "681e2410b6a6542d8f174ca4",
  "email": "sysadmin@inseat.com",
  "role": "system_admin",
  "iat": 1746810256,
  "exp": 1746896656
}
```

### 2.4 Token Refresh

When the access token expires, use the refresh token to obtain a new one:

```bash
# Refresh JWT token
curl -X POST http://localhost:3001/api/auth/refresh-token \
-H "Content-Type: application/json" \
-H "Origin: http://localhost:3001" \
-b cookies.txt \
-c cookies.txt
```

Response:
```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

### 2.5 Logout

To invalidate the tokens, use the logout endpoint:

```bash
# Logout (invalidates tokens)
curl -X POST http://localhost:3001/api/auth/logout \
-H "Content-Type: application/json" \
-b cookies.txt
```

Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 3. Admin User Creation and Management

### 3.1 Creating a New Admin User

Once authenticated as a system admin, you can create regular admin users:

```bash
# Create admin user (requires system_admin role)
curl -X POST http://localhost:3001/api/system-admin/admins \
-H "Content-Type: application/json" \
-H "Origin: http://localhost:3001" \
-b cookies.txt \
-d '{
  "email": "admin@inseat.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin"
}'
```

Successful response:
```json
{
  "message": "Admin account created successfully",
  "user": {
    "id": "681e3590ab432599ab6c7dae",
    "email": "admin@inseat.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

### 3.2 Listing Admins

To list all admin users:

```bash
# List all admins (requires system_admin role)
curl http://localhost:3001/api/system-admin/admins \
-H "Content-Type: application/json" \
-H "Origin: http://localhost:3001" \
-b cookies.txt
```

Response:
```json
{
  "admins": [
    {
      "id": "681e3590ab432599ab6c7dae",
      "email": "admin@inseat.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "lastLogin": "2025-05-09T16:30:00.000Z"
    }
  ]
}
```

### 3.3 Role and Permission Management

#### Assigning Roles to Users

```bash
# Assign role to user
curl -X PUT http://localhost:3001/api/system-admin/users/USER_ID/roles/ROLE_ID \
-H "Content-Type: application/json" \
-H "Origin: http://localhost:3001" \
-b cookies.txt
```

#### Removing Roles from Users

```bash
# Remove role from user
curl -X DELETE http://localhost:3001/api/system-admin/users/USER_ID/roles/ROLE_ID \
-H "Content-Type: application/json" \
-H "Origin: http://localhost:3001" \
-b cookies.txt
```

## 4. JWT Token Management

### 4.1 JWT Token Structure

The system uses two types of tokens:

1. **Access Token**: Short-lived (24 hours) for API authorization
2. **Refresh Token**: Long-lived (7 days) for obtaining new access tokens

Access token payload example:
```json
{
  "id": "681e2410b6a6542d8f174ca4",
  "email": "sysadmin@inseat.com",
  "role": "system_admin",
  "iat": 1746810256,  // Issued at timestamp
  "exp": 1746896656   // Expiration timestamp
}
```

### 4.2 Authentication Middleware Flow

1. Client sends request with HTTP-only cookies containing JWT tokens
2. Server extracts access token from cookies
3. Token is verified using JWT_SECRET and checked for expiration
4. If valid, user information is attached to the request
5. Role-based middleware checks user's role for protected endpoints
6. If token is expired, client must refresh token

### 4.3 Role-Based Authorization

The system has several user roles with different access levels:

- `system_admin`: Full system access (system setup, admin management)
- `admin`: Administrative access (restaurant and user management)
- `restaurant_admin`: Specific restaurant management
- `customer`: Basic user access

Role verification is performed via middleware:
- `requireSystemAdminRole`: Requires system_admin role
- `requireAdminRole`: Requires admin role
- `requireRestaurantAdminRole`: Requires restaurant_admin role
- `requireCustomerRole`: Requires customer role

## 5. Troubleshooting

### 5.1 Common Issues and Solutions

#### Token Expiration

**Issue:** Authentication fails with "Token expired" error
**Solution:** Refresh the token using `/api/auth/refresh-token` endpoint

```bash
curl -X POST http://localhost:3001/api/auth/refresh-token \
-H "Content-Type: application/json" \
-b cookies.txt \
-c cookies.txt
```

#### Permission Denied

**Issue:** "System admin role required" error
**Solution:** Ensure you're authenticated with an account that has system_admin role

#### JWT Verification Failure

**Issue:** JWT verification fails despite valid token
**Solution:** Ensure the server is using the correct JWT_SECRET consistently across all services

### 5.2 Debugging Authentication Issues

For debugging JWT token issues, use the debug token endpoint:

```bash
# Check token validity
curl -X POST http://localhost:3001/api/auth/debug-token \
-H "Content-Type: application/json" \
-b cookies.txt
```

### 5.3 Sample Authentication Flow

Complete flow from login to admin creation:

```bash
# Step 1: Login as system admin
curl -X POST http://localhost:3001/api/auth/login \
-H "Content-Type: application/json" \
-c cookies.txt \
-d '{
  "email": "sysadmin@inseat.com",
  "password": "StrongPassword123!"
}'

# Step 2: Verify token content
ACCESS_TOKEN=$(grep access_token cookies.txt | cut -f7)
echo $ACCESS_TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# Step 3: Create a new admin user
curl -X POST http://localhost:3001/api/system-admin/admins \
-H "Content-Type: application/json" \
-H "Origin: http://localhost:3001" \
-b cookies.txt \
-d '{
  "email": "new-admin@inseat.com",
  "firstName": "New",
  "lastName": "Admin",
  "role": "admin"
}'
```

---

This document covers the basic authentication flow and user management operations for the INSEAT backend. For more details on specific endpoints or additional operations, refer to the API documentation.

