# INSEAT Demo Account Creation System

## Overview

The INSEAT Demo Account Creation System provides a comprehensive solution for automatically generating fully functional demo restaurant accounts. This system creates complete restaurant environments with sample data, admin user accounts, and email notifications.

## Features

### 🏪 Complete Restaurant Setup
- **Restaurant Profile**: Automatically created with demo information
- **Menu System**: Pre-populated with categories, items, and modifiers
- **Table Management**: 15 demo tables with varying capacities
- **Venue Configuration**: Basic venue setup for demonstrations

### 👤 User Management
- **Admin User Creation**: Automatic creation of restaurant admin user
- **Role Assignment**: Proper RBAC role assignment for demo users
- **Authentication**: Secure password generation and hashing
- **7-day Expiration**: Demo accounts automatically expire after 7 days

### 📧 Email Notifications
- **Professional Templates**: Comprehensive HTML email templates
- **Credential Delivery**: Secure delivery of login credentials
- **Multiple Access Points**: Both admin dashboard and customer menu links
- **Expiration Notifications**: Clear communication of demo duration

### 🔒 Security & Validation
- **Input Validation**: Comprehensive validation for all inputs
- **Rate Limiting**: 5 requests per hour per IP/email combination
- **Security Headers**: Proper security headers for all endpoints
- **Error Handling**: Comprehensive error handling and logging

## API Endpoints

### POST /api/demo/create-account

Creates a complete demo account with all components.

**Request Body:**
```json
{
  "restaurantName": "My Demo Restaurant",
  "businessEmail": "demo@example.com"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Demo account created successfully. Check your email for login credentials.",
  "data": {
    "restaurantId": "67890abcdef123456789",
    "restaurantName": "My Demo Restaurant",
    "adminDemoLink": "https://admin-demo.inseat.com/abc123def456",
    "customerDemoLink": "https://demo.inseat.com/abc123def456",
    "expiresAt": "2025-08-13T10:30:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Missing required fields: restaurantName and businessEmail are required"
}
```

### GET /api/demo/customer/:demoId

Retrieves customer demo information for a specific demo ID.

### POST /api/demo/validate

Validates demo login credentials.

### GET /api/demo/list

Lists all demo requests (admin only).

## Demo Account Structure

### Restaurant Data
- **Basic Information**: Name, email, phone, address
- **Operating Hours**: Full week schedule (9 AM - 10 PM default)
- **Settings**: Currency (USD), tax rate (5%), service options
- **Demo Flag**: Marked as demo account for identification

### Menu Structure
- **Categories**: 5 main categories (Starters, Main Courses, Sides, Desserts, Drinks)
- **Menu Items**: 12 sample items with descriptions and pricing
- **Modifiers**: 4 modifier groups (Spice Level, Add Extras, Cooking Preference, Size)
- **Images**: Placeholder images for all items and categories

### Table Configuration
- **15 Tables**: Various capacities (2, 4, 6, 8 seats)
- **Availability**: All tables set to available status
- **Naming**: Simple "Table 1", "Table 2" naming convention

### User Configuration
- **Admin Role**: Restaurant admin with full permissions
- **Credentials**: Secure password with mixed characters
- **Profile**: Basic profile information
- **Expiration**: 7-day automatic expiration

## Environment Configuration

### Required Environment Variables

```bash
# Email Configuration
EMAIL_APPLICATION=your-email@gmail.com
EMAIL_APPLICATION_PASSWORD=your-app-password

# Demo URLs
ADMIN_DEMO_BASE_URL=https://admin-demo.inseat.com
CUSTOMER_DEMO_BASE_URL=https://demo.inseat.com

# Database
MONGO_URL=mongodb://localhost:27017/inseat

# Application
PORT=3001
NODE_ENV=development
```

### Optional Environment Variables

```bash
# Email Service (alternative configuration)
EMAIL_SERVICE=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Testing

### Automated Testing

Run the provided test script to validate the demo system:

```bash
# Install axios if not already installed
npm install axios

# Run tests
node test-demo-endpoint.js

# Run tests with custom URL
BASE_URL=http://localhost:3001 node test-demo-endpoint.js
```

### Manual Testing

1. **Start the INSEAT Backend**:
   ```bash
   npm start
   ```

2. **Create a Demo Account**:
   ```bash
   curl -X POST http://localhost:3001/api/demo/create-account \
     -H "Content-Type: application/json" \
     -d '{
       "restaurantName": "Test Restaurant",
       "businessEmail": "test@example.com"
     }'
   ```

3. **Check Email**: Verify that the demo credentials email was sent

4. **Test Login**: Use the provided credentials to log into the admin dashboard

## Rate Limiting

The demo system implements rate limiting to prevent abuse:

- **5 requests per hour** per IP/email combination
- **Automatic reset** after 1 hour
- **Clear error messages** when limit is exceeded
- **Remaining time** information provided

## Security Features

### Input Validation
- Email format validation
- Restaurant name length validation (2-100 characters)
- Input sanitization (trim and normalize)

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Password Security
- 12-character secure passwords
- Mixed character types (lowercase, uppercase, numbers, symbols)
- Bcrypt hashing with salt rounds of 12
- No password storage in plain text

## Logging

The system provides comprehensive logging for:

- **Request Tracking**: All demo requests with correlation IDs
- **Validation Failures**: Detailed validation error logging
- **Rate Limiting**: Rate limit hits and resets
- **Account Creation**: Successful account creation events
- **Email Delivery**: Email sending success/failure
- **Error Handling**: All errors with stack traces

## Database Models

### DemoRequest Model
```javascript
{
  fullName: String,
  email: String,
  phoneNumber: String,
  companyName: String,
  restaurantName: String,
  restaurantId: ObjectId,
  adminDemoLink: String,
  customerDemoLink: String,
  status: 'pending' | 'processed' | 'completed',
  adminDemoPassword: String,
  expiresAt: Date
}
```

### Enhanced User Model
```javascript
{
  // ... existing fields
  isDemo: Boolean,
  demoExpiresAt: Date,
  isEmailVerified: Boolean,
  profile: {
    firstName: String,
    lastName: String,
    phoneNumber: String
  },
  createdBy: String
}
```

## Error Handling

### Common Error Codes

- **400**: Bad Request (missing/invalid fields)
- **409**: Conflict (demo already exists for email)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error (system error)

### Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details",
  "missingFields": ["field1", "field2"] // for validation errors
}
```

## Monitoring and Maintenance

### Cleanup Tasks
- Demo accounts automatically expire after 7 days
- Consider implementing cleanup jobs for expired demos
- Monitor email delivery success rates

### Performance Monitoring
- Track demo creation success rates
- Monitor email delivery performance
- Watch for rate limiting patterns

### Scalability Considerations
- Rate limiting is currently in-memory (consider Redis for production)
- Email service may need queuing for high volumes
- Database transactions ensure data consistency

## Troubleshooting

### Common Issues

1. **Email not being sent**:
   - Check EMAIL_APPLICATION and EMAIL_APPLICATION_PASSWORD
   - Verify Gmail app password configuration
   - Check email service logs

2. **Demo account creation fails**:
   - Verify MongoDB connection
   - Check for missing required roles in database
   - Review error logs for specific issues

3. **Rate limiting too strict**:
   - Adjust MAX_REQUESTS_PER_HOUR in demoValidation.ts
   - Consider implementing user-based vs IP-based limiting

4. **Demo URLs not working**:
   - Verify ADMIN_DEMO_BASE_URL and CUSTOMER_DEMO_BASE_URL
   - Ensure frontend applications are configured to handle demo routes

## Integration Guide

### Frontend Integration

1. **Admin Dashboard**: Handle demo-specific UI elements
2. **Customer Menu**: Support demo mode indicators
3. **Authentication**: Handle demo user login flow
4. **Expiration**: Show demo expiration warnings

### Email Templates

The system uses professional HTML email templates that include:
- Responsive design for all devices
- Clear credential presentation
- Feature overview sections
- Professional branding

## Support and Maintenance

For issues with the demo system:

1. Check the application logs for detailed error information
2. Verify environment configuration
3. Test email delivery manually
4. Review rate limiting settings
5. Monitor database performance

The demo system is designed to be robust and self-maintaining, with automatic cleanup and comprehensive error handling.