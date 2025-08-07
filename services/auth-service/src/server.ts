/**
 * AUTH SERVICE
 * 
 * This file only exports the necessary components for use by the main app.ts
 * running on port 3001. It does not create its own server or handle its own
 * database connections.
 * 
 * IMPORTANT ARCHITECTURE NOTES:
 * - This service is designed to be a module of the main application
 * - It MUST NOT establish its own MongoDB connection
 * - It MUST use the shared connection from main app.ts
 * - It MUST NOT configure or start its own server
 * 
 * Main app.ts is responsible for:
 * - Server creation and port configuration
 * - MongoDB connection establishment and management
 * - Middleware setup (CORS, body parsing, etc.)
 * - Global error handling
 * - Route mounting and API path configuration
 * 
 * This architecture prevents connection pool exhaustion and ensures
 * consistent database access across all services.
 */

import express from 'express';
import { seedRolesAndPermissions } from './seed';
import { initializePassport } from './config/passport';

// Import routes for export
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import roleRoutes from './routes/roleRoutes';
import permissionRoutes from './routes/permissionRoutes';
import demoRoutes from './routes/demoRoutes';
import passwordSetupRoutes from './routes/passwordSetupRoutes';
import customerRoutes from './routes/customerRoutes';
import businessAdminRoutes from './routes/businessAdminRoutes';
import permissionMatrixRoutes from './routes/permissionMatrixRoutes';

// Export all necessary components
export { 
  authRoutes, 
  adminRoutes,
  roleRoutes,
  permissionRoutes,
  demoRoutes,
  passwordSetupRoutes,
  customerRoutes,
  businessAdminRoutes,
  permissionMatrixRoutes,
  seedRolesAndPermissions,
  initializePassport
};
// Create a minimal app instance just for exports
const app = express();

// Export the app instance for use in the main application
// This allows the main app to mount these routes
export default app;
