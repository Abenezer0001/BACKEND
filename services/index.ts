import { Router } from 'express';
import restaurantRoutes from './restaurant-service/src/routes/restaurant.routes';
import tableRoutes from './restaurant-service/src/routes/table.routes';
import venueRoutes from './restaurant-service/src/routes/venue.routes';
import menuRoutes from './restaurant-service/src/routes/menu.routes';
import zoneRoutes from './restaurant-service/src/routes/zone.routes';
import categoryRoutes from './restaurant-service/src/routes/category.routes';
import modifierRoutes from './restaurant-service/src/routes/modifier.routes';
import businessRoutes from './restaurant-service/src/routes/business.routes'; // NEW: Business routes
import promotionRoutes from './restaurant-service/src/routes/promotion.routes'; // NEW: Customer-facing promotion routes
import adminPromotionRoutes from './restaurant-service/src/routes/adminPromotion.routes'; // NEW: Admin promotion routes
import debugPromotionRoutes from './restaurant-service/src/routes/debugPromotions.routes'; // NEW: Debug promotion routes
import scheduleRoutes from './restaurant-service/src/routes/scheduleRoutes'; // NEW: Schedule routes
import waiterCallRoutes from './restaurant-service/src/routes/waiterCall.routes'; // NEW: Waiter call routes
import { createOrderRoutes } from './order-service/src/routes/orderRoutes';
import webSocketService from './order-service/src/services/WebSocketService';
import authRoutes from './auth-service/src/routes/authRoutes';
import roleRoutes from './auth-service/src/routes/roleRoutes';
import permissionRoutes from './auth-service/src/routes/permissionRoutes';
import userRoleAssignmentRoutes from './auth-service/src/routes/userRoleAssignmentRoutes'; // NEW: User role assignment routes
import kitchenRoutes from './auth-service/src/routes/kitchenRoutes'; // NEW: Kitchen routes
import cashierRoutes from './auth-service/src/routes/cashierRoutes'; // NEW: Cashier routes
import tableTypeRoutes from './restaurant-service/src/routes/tableType.routes';
import subCategoryRoutes from './restaurant-service/src/routes/subCategory.routes'; // Added import
import subSubCategoryRoutes from './restaurant-service/src/routes/subSubCategory.routes'; // Added import
import menuItemRoutes from './restaurant-service/src/routes/menuItem.routes'; // Added MenuItem routes import
import { TableController } from './restaurant-service/src/controllers/TableController';
import demoRoutes from './auth-service/src/routes/demoRoutes';
// Import payment routes for Stripe integration
import paymentRoutes from './payment-service/routes/paymentRoutes';
// Import Stripe Connect routes
import stripeConnectRoutes from './payment-service/routes/stripeConnectBusinessRoutes';
// Import payment controller functions for direct handling if needed
import { handleWebhook, checkSessionStatus } from './payment-service/controllers/paymentController';
// Import Socket.IO instance directly from our socket singleton
import { getSocketIO } from '../src/socketio';
// Import AI service routes and initialization function
// import aiServiceRoutes, { initializeAIService } from './ai-service/src/index';
// Import loyalty service routes
// import loyaltyRoutes from './loyalty-service/src/routes/loyaltyRoutes';
// Import both flexible and optional authentication middleware
import { authenticateFlexible, authenticateOptional } from './auth-service/src/middleware/auth';
// Import group ordering service routes
// import groupOrderRoutes from './group-ordering-service/src/routes/groupOrderRoutes';
// Import inventory service initialization function
import { initializeInventoryService } from './inventory-service/src/server';
// Import analytics service
// import analyticsRoutes from './analytics-service/src/routes/analyticsRoutes';
// import { initializeAnalyticsService } from './analytics-service/src/server';
// Import cash payment routes
import cashPaymentRoutes from './restaurant-service/src/routes/cashPayment.routes'; // NEW: Cash payment routes       

const router: Router = Router();
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

// Create a router for restaurant service routes
const restaurantServiceRouter: Router = Router();
router.use('/restaurant-service', restaurantServiceRouter as unknown as Router);

// Use authenticateOptional for public menu browsing routes
router.use('/table-types', authenticateOptional, tableTypeRoutes as unknown as Router);
router.use('/menus', authenticateOptional, menuRoutes as unknown as Router);
router.use('/zones', authenticateOptional, zoneRoutes as unknown as Router);
router.use('/categories', authenticateOptional, categoryRoutes as unknown as Router);
router.use('/subcategories', authenticateOptional, subCategoryRoutes as unknown as Router);
router.use('/subsubcategories', authenticateOptional, subSubCategoryRoutes as unknown as Router);
router.use('/menu-items', authenticateOptional, menuItemRoutes as unknown as Router);
router.use('/modifiers', authenticateOptional, modifierRoutes as unknown as Router);

// Venues and tables support public access for menu browsing
router.use('/venues', authenticateOptional, venueRoutes as unknown as Router);

// Critical: table verification should work without authentication
router.use('/tables', authenticateOptional, tableRoutes as unknown as Router);

// NEW: Waiter call routes - allow guest users to create calls
router.use('/waiter-calls', authenticateOptional, waiterCallRoutes as unknown as Router);

// NEW: Cash payment routes
router.use('/cash-payments', authenticateOptional, cashPaymentRoutes as unknown as Router);

// NEW: Group ordering routes
// router.use('/group-orders', authenticateOptional, groupOrderRoutes as unknown as Router);

// NEW: Mount business routes
router.use('/', businessRoutes as unknown as Router); // For /api/admin/businesses/* and /api/businesses/* endpoints

// NEW: Mount promotion routes  
router.use('/promotions', promotionRoutes as unknown as Router); // Customer-facing promotion routes at /api/promotions/*
router.use('/admin/promotions', adminPromotionRoutes as unknown as Router); // Admin promotion routes at /api/admin/promotions/*
router.use('/debug/promotions', debugPromotionRoutes as unknown as Router); // Debug promotion routes at /api/debug/promotions/*

// Direct handler for restaurant-specific tables endpoint - bypasses router nesting issues
router.get('/restaurants/:restaurantId/tables', async (req, res) => {
  console.log('Direct handler for GET /restaurants/:restaurantId/tables');
  const { restaurantId } = req.params;
  console.log('Direct handler restaurantId:', restaurantId);
  
  try {
    // Import necessary model
    const Table = require('./restaurant-service/src/models/Table').default;
    const Venue = require('./restaurant-service/src/models/Venue').default;
    
    // Find all venues for this restaurant
    const venues = await Venue.find({ restaurantId });
    const venueIds = venues.map(venue => venue._id.toString());
    console.log(`Found ${venues.length} venues for restaurantId ${restaurantId}:`, venueIds);
    
    // Query tables that have either the restaurantId OR belong to any venue of this restaurant
    const tables = await Table.find({
      $or: [
        { restaurantId },
        { venueId: { $in: venueIds } }
      ]
    }).populate('tableTypeId');
    
    console.log(`Found ${tables.length} tables directly for restaurantId: ${restaurantId}`);
    res.status(200).json(tables);
  } catch (error: any) {
    console.error('Error in direct tables handler:', error);
    // Return empty array instead of error
    res.status(200).json([]);
  }
});

router.use('/venues/:venueId/tables', tableRoutes as unknown as Router); // For venue-specific table endpoints

// Direct handler for restaurant/venue-specific tables POST endpoint - bypasses router nesting issues
router.post('/restaurants/:restaurantId/venues/:venueId/tables', async (req, res) => {
  console.log('Direct handler for POST /restaurants/:restaurantId/venues/:venueId/tables');
  const { restaurantId, venueId } = req.params;
  console.log('Direct handler - restaurantId:', restaurantId, 'venueId:', venueId);
  
  try {
    // Import necessary models
    const Table = require('./restaurant-service/src/models/Table').default;
    
    // Extract data from request body
    const tableData = req.body;
    console.log('Request body:', tableData);
    
    // Set restaurantId and venueId from URL params
    tableData.restaurantId = restaurantId;
    tableData.venueId = venueId;
    
    // Create the table directly
    const newTable = new Table(tableData);
    const savedTable = await newTable.save();
    console.log('Successfully created table:', savedTable._id);
    
    res.status(201).json(savedTable);
  } catch (error: any) {
    console.error('Error in direct tables POST handler:', error);
    res.status(500).json({ error: error.message || 'Error creating table' });
  }
});

// Direct handler for QR code endpoint to avoid validation errors causing page crash
router.get('/restaurants/:restaurantId/venues/:venueId/tables/:tableId/qrcode', async (req, res) => {
  console.log('Direct handler for GET QR code endpoint');
  const { restaurantId, venueId, tableId } = req.params;
  console.log(`QR code request for table: ${tableId}`);
  
  try {
    // Import required models
    const Table = require('./restaurant-service/src/models/Table').default;
    const QRCode = require('qrcode');
    
    // Find the table directly without restaurant validation
    const table = await Table.findById(tableId);
    
    if (!table) {
      console.log(`Table not found: ${tableId}`);
      res.status(404).json({ error: 'Table not found' });
      return;
    }
    
    // Check if QR code exists
    if (table.qrCode) {
      console.log('Returning existing QR code');
      res.json({ qrCode: table.qrCode });
      return;
    }
    
    // Generate new QR code if doesn't exist
    console.log('Generating new QR code');
    const baseUrl = 'http://localhost:8080'; // Customer-facing URL
    const qrData = {
      tableId: table._id.toString(),
      number: table.number,
      url: `${baseUrl}?table=${table._id.toString()}`
    };
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
    
    // Save to table
    table.qrCode = qrCode;
    await table.save();
    
    res.json({ qrCode });
  } catch (error: any) {
    console.error('Error in direct QR code handler:', error);
    res.status(500).json({ error: error.message || 'Error generating QR code' });
  }
});

// Direct handler for venue-specific tables
router.get('/restaurants/:restaurantId/venues/:venueId/tables', async (req, res) => {
  console.log('Direct handler for GET venue-specific tables endpoint');
  const { restaurantId, venueId } = req.params;
  console.log(`Getting tables for venue: ${venueId} in restaurant: ${restaurantId}`);
  
  try {
    // Import required models
    const Table = require('./restaurant-service/src/models/Table').default;
    
    // Find tables for this venue with populated tableTypeId
    const tables = await Table.find({ venueId, restaurantId }).populate('tableTypeId');
    console.log(`Found ${tables.length} tables for venue ${venueId}`);
    
    res.json(tables);
  } catch (error: any) {
    console.error('Error in direct venue-specific tables handler:', error);
    res.status(500).json({ error: error.message || 'Error getting tables for venue' });
  }
});

// Also handle POST requests for QR code generation
router.post('/restaurants/:restaurantId/venues/:venueId/tables/:tableId/qrcode', async (req, res) => {
  console.log('Direct handler for POST QR code endpoint');
  const { restaurantId, venueId, tableId } = req.params;
  console.log(`QR code generation request for table: ${tableId}`);
  
  try {
    // Import required models
    const Table = require('./restaurant-service/src/models/Table').default;
    const QRCode = require('qrcode');
    
    // Find the table directly without restaurant validation
    const table = await Table.findById(tableId);
    
    if (!table) {
      console.log(`Table not found: ${tableId}`);
      res.status(404).json({ error: 'Table not found' });
      return;
    }
    
    // Generate new QR code
    console.log('Generating new QR code');
    const baseUrl = 'https://menu.inseat.achievengine.com'; // Customer-facing URL
    const qrData = {
      tableId: table._id.toString(),
      number: table.number,
      url: `${baseUrl}?table=${table._id.toString()}`
    };
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
    
    // Save to table
    table.qrCode = qrCode;
    await table.save();
    
    res.json({ qrCode });
  } catch (error: any) {
    console.error('Error in direct QR code handler:', error);
    res.status(500).json({ error: error.message || 'Error generating QR code' });
  }
});

// Catch-all for nested routes not handled by direct handlers
router.use('/restaurants/:restaurantId/venues/:venueId/tables', tableRoutes as unknown as Router);

// Mount restaurant routes
router.use('/restaurants', restaurantRoutes as unknown as Router);

// Direct handler for restaurant-specific table-types endpoint - bypasses router nesting issues
router.get('/restaurants/:restaurantId/table-types', async (req, res) => {
  console.log('Direct handler for GET /restaurants/:restaurantId/table-types');
  const { restaurantId } = req.params;
  console.log('Direct handler restaurantId for table-types:', restaurantId);
  
  try {
    // Import necessary model
    const TableType = require('./restaurant-service/src/models/TableType').default;
    
    // Direct database query - no validation
    const tableTypes = await TableType.find({ restaurantId });
    console.log(`Found ${tableTypes.length} table types directly for restaurantId: ${restaurantId}`);
    res.status(200).json(tableTypes);
  } catch (error: any) {
    console.error('Error in direct table-types handler:', error);
    // Return empty array instead of error
    res.status(200).json([]);
  }
});

// Order-related routes
router.use('/orders', createOrderRoutes(webSocketService) as unknown as Router); // Pass WebSocketService instance

// Auth-related routes
router.use('/auth', authRoutes as unknown as Router);
router.use('/auth/roles', roleRoutes as unknown as Router);
router.use('/auth/permissions', permissionRoutes as unknown as Router);
router.use('/auth', userRoleAssignmentRoutes as unknown as Router); // NEW: User role assignment routes

// NEW: Kitchen, Cashier, and Schedule Management routes
router.use('/kitchens', kitchenRoutes as unknown as Router); // Kitchen management routes at /api/kitchens/*
router.use('/cashiers', cashierRoutes as unknown as Router); // Cashier management routes at /api/cashiers/*
router.use('/schedules', scheduleRoutes as unknown as Router); // Schedule management routes at /api/schedules/*

// AI Service routes
// router.use('/ai', aiServiceRoutes as unknown as Router);

// Loyalty Service routes
// router.use('/loyalty', authenticateFlexible, loyaltyRoutes as unknown as Router);

// Demo routes
router.use('/demo', demoRoutes as unknown as Router);

// Payment routes - mount at both paths to support frontend requests with and without the /api prefix

// Payment routes without /api prefix (direct access)
router.use('/payments', paymentRoutes as unknown as Router);

// Also mount the same routes directly for access without the /api prefix
// These session status endpoints handle requests like http://localhost:3001/payments/sessions/:sessionId
// IMPORTANT: Do not require authentication for these routes as they're accessed after Stripe redirect
router.get('/payments/sessions/:sessionId', (req, res, next) => {
  console.log('Session status check via direct route (no auth):', req.params.sessionId);
  // Add a dummy user to satisfy any user checks in the controller
  (req as any).user = { authenticated: true };
  // Forward to the controller
  checkSessionStatus(req, res, next);
});

router.get('/payments/check-session/:sessionId', (req, res, next) => {
  console.log('Session status check via alternative direct route (no auth):', req.params.sessionId);
  // Add a dummy user to satisfy any user checks in the controller
  (req as any).user = { authenticated: true };
  // Forward to the controller
  checkSessionStatus(req, res, next);
});

// Add direct webhook handlers as a fallback
router.post('/payments/webhook', (req, res, next) => {
  console.log('Webhook received through service routes');
  handleWebhook(req, res, next);
});

console.log('Payment routes registered with multiple path formats for maximum compatibility');

// Stripe Connect routes
router.use('/stripe-connect', stripeConnectRoutes as unknown as Router);
console.log('Stripe Connect routes registered at /api/stripe-connect');

// Analytics service routes
// router.use('/analytics', authenticateOptional, analyticsRoutes as unknown as Router);

// Inventory service - using proper initializeInventoryService() from app.ts
// Routes will be mounted via initializeInventoryService() function at /api/inventory/*

// Add direct handlers for table endpoints that need to be accessible at the root API level
router.get('/tables/filtered', async (req, res) => {
  console.log('Direct handler for GET /tables/filtered');
  console.log('Query params:', req.query);
  
  try {
    const Table = require('./restaurant-service/src/models/Table').default;
    const { restaurantId, venueId } = req.query;
    
    let query: any = {};
    
    if (restaurantId && restaurantId !== 'all') {
      query.restaurantId = restaurantId;
    }
    
    if (venueId && venueId !== 'all') {
      query.venueId = venueId;
    }
    
    const tables = await Table.find(query).populate('tableTypeId');
    console.log(`Found ${tables.length} filtered tables`);
    
    res.json(tables);
  } catch (error: any) {
    console.error('Error in tables filtered handler:', error);
    res.status(500).json({ error: error.message || 'Error getting filtered tables' });
  }
});

// Add direct handler for getting table by ID at restaurant-service level
router.get('/restaurant-service/tables/:tableId', async (req, res) => {
  console.log('Direct handler for GET /restaurant-service/tables/:tableId');
  const { tableId } = req.params;
  console.log('Getting table by ID:', tableId);
  
  try {
    const Table = require('./restaurant-service/src/models/Table').default;
    
    if (!require('mongoose').Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({ error: 'Invalid table ID format' });
    }
    
    const table = await Table.findById(tableId).populate('tableTypeId').populate('venueId');
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    res.json(table);
  } catch (error: any) {
    console.error('Error in get table by ID handler:', error);
    res.status(500).json({ error: error.message || 'Error getting table' });
  }
});

// Add direct handler for table occupied status update
router.patch('/tables/:tableId/occupied', async (req, res) => {
  console.log('Direct handler for PATCH /tables/:tableId/occupied');
  const { tableId } = req.params;
  const { isOccupied } = req.body;
  console.log(`Updating table ${tableId} occupied status to ${isOccupied}`);
  
  try {
    // Import required models
    const Table = require('./restaurant-service/src/models/Table').default;
    
    if (!require('mongoose').Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({ error: 'Invalid table ID format' });
    }
    
    if (typeof isOccupied !== 'boolean') {
      return res.status(400).json({ error: 'isOccupied must be a boolean value' });
    }
    
    const table = await Table.findByIdAndUpdate(
      tableId,
      { isOccupied },
      { new: true }
    );
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    console.log(`Successfully updated table ${tableId} occupied status to ${isOccupied}`);
    res.json(table);
  } catch (error: any) {
    console.error('Error updating table occupied status:', error);
    res.status(500).json({ error: error.message || 'Error updating table occupied status' });
  }
});

// Direct handler for table verification with proper schedule enforcement
router.get('/tables/:tableId/verify', async (req, res) => {
  console.log('Direct handler for GET /tables/:tableId/verify');
  const { tableId } = req.params;
  console.log(`Verifying table with ID: ${tableId}`);
  
  try {
    const mongoose = require('mongoose');
    const Table = require('./restaurant-service/src/models/Table').default;
    const Schedule = require('./restaurant-service/src/models/Schedule').default;
    
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({ error: 'Invalid table ID format' });
    }

    // Default response structure
    const response: any = {
      exists: false,
      isAvailable: false,
      venue: undefined,
      table: undefined
    };

    // Find the table and populate venue information
    const table = await Table.findById(tableId).populate('venueId').exec();

    // If table doesn't exist, return the default response
    if (!table) {
      console.log(`Table not found with ID: ${tableId}`);
      return res.status(200).json(response);
    }

    // Update response with table existence
    response.exists = true;
    
    // Check if table is active
    let isAvailable = table.isActive;
    
    // Include table and venue information if table exists
    response.table = {
      _id: table._id,
      number: table.number,
      capacity: table.capacity,
      isOccupied: table.isOccupied,
      isActive: table.isActive
    };

    // Include venue information if available
    if (table.venueId) {
      const venue = table.venueId; // Cast to any to access populated fields
      response.venue = {
        _id: venue._id,
        name: venue.name,
        description: venue.description || '',
        restaurantId: venue.restaurantId
      };

      // Check restaurant schedule if table is active
      console.log(`🔍 DEBUG: isAvailable=${isAvailable}, venue.restaurantId=${venue.restaurantId}`);
      console.log(`🔍 DEBUG: Condition result: ${isAvailable && venue.restaurantId}`);
      console.log(`🔍 DEBUG: typeof venue.restaurantId: ${typeof venue.restaurantId}`);
      console.log(`🔍 DEBUG: venue object:`, JSON.stringify(venue, null, 2));
      console.log(`🔍 DEBUG: About to check venue.restaurantId condition...`);
      
      // FORCE schedule check - restaurant schedule takes priority over everything
      if (venue.restaurantId) {
        console.log(`🔍 DEBUG: Inside venue.restaurantId condition!`);
        try {
          console.log(`\n=== RESTAURANT SCHEDULE CHECK ===`);
          console.log(`Checking schedules for restaurant: ${venue.restaurantId}`);
          
          // Find active restaurant schedule
          const restaurantSchedule = await Schedule.findOne({
            scheduleType: 'RESTAURANT',
            restaurantId: venue.restaurantId,
            status: 'ACTIVE',
            isActive: true
          });

          console.log(`Restaurant schedule found:`, restaurantSchedule ? {
            id: restaurantSchedule._id,
            name: restaurantSchedule.name,
            status: restaurantSchedule.status,
            isActive: restaurantSchedule.isActive,
            dailyScheduleLength: restaurantSchedule.dailySchedule?.length
          } : 'None');

          if (restaurantSchedule) {
            console.log(`Calling isCurrentlyActive() on restaurant schedule...`);
            const isRestaurantOpen = restaurantSchedule.isCurrentlyActive();
            console.log(`Restaurant schedule result: ${isRestaurantOpen}`);
            
            // RESTAURANT SCHEDULE TAKES ABSOLUTE PRIORITY
            if (!isRestaurantOpen) {
              isAvailable = false;
              console.log(`❌ Table ${tableId} not available - RESTAURANT IS CLOSED (priority rule)`);
              // Skip venue schedule check - restaurant schedule overrides everything
              return res.status(200).json({...response, isAvailable: false});
            } else {
              console.log(`✅ Restaurant is open according to schedule - checking venue schedule`);
            }
          } else {
            // If no active restaurant schedule is found, check if restaurant has any schedules
            console.log(`No active restaurant schedule found, checking for any schedules...`);
            const anyRestaurantSchedule = await Schedule.findOne({
              scheduleType: 'RESTAURANT',
              restaurantId: venue.restaurantId
            });
            
            console.log(`Any restaurant schedule found:`, anyRestaurantSchedule ? {
              id: anyRestaurantSchedule._id,
              name: anyRestaurantSchedule.name,
              status: anyRestaurantSchedule.status,
              isActive: anyRestaurantSchedule.isActive
            } : 'None');
            
            if (anyRestaurantSchedule) {
              // Restaurant has schedules but none are active, so it should be considered closed
              isAvailable = false;
              console.log(`❌ Table ${tableId} not available - restaurant has schedules but none are active`);
            } else {
              console.log(`✅ No restaurant schedules found - assuming always open`);
            }
            // If restaurant has no schedules at all, assume it's always open (default behavior)
          }

          // Also check venue-specific schedule
          const venueSchedule = await Schedule.findOne({
            scheduleType: 'VENUE',
            venueId: venue._id,
            status: 'ACTIVE',
            isActive: true
          });

          if (venueSchedule) {
            const isVenueOpen = venueSchedule.isCurrentlyActive();
            console.log(`Venue schedule check for ${venue._id}: ${isVenueOpen}`);
            
            // If venue is closed according to schedule, table is not available
            if (!isVenueOpen) {
              isAvailable = false;
              console.log(`Table ${tableId} not available - venue is closed according to schedule`);
            }
          } else {
            // Check if venue has any schedules
            const anyVenueSchedule = await Schedule.findOne({
              scheduleType: 'VENUE',
              venueId: venue._id
            });
            
            if (anyVenueSchedule) {
              // Venue has schedules but none are active, so it should be considered closed
              isAvailable = false;
              console.log(`Table ${tableId} not available - venue has schedules but none are active`);
            }
          }
        } catch (scheduleError) {
          console.error('Error checking restaurant/venue schedule:', scheduleError);
          // Don't fail the entire request due to schedule check error
          // Just log it and continue with table availability
        }
      }
    }
    
    // Set final availability
    response.isAvailable = isAvailable;

    console.log(`Table verification complete for ID: ${tableId}, isAvailable: ${response.isAvailable}`);
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error verifying table:', error);
    res.status(500).json({ error: error.message || 'Error verifying table' });
  }
});

export default router;

// Export AI service initialization function for use in main app
// export { initializeAIService };

// Export analytics service initialization function for use in main app
// export { initializeAnalyticsService };

// Export inventory service initialization function for use in main app
export { initializeInventoryService };
