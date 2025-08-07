# INSEAT Admin System - Quick Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation Steps

1. Install Dependencies
```bash
cd services/auth-service
npm install
```

2. Set Up Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
EMAIL_SERVICE=smtp.gmail.com
EMAIL_PORT=587

EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
FRONTEND_URL=http://localhost:3000
PASSWORD_RESET_TOKEN_EXPIRES=3600
MONGODB_URI=mongodb://localhost:27017/inseat
```

3. Initialize the System
```bash
# Run initialization script
npm run init

# Expected output:
# ✅ Environment variables validated
# ✅ Database connection established
# ✅ Created admin role
# ✅ Created sys-admin role
# ✅ Database indexes verified
# ✅ Email service configuration verified
```

## Testing the Setup

1. Run the End-to-End Tests
```bash
# Run test flow
npm run test:flow
```

2. Manual Testing with Postman
- Import `INSEAT_Admin_System.postman_collection.json` into Postman
- Create a new environment with variables:
  - baseUrl: http://localhost:3000
  - sysAdminToken: (leave empty, will be auto-populated)
  - setupToken: (will be needed from magic link)

3. Test Flow
   a. Create First Sys-Admin:
   ```bash
   # Using curl
   curl -X POST http://localhost:3000/api/auth/sys-admin/setup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "sysadmin@example.com",
       "firstName": "System",
       "lastName": "Administrator"
     }'
   ```

   b. Check Console/Email for Magic Link
   - In development, the magic link will be logged to console
   - Copy the token part of the magic link

   c. Set Up Sys-Admin Password:
   ```bash
   curl -X POST http://localhost:3000/api/auth/setup-password \
     -H "Content-Type: application/json" \
     -d '{
       "token": "<token-from-magic-link>",
       "password": "SecureP@ssw0rd"
     }'
   ```

   d. Login as Sys-Admin:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "sysadmin@example.com",
       "password": "SecureP@ssw0rd"
     }'
   ```

## Creating Admin Users

1. Using the sys-admin token from login:
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

2. The new admin will receive a magic link for password setup

## Verification Checklist

- [ ] Email service is working
- [ ] MongoDB is properly configured
- [ ] Required roles are created
- [ ] System administrator can be created
- [ ] Magic links are being generated
- [ ] Password setup is working
- [ ] Admin users can be created
- [ ] Rate limiting is active

## Troubleshooting

1. Email Issues
   - Check EMAIL_* settings in .env
   - Verify email service credentials
   - Check email logs in console (development)

2. Database Issues
   - Verify MongoDB is running
   - Check MONGODB_URI in .env
   - Verify database permissions

3. Token Issues
   - Check PASSWORD_RESET_TOKEN_EXPIRES setting
   - Verify FRONTEND_URL is correct
   - Check token generation in logs

4. Authentication Issues
   - Verify JWT_SECRET is set
   - Check token expiration settings
   - Verify role assignments

## Monitoring

Monitor the following in your logs:
1. User creation events
2. Password setup attempts
3. Failed login attempts
4. Rate limit violations
5. Email sending status

## Security Notes

1. Password Requirements
   - Minimum 8 characters
   - Must include uppercase, lowercase, number, special character

2. Rate Limiting
   - Sys-admin creation: 3 attempts per hour
   - Password setup: 5 attempts per hour
   - Token verification: 10 attempts per 15 minutes

3. Token Security
   - One-time use only
   - 1-hour expiration
   - Cryptographically secure
   - Hashed storage

## Next Steps

1. Regular Maintenance
   - Monitor email delivery success rate
   - Review failed login attempts
   - Check rate limit effectiveness
   - Update email templates as needed

2. Security Updates
   - Regularly rotate sys-admin credentials
   - Monitor for suspicious activities
   - Review and update rate limits if needed

3. Backup and Recovery
   - Regular database backups
   - Document recovery procedures
   - Test restore processes

