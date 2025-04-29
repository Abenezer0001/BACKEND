import { Router } from 'express';
import restaurantRoutes from './restaurant-service/src/routes/restaurant.routes';
import tableRoutes from './restaurant-service/src/routes/table.routes';
import venueRoutes from './restaurant-service/src/routes/venue.routes';
import menuRoutes from './restaurant-service/src/routes/menu.routes';
import zoneRoutes from './restaurant-service/src/routes/zone.routes';
import categoryRoutes from './restaurant-service/src/routes/category.routes';
import modifierRoutes from './restaurant-service/src/routes/modifier.routes';
import { createOrderRoutes } from './order-service/src/routes/orderRoutes';
import webSocketService from './order-service/src/services/WebSocketService';
import authRoutes from './auth-service/src/routes/authRoutes';
import roleRoutes from './auth-service/src/routes/roleRoutes';
import permissionRoutes from './auth-service/src/routes/permissionRoutes';
import tableTypeRoutes from './restaurant-service/src/routes/tableType.routes';
import subCategoryRoutes from './restaurant-service/src/routes/subCategory.routes'; // Added import
import subSubCategoryRoutes from './restaurant-service/src/routes/subSubCategory.routes'; // Added import
import menuItemRoutes from './restaurant-service/src/routes/menuItem.routes'; // Added MenuItem routes import
import { TableController } from './restaurant-service/src/controllers/TableController';
import demoRoutes from './auth-service/src/routes/demoRoutes';
// Import Socket.IO instance directly from our socket singleton
import { getSocketIO } from '../src/socketio';

const router = Router();
const tableController = new TableController();

// Debug middleware for restaurants/:restaurantId/tables route
const debugMiddleware = (req, res, next) => {
  console.log('Restaurant Tables Route:', {
    method: req.method,
    path: req.path,
    url: req.url,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    params: req.params,
    body: req.body
  });
  next();
};

// Get the singleton Socket.IO instance
const io = getSocketIO();

// Debug IO object
console.log('IO object in services/index.ts:', io ? 'Defined' : 'Undefined', io);

// Initialize the WebSocketService with the io object if it exists
if (io) {
  webSocketService.initialize(io);
} else {
  console.warn('Socket.IO is not initialized yet. WebSocketService will have limited functionality.');
}

// Pass the initialized io object from app.ts to the route creation function
router.use('/restaurants', restaurantRoutes);
router.use('/table-types', tableTypeRoutes);
router.use('/tables', tableRoutes);
// Add a route for frontend compatibility
router.use('/restaurant', tableRoutes);
router.use('/venues', venueRoutes);
router.use('/menus', menuRoutes);
router.use('/zones', zoneRoutes);
router.use('/categories', categoryRoutes);
router.use('/modifiers', modifierRoutes);
router.use('/orders', createOrderRoutes(webSocketService)); // Pass WebSocketService instance
router.use('/auth', authRoutes);
router.use('/auth/roles', roleRoutes);
router.use('/auth/permissions', permissionRoutes);
router.use('/subcategories', subCategoryRoutes); // Added route
router.use('/subsubcategories', subSubCategoryRoutes); // Added route
router.use('/menu-items', menuItemRoutes); // Added MenuItem route
router.use('/demo', demoRoutes); // Add demo routes

export default router;
