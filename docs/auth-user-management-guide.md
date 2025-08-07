### Password Requirements

**Issue**: Password setup fails with requirements error.
**Solution**: Ensure password meets all requirements:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)

# INSEAT System Authentication and User Management Guide

This guide provides a comprehensive overview of the INSEAT system's authentication flows, user management capabilities, and security features. It covers the complete journey from system initialization through user management and authentication.

## Table of Contents

1. [System Admin Creation and Setup](#1-system-admin-creation-and-setup)
2. [System Admin Login and Authentication](#2-system-admin-login-and-authentication)
3. [Admin User Management](#3-admin-user-management)
4. [JWT Token Handling and Authentication Flow](#4-jwt-token-handling-and-authentication-flow)
5. [Troubleshooting and Advanced Tips](#5-troubleshooting-and-advanced-tips)

## 1. System Admin Creation and Setup

### Initial System Setup

When the INSEAT system is first deployed, it requires initialization with a system administrator (system_admin) who has full access to manage the system. This is a one-time process performed on a fresh installation.

#### 1.1 Create First System Admin

**Endpoint**: `POST /api/system-admin/setup`

**Description**: Creates the first system administrator in a fresh installation. This endpoint is rate-limited to prevent abuse.

**Request Body**:
```json
{
  "email": "abenu77z@gmail.com",
  "firstName": "System",
  "lastName": "Administrator"
}
```

**Response (201 Created)**:
```json
{
  "message": "System administrator account created successfully",
  "user": {
    "id": "681e2410b6a6542d8f174ca4",
    "email": "abenu77z@gmail.com",
    "firstName": "System",
    "lastName": "Administrator"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields or system admin already exists
- `500 Internal Server Error`: Server error during setup

**Example curl command**:
```bash
curl -X POST http://localhost:3001/api/system-admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "abenuteshome@gmail.com",
    "firstName": "abenezer",
    "lastName": "teshome"
  }'
```

**Notes**:
- Rate limited to prevent abuse (100 requests per minute in test environments)
- On successful creation, an email with a password setup link is sent to the admin
- In development environment, the password reset token and magic link are logged to console

#### 1.2 Verify Password Setup Token

**Endpoint**: `GET /api/system-admin/verify-setup-token` or `GET /api/password/verify-setup-token` 

**Description**: Verifies if a password setup token is valid and hasn't expired.

**Query Parameters**:
- `token`: The password setup token received via email

**Response (200 OK)**:
```json
{
  "message": "Token is valid",
  "user": {
    "email": "admin@example.com",
    "firstName": "System",
    "lastName": "Administrator"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid or expired token
- `500 Internal Server Error`: Server error during verification

**Example curl command**:
```bash
curl -X GET "http://localhost:3001/api/password/verify-setup-token?token=7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p"
```

**Notes**:
- This endpoint is rate limited (10 requests per 15 minutes)
- Tokens are hashed in the database for security

#### 1.3 Set Up Admin Password

**Endpoint**: `POST /api/system-admin/setup-password` or `POST /api/password/setup-password`

**Description**: Sets the password for a newly created admin account using a valid token.

**Request Body**:
```json
{
  "token": "7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p",
  "password": "SecureP@ssw0rd"
}
```

**Response (200 OK)**:
```json
{
  "message": "Password set successfully",
  "user": {
    "email": "admin@example.com",
    "firstName": "System",
    "lastName": "Administrator"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid token, expired token, or password doesn't meet requirements
- `500 Internal Server Error`: Server error during password setup

**Example curl command**:
```bash
curl -X POST http://localhost:3001/api/password/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p",
    "password": "SecureP@ssw0rd"
  }'
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

**Notes**:
- This endpoint is rate limited (5 requests per hour)
- After successful password setup, the reset token is invalidated

## 2. System Admin Login and Authentication

Once your system admin account is set up, you can log in to manage the system.

### 2.1 Admin Login

**Endpoint**: `POST /api/auth/login`

**Description**: Authenticates a user (system admin, admin, or regular user) and provides JWT tokens.

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "SecureP@ssw0rd"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "681e2410b6a6542d8f174ca4",
    "email": "admin@example.com",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "system_admin"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error during login

**Example curl command**:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "SecureP@ssw0rd"
  }'
```

**Notes**:
- On successful login, JWT access and refresh tokens are set as HTTP-only cookies
- The response includes user profile information including role
- The last login timestamp is updated

### 2.2 Check Authentication Status

**Endpoint**: `GET /api/auth/check`

**Description**: Checks if the user is currently authenticated.

**Response (200 OK)**:
```json
{
  "isAuthenticated": true
}
```

**Example curl command**:
```bash
curl -X GET http://localhost:3001/api/auth/check \
  -b cookies.txt
```

### 2.3 Get User Profile

**Endpoint**: `GET /api/auth/me`

**Description**: Retrieves the authenticated user's profile information.

**Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "681e2410b6a6542d8f174ca4",
    "email": "admin@example.com",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "system_admin"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**Example curl command**:
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -b cookies.txt
```

**Notes**:
- Requires valid authentication (access_token cookie)
- Password and sensitive fields are excluded from the response

### 2.4 Refresh Authentication Token

**Endpoint**: `POST /api/auth/refresh-token`

**Description**: Refreshes the JWT access token using a valid refresh token.

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing refresh token

**Example curl command**:
```bash
curl -X POST http://localhost:3001/api/auth/refresh-token \
  -b cookies.txt
```

**Notes**:
- Requires a valid refresh_token cookie
- On success, new access_token and refresh_token cookies are set
- The previous tokens are invalidated

### 2.5 Logout

**Endpoint**: `POST /api/auth/logout`

**Description**: Logs out the user by clearing authentication cookies.

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example curl command**:
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

**Notes**:
- Clears both access_token and refresh_token cookies
- The user will need to log in again to access protected resources

## 3. Admin User Management

System administrators can manage admin users throughout the system.

### 3.1 Create Admin User

**Endpoint**: `POST /api/system-admin/admins`

**Description**: Creates a new admin user (requires system_admin privileges).

**Request Body**:
```json
{
  "email": "new-admin@example.com",
  "firstName": "New",
  "lastName": "Admin",
  "role": "admin"
}
```

**Response (201 Created)**:
```json
{
  "message": "Admin account created successfully",
  "user": {
    "id": "681e3724ab432599ab6c7db4",
    "email": "new-admin@example.com",
    "firstName": "New",
    "lastName": "Admin"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields or user already exists
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a system administrator
- `500 Internal Server Error`: Server error during creation

**Example curl command**:
```bash
curl -X POST http://localhost:3001/api/system-admin/admins \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "new-admin@example.com",
    "firstName": "New",
    "lastName": "Admin",
    "role": "admin"
  }'
```

**Notes**:
- This endpoint is rate limited (10 requests per 15 minutes)
- Requires system_admin authentication via cookie
- A password setup email is sent to the new admin
- The admin needs to set a password before they can log in

### 3.2 List Admin Users

**Endpoint**: `GET /api/system-admin/admins`

**Description**: Lists all admin users in the system (requires system_admin privileges).

**Response (200 OK)**:
```json
{
  "message": "Admin users retrieved successfully",
  "admins": [
    {
      "id": "681e3724ab432599ab6c7db4",
      "email": "new-admin@example.com",
      "firstName": "New",
      "lastName": "Admin",
      "role": "admin"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a system administrator
- `500 Internal Server Error`: Server error

**Example curl command**:
```bash
curl -X GET http://localhost:3001/api/system-admin/admins \
  -b cookies.txt
```

**Notes**:
- Requires system_admin authentication via cookie
- Sensitive fields like password and reset tokens are excluded

### 3.3 Generate Password Reset Token for Admin

#### 3.3.1 By User ID

**Endpoint**: `POST /api/system-admin/admins/:id/reset-token`

**Description**: Generates a password reset token for an admin user (requires system_admin privileges).

**Response (200 OK)**:
```json
{
  "message": "Password reset token generated successfully",
  "token": "7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p",
  "email": "admin@example.com"
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a system administrator
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**Example curl command**:
```bash
curl -X POST http://localhost:3001/api/system-admin/admins/681e3724ab432599ab6c7db4/reset-token \
  -b cookies.txt
```

#### 3.3.2 By Email

**Endpoint**: `POST /api/system-admin/admins/reset-token/by-email`

**Description**: Generates a password reset token for an admin user by email (requires system_admin privileges).

**Request Body**:
```json
{
  "email": "admin@example.com"
}
```

**Response (200 OK)**:
```json
{
  "message": "Password reset token generated successfully",
  "token": "7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p",
  "userId": "681e3724ab432599ab6c7db4"
}
```

**Error Responses**:
- `400 Bad Request`: Email is required
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a system administrator
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**Example curl command**:
```bash
curl -X POST http://localhost:3001/api/system-admin/admins/reset-token/by-email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "admin@example.com"
  }'
```

**Notes**:
- Requires system_admin authentication via cookie
- In production, the token would typically be sent via email rather than returned in the response
- The token is valid for the time specified in PASSWORD_RESET_TOKEN_EXPIRES (default: 1 hour)

## 4. JWT Token Handling and Authentication Flow

The INSEAT system uses JWT (JSON Web Tokens) to handle authentication. This section explains how tokens work in the system.

### 4.1 JWT Token Structure

JWT tokens consist of three parts separated by dots:
1. **Header**: Contains the token type and signing algorithm
2. **Payload**: Contains claims (user data)
3. **Signature**: Ensures the token hasn't been tampered with

#### 4.1.1 Access Token

The access token payload contains:
```json
{
  "id": "user-id-here",
  "email": "user@example.com",
  "role": "system_admin",
  "iat": 1620000000,
  "exp": 1620086400
}
```

- `id`: MongoDB ID of the user
- `email`: User's email address
- `role`: User's role (system_admin, admin, customer, etc.)
- `iat`: Issued at timestamp (when the token was created)
- `exp`: Expiration timestamp (when the token will expire)

#### 4.1.2 Refresh Token

The refresh token payload is simpler and contains:
```json
{
  "id": "user-id-here",
  "iat": 1620000000,
  "exp": 1620604800
}
```

- `id`: MongoDB ID of the user
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (longer than access token)

### 4.2 Authentication Flow

The INSEAT system implements a secure authentication flow using JWT tokens:

1. **Initial Authentication**: 
   - User logs in with email and password
   - System validates credentials
   - System generates access and refresh tokens
   - Tokens are set as HTTP-only cookies

2. **Subsequent Requests**:
   - Access token is automatically sent with each request via cookie
   - Server verifies the token's signature and expiration
   - If valid, the request is processed with the user's identity and permissions

3. **Token Renewal**:
   - When the access token expires, the client can request a new one
   - The refresh token is used to authenticate this request
   - If valid, new access and refresh tokens are issued
   - The old tokens are invalidated

4. **Logout**:
   - The tokens are cleared from cookies
   - User must log in again to receive new tokens

### 4.3 Authentication Middleware

The system uses several middleware components to handle authentication:

#### 4.3.1 Cookie-Based Authentication

**Middleware**: `authenticateWithCookie`

**Description**: Validates the JWT access token from the cookies and attaches the user data to the request.

**Behavior**:
- Reads the access_token from cookies
- Verifies the token's signature and expiration
- Decodes the user information and attaches it to req.user
- Includes 5 minutes of clock skew tolerance to handle minor time differences
- Returns proper error responses for authentication failures

#### 4.3.2 Role-Based Access Control

**Middleware**: `requireSystemAdminRole`, `requireRestaurantAdminRole`, `requireCustomerRole`, etc.

**Description**: Checks if the authenticated user has the required role to access a resource.

**Behavior**:
- Confirms that req.user exists (user is authenticated)
- Checks if the user's role matches the required role
- Returns a 403 Forbidden error if the role doesn't match

#### 4.3.3 Permission-Based Authorization

**Middleware**: `requirePermission`

**Description**: Verifies if the user has specific permissions to perform actions.

**Example**:
```javascript
requirePermission('users', 'read')
```

**Behavior**:
- Confirms the user is authenticated
- Checks if the user has the specific permission on the resource
- Returns a 403 Forbidden error if the permission is missing

### 4.4 Token Security Measures

The INSEAT system implements several security measures to protect tokens:

1. **HTTP-Only Cookies**: Prevents JavaScript access to token cookies, mitigating XSS attacks

2. **Secure Cookies**: In production, cookies are only sent over HTTPS

3. **SameSite Protection**: Cookies use SameSite=strict in production to prevent CSRF attacks

4. **Short-Lived Access Tokens**: Access tokens expire after 24 hours

5. **Token Refresh Mechanism**: Long-lived refresh tokens (7 days) allow obtaining new access tokens

6. **Algorithm Restriction**: Only HS256 algorithm is allowed for token verification

## 5. Troubleshooting and Advanced Tips

### 5.1 Common Authentication Issues

#### 5.1.1 "Authentication required" Error

**Possible causes**:
- Missing access_token cookie
- Expired access token
- Invalid token signature

**Solutions**:
1. Check if the user is logged in
2. Try refreshing the token using the refresh-token endpoint
3. If the refresh token is also expired, require a new login

**Example refresh flow**:
```bash
# Attempt to refresh the token
curl -X POST http://localhost:3001/api/auth/refresh-token \
  -b cookies.txt

# If that fails, perform a new login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "SecureP@ssw0rd"
  }'
```

#### 5.1.2 "Invalid or expired token" Error

**Possible causes**:
- Token has been tampered with
- Token has expired
- System clock differences between client and server

**Solutions**:
1. Ensure the token hasn't been modified
2. Check for significant time differences between client and server
3. The system includes 5 minutes of clock skew tolerance to handle minor time differences

#### 5.1.3 Password Setup Issues

**Possible causes**:
- Password reset token has expired (default: 1-hour validity)
- Token has already been used
- Password doesn't meet complexity requirements

**Solutions**:
1. Request a new password reset token
2. Ensure the password meets all requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character (@$!%*?&)

### 5.2 Advanced Authentication Scenarios

#### 5.2.1 Complete System Admin Setup Flow

This example shows the complete flow from creating a system admin to logging in:

```bash
# 1. Create the first system admin
curl -X POST http://localhost:3001/api/system-admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "firstName": "System",
    "lastName": "Administrator"
  }'

# 2. Use the token received from the system or email to set up the password
# (The token would normally be received via email or logged in development)
curl -X POST http://localhost:3001/api/password/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p",
    "password": "SecureP@ssw0rd"
  }'

# 3. Log in with the new system admin account
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "SecureP@ssw0rd"
  }'

# 4. Verify the login was successful by checking the profile
curl -X GET http://localhost:3001/api/auth/me \
  -b cookies.txt
```

#### 5.2.2 Creating and Setting Up an Admin User

This example shows how to create and set up an admin user as a system admin:

```bash
# 1. Log in as system admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "SecureP@ssw0rd"
  }'

# 2. Create a new admin user
curl -X POST http://localhost:3001/api/system-admin/admins \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "new-admin@example.com",
    "firstName": "New",
    "lastName": "Admin",
    "role": "admin"
  }'

# 3. Generate a password reset token for the admin
# (Optional, as a token is automatically created and emailed during creation)
curl -X POST http://localhost:3001/api/system-admin/admins/reset-token/by-email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "new-admin@example.com"
  }'

# 4. The admin would then use the token to set their password
# (The token would normally be received via email)
curl -X POST http://localhost:3001/api/password/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p",
    "password": "AdminP@ssw0rd"
  }'
```

### 5.3 Security Best Practices

For optimal security in the INSEAT system, follow these best practices:

1. **Regular Password Changes**:
   - Administrators should change their passwords regularly
   - System policies can enforce password expiry

2. **Environment Configuration**:
   - Ensure `NODE_ENV=production` in production environments
   - Use strong, unique secrets for JWT_SECRET and REFRESH_TOKEN_SECRET

3. **Token Handling**:
   - Never store tokens in localStorage or sessionStorage (vulnerable to XSS)
   - The HTTP-only cookie approach is significantly more secure

4. **Rate Limiting**:
   - The system has built-in rate limiting for sensitive endpoints
   - In production, consider more restrictive limits than the defaults

5. **Monitoring**:
   - Monitor failed login attempts
   - Watch for suspicious patterns that might indicate brute force attempts

6. **HTTPS**:
   - Always use HTTPS in production
   - Configure secure and SameSite cookie attributes

### 5.4 Debugging Authentication Issues

When troubleshooting authentication problems, check the following:

1. **Server Logs**:
   - Authentication middleware logs detailed information
   - Token verification errors are reported with timing information

2. **Cookie Inspection**:
   - Verify that access_token and refresh_token cookies are present
   - Check if cookies have expired

3. **Browser Console**:
   - CORS issues might prevent cookies from being set
   - Check for related errors in the browser's developer console

4. **HTTP Headers**:
   - Ensure `Content-Type: application/json` is set for API requests
   - Check if Origin and Credentials headers are properly configured for CORS

5. **Token Verification**:
   - The system includes clock skew tolerance, but significant time differences can still cause issues
   - Ensure server time is synchronized with NTP or similar services

---

This documentation provides a comprehensive guide to the INSEAT system's authentication and user management flows. By following these instructions and best practices, you can securely manage users and ensure proper authentication throughout your application.

=======
>>>>>>> origin/menu-integration
