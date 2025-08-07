# Inseat-backend Project Structure &amp; Development Guide

This document outlines the structure, technologies, and development process for the Inseat-backend application, which follows a Microservices Architecture.

## Core Technologies (Inferred)

*   **Framework:** Express.js
*   **Language:** TypeScript
*   **Database:** Primarily MongoDB (using Mongoose ODM), potentially Prisma ORM in `auth-service`.
*   **API Specification:** Swagger (likely used in `restaurant-service`).
*   **Inter-service Communication:** RabbitMQ (`utils/rabbitmq.ts`) for asynchronous messaging, potentially direct HTTP calls.
*   **Authentication:** JWT (managed by `auth-service`).

## Architecture Overview

The backend employs a **Microservices Architecture**. The main application (`src/app.ts`) likely acts as an **API Gateway**, routing incoming requests to specialized, independent services located in the `services/` directory.

*   **API Gateway (`src/app.ts`):** Handles initial request processing, global middleware (CORS, logging), and routing logic to forward requests to the correct downstream microservice.
*   **Microservices (`services/*`):** Each service manages a specific domain (e.g., authentication, restaurants, orders). They run as separate processes, potentially communicating via RabbitMQ or direct HTTP calls.
*   **Shared Utilities (`utils/`):** Contains common code used across services, like the RabbitMQ helper.

## Project Structure Breakdown

```
Inseat-backend/
├── nodemon.json             # Auto-restart config
├── package.json             # Dependencies & scripts for gateway/monorepo mgmt
├── tsconfig.json            # Root TypeScript config
│
├── services/                # Microservices container
│   ├── index.ts             # Service initialization/export for gateway?
│   │
│   ├── auth-service/        # Handles AuthN/AuthZ, Users, Roles, Permissions (RBAC implementation may be incomplete)
│   │   ├── prisma/          # Prisma schema/migrations (if used)
│   │   └── src/
│   │       ├── controllers/ # Request handlers (AuthController, RoleController)
│   │       ├── middleware/  # Auth checks, RBAC checks
│   │       ├── models/      # Data models (User, Role, Permission)
│   │       ├── routes/      # API endpoint definitions
│   │       └── services/    # Business logic (RbacService)
│   │
│   ├── notification-service/ # Handles sending notifications
│   │   └── src/             # (Controllers, Models, Routes)
│   │
│   ├── order-service/       # Manages orders, intended for live updates via WebSockets (WebSocket implementation may be incomplete)
│   │   └── src/
│   │       ├── controllers/ # OrderController
│   │       ├── models/      # Order model
│   │       ├── routes/      # Order routes
│   │       ├── services/    # WebSocketService
│   │       └── websocket/   # WebSocketServer setup
│   │
│   ├── payment-service/     # Handles payment processing
│   │   └── src/             # (Controllers, Models, Routes)
│   │
│   └── restaurant-service/  # Manages Restaurants, Menus, Items, Categories, etc.
│       ├── tsconfig.json    # Service-specific TS config
│       ├── src/
│       │   ├── app.ts       # Service's Express app entry point
│       │   ├── config/      # Swagger config, etc.
│       │   ├── controllers/ # Request handlers (RestaurantController, MenuController)
│       │   ├── models/      # Mongoose models (Restaurant, Menu, MenuItem)
│       │   ├── routes/      # API endpoint definitions
│       │   ├── seeds/       # Database seeding scripts
│       │   ├── tests/       # Service tests
│       │   └── uploads/     # Storage for uploaded files
│       └── ...
│
├── src/                     # API Gateway source code
│   ├── app.ts               # Main Express app setup, middleware, service routing
│   ├── seed.ts              # Root seeding script
│   ├── config/              # Global/Gateway config
│   └── services/            # Gateway-specific services (LiveOrderMonitor)
│
└── utils/                   # Shared utilities
    └── rabbitmq.ts          # RabbitMQ setup/helpers
```

## Typical Request Lifecycle (Example: `GET /api/restaurants`)

1.  **Client:** Sends request to the API Gateway's public URL.
2.  **API Gateway (`src/app.ts`):** Receives request, applies global middleware, identifies the target service (`restaurant-service` based on `/api/restaurants` path), and forwards the request internally (e.g., via HTTP proxy).
3.  **Restaurant Service (`services/restaurant-service/src/app.ts`):** Receives forwarded request, applies service-specific middleware.
4.  **Restaurant Router (`.../routes/restaurant.routes.ts`):** Matches the route (`GET /`) and calls the controller function.
5.  **Restaurant Controller (`.../controllers/RestaurantController.ts`):** Executes `getRestaurants` function, calls the model to fetch data.
6.  **Restaurant Model (`.../models/Restaurant.ts`):** Interacts with MongoDB via Mongoose to retrieve restaurant documents.
7.  **Response:** Data flows back through Controller -> Service App -> API Gateway -> Client.

## Adding a New Feature (Example: "Discounts" in `restaurant-service`)

1.  **Define Model (`.../models/Discount.ts`):** Create a Mongoose schema defining the structure of a discount (name, type, value, applicability, dates, restaurantId, etc.).
2.  **Create Controller (`.../controllers/DiscountController.ts`):** Implement CRUD functions (`createDiscount`, `getAllDiscounts`, `getDiscountById`, `updateDiscount`, `deleteDiscount`) using the `Discount` model to interact with the database. Handle request/response logic.
3.  **Define Routes (`.../routes/discount.routes.ts`):** Create an Express router, define endpoints (e.g., `POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`), and map them to the controller functions. Include necessary middleware (e.g., authentication, permission checks).
4.  **Register Routes (`.../src/app.ts` in `restaurant-service`):** Import the discount router and mount it under a base path (e.g., `app.use('/api/discounts', discountRoutes)`).
5.  **API Gateway Routing (`Inseat-backend/src/app.ts`):** Ensure the gateway is configured to forward requests matching the new base path (e.g., `/api/discounts`) to the `restaurant-service`.
6.  **Permissions (Auth Service):** If/when RBAC is fully implemented, define relevant permissions (e.g., `create:discount`) in the `auth-service` and assign them to appropriate roles. Update middleware checks in the discount routes. Currently, permission checks might be bypassed or non-functional.

This microservices approach allows for independent development, deployment, and scaling of different parts of the backend system.

## Current Implementation Status

*   **RBAC (Role-Based Access Control):** The `auth-service` contains files related to roles and permissions, but the end-to-end enforcement via middleware might not be fully implemented or integrated across all services.
*   **Live Orders / WebSockets:** The `order-service` includes WebSocket-related files (`WebSocketServer.ts`, `WebSocketService.ts`), but the real-time functionality for live order updates is likely incomplete.
*   **Inter-service Communication:** RabbitMQ setup exists (`utils/rabbitmq.ts`), but its usage for specific event-driven workflows between services might not be fully implemented yet.