# Magic Link Admin User Creation System

## Overview

This system implements a secure, hierarchical user management system with magic link functionality for the INSEAT Backend. It provides a way to create system administrators (sys-admin) and admin users with secure password setup through email-based magic links.

## Features

- Two-tier admin system (sys-admin and admin)
- Secure password setup via magic links
- Rate-limited endpoints
- Email notifications
- Token-based authentication
- Strong password requirements
- Transaction support for data consistency

## Implementation Components

### Core Files
```
services/auth-service/src/
├── controllers/
│   ├── SystemAdminController.ts   # Handles sys-admin and admin user creation
│   └── PasswordSetupController.ts # Handles magic link verification and password setup
├── routes/
│   ├── systemAdminRoutes.ts      # Routes for sys-admin operations
│   └── passwordSetupRoutes.ts    # Routes for password setup
├── middleware/
│   └── systemAdminAuth.ts        # Sys-admin authentication middleware
├── services/
│   └── EmailService.ts           # Email sending service
└── utils/
    ├── tokenUtils.ts             # Token generation and verification
    └── emailTemplates.ts         # Email templates
```

## API Endpoints

### 1. First System Administrator Setup
```http
POST /api/auth/sys-admin/setup
Content-Type: application/json

{
    "email": "sysadmin@example.com",
    "firstName": "System",
    "lastName": "Administrator"
}
```

### 2. Create Admin User (Requires Sys-admin Authentication)
```http
POST /api/auth/sys-admin/admins
Authorization: Bearer <sys-admin-token>
Content-Type: application/json

{
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User"
}
```

### 3. Verify Magic Link Token
```http
GET /api/auth/verify-setup-token?token=<token>
```

### 4. Set Up Password
```http
POST /api/auth/setup-password
Content-Type: application/json

{
    "token": "<token-from-email>",
    "password": "SecureP@ssw0rd"
}
```

## Configuration

### Required Environment Variables
```env
# Email Configuration
EMAIL_SERVICE=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Security Configuration
PASSWORD_RESET_TOKEN_EXPIRES=3600  # Token expiry in seconds (1 hour)
```

## Security Features

### Rate Limiting
- Token verification: 10 requests per 15 minutes
- Password setup: 5 attempts per hour
- System admin setup: 3 attempts per hour

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### Token Security
- One-time use
- 1-hour expiration
- Cryptographically secure generation
- Hashed storage in database

## Testing Guide

### 1. Initial Setup

1. Create the first sys-admin:
```bash
curl -X POST http://localhost:3000/api/auth/sys-admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sysadmin@example.com",
    "firstName": "System",
    "lastName": "Administrator"
  }'
```

2. Check the console (development) or email (production) for the magic link

3. Verify the token:
```bash
curl -X GET "http://localhost:3000/api/auth/verify-setup-token?token=<token-from-email>"
```

4. Set up the password:
```bash
curl -X POST http://localhost:3000/api/auth/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-email>",
    "password": "SecureP@ssw0rd"
  }'
```

### 2. Creating Admin Users

1. Login as sys-admin to get authentication token:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sysadmin@example.com",
    "password": "SecureP@ssw0rd"
  }'
```

2. Create admin user:
```bash
curl -X POST http://localhost:3000/api/auth/sys-admin/admins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <sys-admin-token>" \
  -d '{
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

## Error Handling

The API returns appropriate error responses for:

### 400 Bad Request
- Missing required fields
- Invalid password format
- Invalid/expired tokens
- Duplicate email addresses

### 401 Unauthorized
- Invalid authentication
- Missing authentication

### 403 Forbidden
- Insufficient privileges
- Non-sys-admin attempting admin creation

### 429 Too Many Requests
- Rate limit exceeded

### 500 Internal Server Error
- Email sending failures
- Database errors

## Monitoring

Monitor the following in your logs:
1. Failed authentication attempts
2. Token verification failures
3. Rate limit violations
4. Email sending status
5. Admin user creation events

## Maintenance

Regular maintenance tasks:
1. Monitor email service status
2. Check rate limit configurations
3. Review security logs
4. Update email templates as needed
5. Verify token expiration settings

## Best Practices

1. Always verify email configuration before deployment
2. Regularly rotate sys-admin credentials
3. Monitor failed login attempts
4. Keep email templates up to date
5. Regularly review rate limit settings

