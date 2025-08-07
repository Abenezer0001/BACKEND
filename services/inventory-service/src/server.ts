import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import compression from 'compression'; // Not available
import rateLimit from 'express-rate-limit';

// Import all route modules
import recipeRoutes from './routes/recipeRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import supplierRoutes from './routes/supplierRoutes';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import wasteRoutes from './routes/wasteRoutes';

// Import legacy routes for backward compatibility
import ingredientRoutes from './routes/ingredientRoutes';
import stockRoutes from './routes/stockRoutes';

// Import middleware locally to avoid cross-service dependencies
import { authenticateFlexible } from './middleware/auth';

const app = express();

// Security middleware
app.use(helmet());
// app.use(compression()); // Not available

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Authentication middleware (flexible auth from main app)
app.use(authenticateFlexible);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Recipe & Inventory Management System',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'Recipe Management',
      'Inventory Tracking',
      'Supplier Management',
      'Purchase Orders',
      'Cost Analysis',
      'Waste Tracking',
      'Analytics & Reporting'
    ]
  });
});

// API Documentation endpoint
app.get('/api-docs', (req, res) => {
  res.status(200).json({
    title: 'Recipe & Inventory Management System API',
    version: '1.0.0',
    description: 'Comprehensive Recipe and Inventory Management system that integrates with the INSEAT platform',
    baseUrl: '/api/inventory',
    endpoints: {
      recipes: {
        description: 'Recipe management with versioning, costing, and yield tracking',
        routes: [
          'GET /recipes - List all recipes',
          'POST /recipes - Create new recipe',
          'GET /recipes/:id - Get recipe details',
          'PUT /recipes/:id - Update recipe',
          'DELETE /recipes/:id - Delete recipe',
          'GET /recipes/:id/cost - Get recipe cost analysis',
          'POST /recipes/:id/scale - Scale recipe quantities'
        ]
      },
      inventory: {
        description: 'Inventory management with real-time tracking and alerts',
        routes: [
          'GET /inventory - List inventory items',
          'POST /inventory - Create inventory item',
          'GET /inventory/low-stock - Get low stock alerts',
          'POST /inventory/:id/stock/adjust - Adjust stock levels'
        ]
      },
      suppliers: {
        description: 'Supplier management and performance tracking',
        routes: [
          'GET /suppliers - List suppliers',
          'POST /suppliers - Create supplier',
          'GET /suppliers/:id/performance - Get supplier performance'
        ]
      },
      purchaseOrders: {
        description: 'Purchase order management and workflow',
        routes: [
          'GET /purchase-orders - List purchase orders',
          'POST /purchase-orders - Create purchase order',
          'POST /purchase-orders/:id/approve - Approve order'
        ]
      },
      analytics: {
        description: 'Comprehensive analytics and reporting',
        routes: [
          'GET /analytics/inventory/value - Inventory valuation',
          'GET /analytics/cost-trends - Cost trend analysis',
          'GET /analytics/profitability/menu-items - Profitability analysis'
        ]
      },
      waste: {
        description: 'Waste tracking and prevention',
        routes: [
          'GET /waste - List waste records',
          'POST /waste - Record waste',
          'GET /waste/analytics/trends - Waste trend analysis'
        ]
      }
    }
  });
});

// Mount route modules with proper prefixes
app.use('/recipes', recipeRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/purchase-orders', purchaseOrderRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/waste', wasteRoutes);

// Legacy routes for backward compatibility
app.use('/ingredients', ingredientRoutes);
app.use('/stock', stockRoutes);

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Inventory service error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      '/health - Health check',
      '/api-docs - API documentation',
      '/recipes - Recipe management',
      '/inventory - Inventory management',
      '/suppliers - Supplier management',
      '/purchase-orders - Purchase order management',
      '/analytics - Analytics and reporting',
      '/waste - Waste tracking'
    ]
  });
});

// Export the app for integration with the main INSEAT application
export default app;

// Export initialization function for integration
export const initializeInventoryService = (mainApp: express.Application, io: any) => {
  // Mount the inventory service under /api/inventory prefix
  mainApp.use('/api/inventory', app);
  
  // Set up real-time notifications for inventory events
  if (io) {
    // Stock level alerts
    app.locals.io = io;
    
    // Emit stock alerts to connected clients
    app.locals.emitStockAlert = (restaurantId: string, alert: any) => {
      io.to(`restaurant_${restaurantId}`).emit('stockAlert', alert);
    };
    
    // Emit cost variance alerts
    app.locals.emitCostAlert = (restaurantId: string, alert: any) => {
      io.to(`restaurant_${restaurantId}`).emit('costAlert', alert);
    };
    
    // Emit waste alerts
    app.locals.emitWasteAlert = (restaurantId: string, alert: any) => {
      io.to(`restaurant_${restaurantId}`).emit('wasteAlert', alert);
    };
  }
  
  console.log('✅ Recipe & Inventory Management System initialized successfully');
  console.log('📦 Available endpoints:');
  console.log('   - /api/inventory/recipes - Recipe management');
  console.log('   - /api/inventory/inventory - Inventory tracking');
  console.log('   - /api/inventory/suppliers - Supplier management');
  console.log('   - /api/inventory/purchase-orders - Purchase orders');
  console.log('   - /api/inventory/analytics - Analytics & reporting');
  console.log('   - /api/inventory/waste - Waste tracking');
  console.log('🔗 Integration features:');
  console.log('   - Real-time stock alerts via WebSocket');
  console.log('   - Cost variance notifications');
  console.log('   - Waste prevention alerts');
  console.log('   - Menu item cost integration');
};

export { app as inventoryServiceApp };
