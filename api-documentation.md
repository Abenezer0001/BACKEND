# INSEAT Backend API Documentation

## Base URL
All endpoints are prefixed with: `http://localhost:3001/api`

## Authentication Endpoints

### Register New User
**Endpoint:** `/auth/register`  
**Method:** POST  
**Headers:** Content-Type: application/json  
**Request Body:**
```json
{
  "email": "test2@example.com",
  "password": "Test123!",
  "firstName": "Test",
  "lastName": "User"
}
```
**Example curl command:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'
```
**Success Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "681b098cf62e7b54cf524c53",
    "email": "test2@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "customer"
  }
}
```

### Login
**Endpoint:** `/auth/login`  
**Method:** POST  
**Headers:** Content-Type: application/json  
**Request Body:**
```json
{
  "email": "test2@example.com",
  "password": "Test123!"
}
```
**Example curl command:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"Test123!"}'
```
**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "681b098cf62e7b54cf524c53",
    "email": "test2@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "customer"
  }
}
```
**Notes:**
- The response includes two HTTP-only cookies:
  - `access_token`: Short-lived token (15 minutes)
  - `refresh_token`: Long-lived token (7 days)
- These cookies are automatically used for authentication in subsequent requests

### Get Current User Profile
**Endpoint:** `/auth/me`  
**Method:** GET  
**Authentication:** Required (via cookies)  
**Example curl command:**
```bash
curl http://localhost:3001/api/auth/me -b cookies.txt
```
**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "681b098cf62e7b54cf524c53",
    "email": "test2@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "customer"
  }
}
```

### Logout
**Endpoint:** `/auth/logout`  
**Method:** POST  
**Authentication:** Required (via cookies)  
**Example curl command:**
```bash
curl -X POST http://localhost:3001/api/auth/logout -b cookies.txt
```
**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
**Notes:**
- This endpoint will clear both the access_token and refresh_token cookies

