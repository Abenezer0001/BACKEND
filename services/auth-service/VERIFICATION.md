# Implementation Verification Checklist

## 1. Environment Setup Verification
- [ ] Required environment variables are set in .env:
  ```env
  EMAIL_SERVICE=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_USER=your-email@gmail.com
  EMAIL_PASSWORD=your-app-specific-password
  FRONTEND_URL=http://localhost:3000
  PASSWORD_RESET_TOKEN_EXPIRES=3600
  ```

## 2. Database Verification
- [ ] Check that required roles exist in the database:
  ```javascript
  // Using MongoDB Shell
  use inseat
  db.roles.find({})  // Should show 'admin' and 'sys-admin' roles
  ```

## 3. Integration Test Flow

### A. System Admin Creation
1. Create first sys-admin:
```bash
curl -X POST http://localhost:3000/api/auth/sys-admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sysadmin@example.com",
    "firstName": "System",
    "lastName": "Administrator"
  }'
```
Expected response:
```json
{
  "message": "System administrator account created successfully",
  "user": {
    "id": "<user-id>",
    "email": "sysadmin@example.com",
    "firstName": "System",
    "lastName": "Administrator"
  }
}
```

2. Verify email delivery and extract token from console/email

3. Set up sys-admin password:
```bash
curl -X POST http://localhost:3000/api/auth/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-email>",
    "password": "SecureP@ssw0rd"
  }'
```

4. Login as sys-admin:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sysadmin@example.com",
    "password": "SecureP@ssw0rd"
  }'
```

### B. Admin User Creation
1. Create admin user (using sys-admin token):
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

2. List admin users:
```bash
curl -X GET http://localhost:3000/api/auth/sys-admin/admins \
  -H "Authorization: Bearer <sys-admin-token>"
```

### C. Error Cases to Test

1. Rate Limiting:
- Try creating multiple sys-admins quickly (should be limited to 3/hour)
- Try multiple password setup attempts (should be limited to 5/hour)

2. Invalid Token:
```bash
curl -X POST http://localhost:3000/api/auth/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invalid-token",
    "password": "SecureP@ssw0rd"
  }'
```

3. Weak Password:
```bash
curl -X POST http://localhost:3000/api/auth/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<valid-token>",
    "password": "weak"
  }'
```

4. Unauthorized Admin Creation:
```bash
curl -X POST http://localhost:3000/api/auth/sys-admin/admins \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

## 4. Security Verification Checklist

- [ ] Password hashing is working (check database)
- [ ] Tokens are properly hashed in database
- [ ] Rate limiting is active
- [ ] Authentication middleware is working
- [ ] Role-based authorization is working
- [ ] Email service is properly configured
- [ ] Token expiration is working

## 5. Common Issues and Solutions

1. Email Configuration Issues:
   - Check EMAIL_SERVICE, EMAIL_PORT settings
   - Verify EMAIL_USER and EMAIL_PASSWORD
   - Test email service connection

2. Database Connection Issues:
   - Verify MongoDB connection string
   - Check if roles are properly seeded
   - Verify indexes are created

3. Token Issues:
   - Check TOKEN_EXPIRES setting
   - Verify token generation and hashing
   - Check token storage in database

4. Authentication Issues:
   - Verify JWT configuration
   - Check token validation
   - Verify role assignment

## 6. Monitoring Points

1. Watch for:
   - Failed login attempts
   - Rate limit hits
   - Email sending failures
   - Token verification failures
   - Database errors

2. Log points to monitor:
   - User creation events
   - Password setup attempts
   - Authentication failures
   - Rate limit violations

## 7. Maintenance Tasks

1. Regular checks:
   - Email service status
   - Rate limit configurations
   - Security logs
   - Database indexes
   - Token expiration settings

2. Periodic tasks:
   - Review failed login attempts
   - Check email delivery success rate
   - Monitor system admin activities
   - Review rate limit effectiveness

