# INSEAT Backend Documentation

## Architecture Overview

The INSEAT Backend is built using Express.js with TypeScript and follows a modular service-oriented architecture. It consists of a main application that acts as an API gateway and several specialized services for specific domains.

### Core Technologies

- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time Communication:** Socket.IO
- **Messaging:** Kafka for event-driven architecture
- **API Documentation:** Swagger

## Main Application Structure

The main application (`app.ts`) serves as an API Gateway, handling:

- Request routing to appropriate services
- Global middleware configuration
- Authentication
- WebSocket connections
- Server lifecycle management

### Key Components in Main App

```
INSEAT-Backend/
├── src/
│   ├── app.ts              # Main entry point
│   ├── config/             # Configuration (websocket, etc.)
│   ├── services/           # Core services used by the gateway
```

## Service Architecture

The application follows a service-oriented architecture where each domain has its own dedicated service:

```
INSEAT-Backend/
├── services/
│   ├── auth-service/       # Authentication, users, roles, permissions
│   ├── order-service/      # Order management with WebSocket & Kafka
│   ├── restaurant-service/ # Restaurant, menu management
│   ├── payment-service/    # Payment processing
│   └── notification-service/ # Notifications
```

Each service is structured similarly with:
- Controllers (request handling)
- Models (data schemas)
- Routes (API endpoints)
- Services (business logic)
- Middleware (request processing)

## Authentication System

The authentication system uses a JWT-based approach with:

- HTTP-only cookies for secure token storage
- Short-lived access tokens (15 minutes)
- Longer-lived refresh tokens (7 days)
- Google OAuth integration
- Role-based access control

### Authentication Flow

1. User logs in/registers 
2. Server issues access and refresh tokens
3. Access token used for API authentication
4. Refresh token used to get new access tokens
5. Tokens stored in HTTP-only cookies

## Order Service

The Order Service manages customer orders with real-time updates through WebSockets and event publishing through Kafka.

### Key Components

- **OrderController:** Handles HTTP requests for order operations
- **WebSocketService:** Manages real-time notifications
- **KafkaProducerService:** Publishes order events to Kafka topics
- **KafkaConsumerService:** Processes events from Kafka topics
- **OrderSocketService:** Manages Socket.IO connections for order updates

### Order Workflow

1. Customer creates an order
2. Order is saved to MongoDB
3. Real-time notification sent via WebSocket
4. Order event published to Kafka
5. Restaurant updates order status
6. Status updates pushed in real-time to customer
7. Payment processed through payment service

## WebSocket Implementation

The application uses a singleton pattern for WebSocket management:

1. WebSocketManager class in the main app initializes the Socket.IO server
2. Each service (like OrderSocketService) connects to this server
3. Clients connect to specific rooms based on user/restaurant/table IDs
4. Events like order status changes are broadcast to relevant rooms

## API Routes

### Main API Routes
- `/api` - General API endpoints
- `/api/auth` - Authentication endpoints
- `/api/admin` - Admin-specific endpoints

### Order Service Routes
- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get all orders with filtering
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/payment` - Update payment status
- `POST /api/orders/:id/cancel` - Cancel an order
- `GET /api/orders/restaurant/:restaurantId` - Get orders by restaurant
- `GET /api/orders/user/:userId` - Get orders by user

## Security Considerations

- HTTP-only cookies for JWT storage
- CORS configuration to restrict origins
- Helmet for HTTP security headers
- Environment variable storage for secrets
- Input validation on all endpoints
- Role-based access control

## Deployment & Scaling

The architecture supports:
- Independent deployment of services
- Horizontal scaling of individual services
- Load balancing across multiple instances
- Environment-specific configurations

## Integration Points

- **Frontend:** React applications connect via REST API and WebSockets
- **Payment Processors:** Integration through payment service
- **Notification Channels:** Email, push notifications via notification service
- **Analytics:** Order and user data available for reporting

## Future Improvements

- Microservice decomposition with dedicated databases per service
- Message queue high availability with Kafka clusters
- Enhanced monitoring and telemetry
- Rate limiting and additional security measures 