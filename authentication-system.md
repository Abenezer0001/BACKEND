# INSEAT Authentication System Documentation

## Overview

This document details the newly implemented authentication system for the INSEAT platform. The system has been rebuilt to focus on security, robustness, and improved user experience.

## Key Features

1. **Cookie-Based Authentication**: Tokens are now stored in HTTP-only cookies instead of localStorage, providing enhanced security.
2. **JWT Implementation**: Uses JSON Web Tokens with short-lived access tokens and longer-lived refresh tokens.
3. **Google OAuth Integration**: Allows customers to authenticate using their Google accounts.
4. **Role-Based Access Control**: Different user roles (customer, restaurant_admin, system_admin) with appropriate permissions.
5. **Security Measures**: Protection against XSS, CSRF, and other common vulnerabilities.

## Token Strategy

### Access Token
- **Purpose**: Used for authenticating API requests
- **Lifetime**: Short-lived (15 minutes by default)
- **Storage**: HTTP-only, secure cookie named `access_token`

### Refresh Token
- **Purpose**: Used to obtain new access tokens when they expire
- **Lifetime**: Longer-lived (7 days by default)
- **Storage**: HTTP-only, secure cookie named `refresh_token`

## Authentication Flow

### Standard Email/Password Flow

1. **Registration**: User submits registration form with email, password, and profile details
   - Password is hashed before storage
   - Access and refresh tokens are issued and set as cookies
   - User record is created in the database

2. **Login**: User submits email and password
   - Server verifies credentials against database
   - If valid, issues access and refresh tokens as cookies
   - Updates last login timestamp

3. **Authenticated Requests**:
   - Server automatically extracts token from cookies
   - JWT payload is verified and decoded
   - Request proceeds if token is valid

4. **Token Refresh**:
   - When access token expires, client can request a new one using refresh token
   - If refresh token is valid, new access token (and optionally new refresh token) are issued
   - If refresh token is invalid/expired, user must log in again

5. **Logout**:
   - Cookies are cleared from browser

### Google OAuth Flow

1. **Initiation**: User clicks "Login with Google" button
   - Redirects to Google authentication page

2. **Authorization**: User authorizes our application on Google's consent screen

3. **Callback Processing**:
   - Google redirects to our callback URL with authorization code
   - Our server exchanges code for Google profile information
   - If email matches existing user, update their Google ID and last login
   - If new user, create account with Google profile info
   - Issue JWT tokens as cookies just like standard flow

4. **Redirect to Frontend**:
   - User is redirected to frontend with authentication complete

## Security Considerations

### Protection Against XSS (Cross-Site Scripting)
- Using HTTP-only cookies prevents JavaScript from accessing tokens
- Content Security Policy headers help prevent injection attacks

### Protection Against CSRF (Cross-Site Request Forgery)
- SameSite cookie attribute set to 'Strict' in production (or 'Lax' in development)
- Ensures cookies are only sent with requests originating from our site

### JWT Security
- Short-lived access tokens minimize damage if compromised
- Secret keys stored in environment variables
- Token verification handles invalid tokens gracefully

## API Endpoints

### Authentication

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|------------------------|
| /api/auth/register | POST | Register new user | No |
| /api/auth/login | POST | Login with email/password | No |
| /api/auth/google | GET | Initiate Google OAuth | No |
| /api/auth/google/callback | GET | Google OAuth callback | No |
| /api/auth/refresh-token | POST | Refresh access token | Refresh token cookie |
| /api/auth/logout | POST | Log out user | Yes |
| /api/auth/me | GET | Get current user profile | Yes |
| /api/auth/check | GET | Check authentication status | No |

### User Role Management

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|------------------------|
| /api/auth/users/:id/roles | GET | Get user roles | Yes + Permission |
| /api/auth/users/:id/roles | POST | Assign role to user | Yes + Permission |
| /api/auth/users/:id/roles/:roleId | DELETE | Remove role from user | Yes + Permission |

### User Permission Management

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|------------------------|
| /api/auth/users/:id/permissions | GET | Get user permissions | Yes + Permission |
| /api/auth/users/:id/permissions | POST | Assign permission to user | Yes + Permission |
| /api/auth/users/:id/permissions/:permissionId | DELETE | Remove permission from user | Yes + Permission |

## Frontend Integration

### Customer Frontend (inseat-menu)
- AuthService handles token refresh and management automatically
- Support for both email/password and Google authentication
- Automatic redirection to login when authentication expires

### Admin Frontend (INSEAT-Admin)
- Similar authentication flow with role-specific access
- Session management with appropriate timeouts
- Support for demo mode with sandboxed authentication

## Configuration

Authentication settings can be configured through environment variables:

```
# JWT Configuration
JWT_SECRET=your_jwt_secret_here
ACCESS_TOKEN_SECRET=your_access_token_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
ACCESS_TOKEN_EXPIRY=15m  # Short-lived access token
REFRESH_TOKEN_EXPIRY=7d  # Longer-lived refresh token

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Frontend URLs (for redirects)
CUSTOMER_FRONTEND_URL=http://localhost:8080
ADMIN_FRONTEND_URL=http://localhost:5173
```

## Sequence Diagrams

### Email/Password Login Flow

```
┌─────────┐                 ┌─────────┐                  ┌─────────┐
│ Browser │                 │ Server  │                  │ Database│
└────┬────┘                 └────┬────┘                  └────┬────┘
     │   POST /api/auth/login    │                            │
     │ ─────────────────────────>│                            │
     │                           │                            │
     │                           │        Find User           │
     │                           │ ─────────────────────────>│
     │                           │                           │
     │                           │      Return User Data     │
     │                           │ <─────────────────────────
     │                           │                           │
     │                           │ Verify Password          │
     │                           │                           │
     │                           │ Generate JWT Tokens      │
     │                           │                           │
     │  Set-Cookie: access_token │                           │
     │  Set-Cookie: refresh_token│                           │
     │ <─────────────────────────│                           │
     │                           │                           │
     │                           │                           │
```

### Google OAuth Flow

```
┌─────────┐         ┌─────────┐          ┌─────────┐         ┌─────────┐
│ Browser │         │ Server  │          │ Google  │         │ Database│
└────┬────┘         └────┬────┘          └────┬────┘         └────┬────┘
     │  GET /auth/google  │                   │                   │
     │ ──────────────────>│                   │                   │
     │                    │                   │                   │
     │                    │   Redirect to Google Auth             │
     │ <────────────────────────────────────>│                   │
     │                    │                   │                   │
     │   User Authenticates with Google       │                   │
     │ ─────────────────────────────────────>│                   │
     │                    │                   │                   │
     │                    │ Callback with Auth Code               │
     │                    │ <─────────────────────────────────────│
     │                    │                   │                   │
     │                    │ Exchange for Profile                 │
     │                    │ ─────────────────>│                   │
     │                    │                   │                   │
     │                    │ Get Profile Data  │                   │
     │                    │ <─────────────────│                   │
     │                    │                   │                   │
     │                    │  Find/Create User │                   │
     │                    │ ──────────────────────────────────────>
     │                    │                   │                   │
     │                    │ Return User Data  │                   │
     │                    │ <──────────────────────────────────────
     │                    │                   │                   │
     │                    │ Generate JWT Tokens                   │
     │                    │                   │                   │
     │  Set HTTP-only Cookies                 │                   │
     │  Redirect to frontend                  │                   │
     │ <────────────────────────────────────────────────────────────
     │                    │                   │                   │
```

## Future Improvements

- Implement token blacklisting for immediate invalidation on logout
- Add rate limiting to prevent brute force attacks
- Introduce additional OAuth providers (Apple, Facebook, etc.)
- Implement 2FA (Two-Factor Authentication) for admin users 