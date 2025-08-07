import { Router, Request, Response, NextFunction } from 'express';
import { TableController } from '../controllers/TableController';
import Table, { ITableFilterParams } from '../models/Table';

// Simple rate limiting for QR code operations
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const router = Router();
const controller = new TableController();

// Debug middleware
const debugMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  console.log('Table Route:', {
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

// Validation middleware
const validateIds = (req: Request, res: Response, next: NextFunction): void => {
  const { restaurantId, venueId, tableId } = req.params;
  
  if (restaurantId && !(/^[0-9a-fA-F]{24}$/).test(restaurantId)) {
    res.status(400).json({ error: 'Invalid restaurant ID format' });
    return;
  }
  
  if (venueId && !(/^[0-9a-fA-F]{24}$/).test(venueId)) {
    res.status(400).json({ error: 'Invalid venue ID format' });
    return;
  }
  
  if (tableId && !(/^[0-9a-fA-F]{24}$/).test(tableId)) {
    res.status(400).json({ error: 'Invalid table ID format' });
    return;
  }
  
  next();
};

// Validate query parameters for filtered tables
const validateFilterParams = (req: Request, res: Response, next: NextFunction): void => {
  const { 
    restaurantId, 
    venueId, 
    includeInactive, 
    includeMetadata, 
    isActive, 
    isOccupied,
    sortBy,
    limit,
    page
  } = req.query;
  
  // Check restaurantId format if provided
  if (restaurantId && typeof restaurantId === 'string' && !(/^[0-9a-fA-F]{24}$/).test(restaurantId)) {
    res.status(400).json({ error: 'Invalid restaurant ID format in query parameters' });
    return;
  }
  
  // Check venueId format if provided
  if (venueId && typeof venueId === 'string' && !(/^[0-9a-fA-F]{24}$/).test(venueId)) {
    res.status(400).json({ error: 'Invalid venue ID format in query parameters' });
    return;
  }
  
  // Convert boolean string parameters to actual booleans
  const booleanParams: Array<keyof ITableFilterParams> = ['includeMetadata', 'isActive', 'isOccupied'];
  
  // Type safety: type narrowing on the req.query object
  const queryParams = req.query as Record<string, string | boolean | number | undefined>;
  
  // Convert string boolean values to actual booleans
  booleanParams.forEach(param => {
    const value = queryParams[param];
    if (value && typeof value === 'string') {
      queryParams[param] = value.toLowerCase() === 'true';
    }
  });
  
  // Convert pagination params to numbers
  if (limit && typeof limit === 'string') {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      res.status(400).json({ error: 'Limit must be a positive number' });
      return;
    }
    queryParams.limit = limitNum;
  }
  
  if (page && typeof page === 'string') {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({ error: 'Page must be a positive number' });
      return;
    }
    queryParams.page = pageNum;
  }
  
  // Validate sortBy (if provided)
  if (sortBy && typeof sortBy === 'string') {
    const validSortFields = ['number', 'capacity', 'createdAt', 'updatedAt', 'isActive', 'isOccupied'];
    const sortParts = sortBy.split(':');
    
    if (sortParts.length > 2 || !validSortFields.includes(sortParts[0]) || 
        (sortParts.length === 2 && !['asc', 'desc'].includes(sortParts[1]))) {
      res.status(400).json({ 
        error: 'Invalid sortBy parameter. Format: field[:asc|desc]',
        validFields: validSortFields 
      });
      return;
    }
  }
  
  // Update the query parameters
  req.query = queryParams as any;
  
  next();
};

// Body validation middleware
const validateTableBody = (req: Request, res: Response, next: NextFunction): void => {
  const { number, capacity, tableTypeId } = req.body;
  
  if (!number || typeof number !== 'string') {
    res.status(400).json({ error: 'Table number is required and must be a string' });
    return;
  }
  
  // Convert capacity to number if it's a string
  const capacityNum = typeof capacity === 'string' ? parseInt(capacity, 10) : capacity;
  
  if (!capacityNum || typeof capacityNum !== 'number' || capacityNum <= 0 || isNaN(capacityNum)) {
    res.status(400).json({ error: 'Capacity is required and must be a positive number' });
    return;
  }
  
  // Update the body with the converted capacity
  req.body.capacity = capacityNum;
  
  if (!tableTypeId || typeof tableTypeId !== 'string' || !(/^[0-9a-fA-F]{24}$/).test(tableTypeId)) {
    res.status(400).json({ error: 'Table type ID is required and must be a valid MongoDB ObjectId' });
    return;
  }
  
  next();
};

// Rate limiting middleware for QR code operations
const rateLimitStore: RateLimitStore = {};
const QR_LIMIT = 10; // Maximum QR code operations per IP in the time window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute window

const rateLimitQROperations = (req: Request, res: Response, next: NextFunction): void => {
  // Get client IP
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Initialize or reset expired rate limit data
  if (!rateLimitStore[clientIp] || rateLimitStore[clientIp].resetTime < now) {
    rateLimitStore[clientIp] = {
      count: 0,
      resetTime: now + RATE_WINDOW_MS
    };
  }
  
  // Increment count
  rateLimitStore[clientIp].count++;
  
  // Check if limit exceeded
  if (rateLimitStore[clientIp].count > QR_LIMIT) {
    const resetInSec = Math.ceil((rateLimitStore[clientIp].resetTime - now) / 1000);
    res.status(429).json({ 
      error: 'Too many QR code operations',
      resetIn: `${resetInSec} seconds`
    });
    return;
  }
  
  next();
};

// Apply debug middleware to all routes
router.use(debugMiddleware);

// Table CRUD routes
/**
 * @api {get} /tables/raw Get raw table data for debugging
 * @apiName GetRawTables
 * @apiGroup Tables
 * @apiDescription Direct database access for debugging purposes only
 * @apiSuccess {Object[]} tables List of tables without relationships populated
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {
 *       "error": "Raw table query failed: Database connection error"
 *     }
 */
router.route('/raw')
  .get(controller.getRawTables.bind(controller));

/**
 * @api {get} /tables/filtered Get filtered tables
 * @apiName GetFilteredTables
 * @apiGroup Tables
 * @apiDescription Main unified endpoint for retrieving tables with flexible filtering
 * @apiParam {String} [restaurantId] Optional restaurant ID to filter by
 * @apiParam {String} [venueId] Optional venue ID to filter by
 * @apiParam {Boolean} [includeInactive=false] Whether to include inactive tables
 * @apiParam {Boolean} [includeMetadata=false] Whether to include additional metadata like QR codes
 * @apiParam {Boolean} [isActive] Filter by active status
 * @apiParam {Boolean} [isOccupied] Filter by occupied status
 * @apiParam {String} [sortBy] Field to sort by (format: field[:asc|desc])
 * @apiParam {Number} [limit=50] Maximum number of results to return
 * @apiParam {Number} [page=1] Page number for pagination
 * @apiSuccess {Object[]} tables List of filtered tables
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid restaurant ID format in query parameters"
 *     }
 */
router.route('/filtered')
  .get(validateFilterParams, controller.getFilteredTables.bind(controller));

/**
 * @api {get} /tables/:tableId Get table by ID
 * @apiName GetTableById
 * @apiGroup Tables
 * @apiDescription Get a specific table by its ID without restaurant/venue context
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object} table Table object
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Table not found"
 *     }
 */
router.route('/:tableId')
  .get(validateIds, controller.getTableById.bind(controller));

/**
 * @api {get} /tables/:tableId/verify Verify table existence and availability
 * @apiName VerifyTable
 * @apiGroup Tables
 * @apiDescription Verify if a table exists, is active, and return its venue information
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object} result Object containing table verification information
 * @apiSuccess {Boolean} result.exists Whether the table exists
 * @apiSuccess {Boolean} result.isAvailable Whether the table is available (exists and is active)
 * @apiSuccess {Object} [result.venue] Venue information if the table exists
 * @apiSuccess {Object} [result.table] Table information if the table exists
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid table ID format"
 *     }
 */
// Debug route for testing parameter capture
router.route('/test-verify/:tableId')
  .get((req: Request, res: Response) => {
    console.log('TEST ROUTE HIT - params:', req.params);
    res.json({ 
      success: true, 
      params: req.params,
      tableId: req.params.tableId,
      message: 'Test route working'
    });
  });

router.route('/:tableId/verify')
  .get(validateIds, controller.verifyTable.bind(controller));

/**
 * @api {get} /tables/:tableId/menu Get table menu
 * @apiName GetTableMenu
 * @apiGroup Tables
 * @apiDescription Get the complete menu hierarchy for a table's venue
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object} result Object containing venue and menu information
 * @apiSuccess {Object} result.venue Venue information
 * @apiSuccess {String} result.venue._id Venue ID
 * @apiSuccess {String} result.venue.name Venue name
 * @apiSuccess {String} result.venue.description Venue description
 * @apiSuccess {Object} result.menu Menu information
 * @apiSuccess {Array} result.menu.categories List of categories in the menu
 * @apiSuccess {Object} result.menu.subcategories Map of subcategories grouped by category ID
 * @apiSuccess {Array} result.menu.menuItems List of menu items
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Table not found"
 *     }
 */
router.route('/:tableId/menu')
  .get(validateIds, controller.getTableMenu.bind(controller));

/**
 * @api {get} /tables/:tableId/categories Get table categories
 * @apiName GetTableCategories
 * @apiGroup Tables
 * @apiDescription Get all categories for a table's restaurant
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object[]} categories List of categories for the table's restaurant
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Table not found"
 *     }
 */
// TODO: Implement getTableCategories method in TableController
// router.route('/tables/:tableId/categories')
//   .get(validateIds, controller.getTableCategories.bind(controller));

/**
 * @api {get} /restaurants/:restaurantId/tables Get restaurant tables
 * @apiName GetRestaurantTables
 * @apiGroup Tables
 * @apiDescription Get all tables for a specific restaurant (DEPRECATED: use /tables/filtered?restaurantId=X)
 * @apiDeprecated Use /tables/filtered with restaurantId query parameter
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiSuccess {Object[]} tables List of tables
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Restaurant not found"
 *     }
 */
router.route('/restaurants/:restaurantId/tables')
  .get((req: Request, res: Response, next: NextFunction) => {
    console.log('GET /restaurants/:restaurantId/tables endpoint called');
    console.log('Request params:', req.params);
    console.log('Route baseUrl:', req.baseUrl);
    console.log('Original URL:', req.originalUrl);
    
    // Extract restaurantId from the URL if it's in the route
    const urlParts = req.originalUrl.split('/');
    const restaurantsIndex = urlParts.findIndex(part => part === 'restaurants');
    let restaurantId;
    
    if (restaurantsIndex !== -1 && urlParts.length > restaurantsIndex + 1) {
      restaurantId = urlParts[restaurantsIndex + 1];
    } else {
      restaurantId = req.params.restaurantId;
    }
    
    console.log('Extracted restaurantId:', restaurantId);
    
    if (restaurantId) {
      // Directly query the tables with this restaurantId
      // Skip all validation and restaurant existence checks
      console.log('Direct query for tables with restaurantId:', restaurantId);
      Table.find({ restaurantId })
        .populate('tableTypeId')
        .then(tables => {
          console.log(`Found ${tables.length} tables directly for restaurantId: ${restaurantId}`);
          res.status(200).json(tables);
        })
        .catch(error => {
          console.error('Error querying tables:', error);
          // Return empty array instead of error
          res.status(200).json([]);
        });
    } else {
      // If no restaurantId parameter, return empty array
      res.status(200).json([]);
    }
  });

/**
 * @api {get} /tables/all Get all tables in a restaurant
 * @apiName GetAllRestaurantTables
 * @apiGroup Tables
 * @apiDescription Get all tables for a specific restaurant including all venues
 */
router.route('/all')
  .get(validateIds, controller.getAllForRestaurant.bind(controller));

/**
 * @api {get} /venues/:venueId/tables Get venue tables
 * @apiName GetVenueTables
 * @apiGroup Tables
 * @apiDescription Get all tables for a specific venue (DEPRECATED: use /tables/filtered?venueId=X)
 * @apiDeprecated Use /tables/filtered with venueId query parameter
 * @apiParam {String} venueId Venue's unique ID
 * @apiSuccess {Object[]} tables List of tables
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Invalid venue ID format"
 *     }
 */
router.route('/venues/:venueId/tables')
  .get(validateIds, (req: Request, res: Response, next: NextFunction) => {
    console.warn('DEPRECATED: Using /venues/:venueId/tables - Please migrate to /tables/filtered?venueId=X');
    next();
  }, controller.getTablesByVenue.bind(controller));

/**
 * @api {get} /restaurants/:restaurantId/venues/:venueId/tables Get venue tables in restaurant
 * @apiName GetRestaurantVenueTables
 * @apiGroup Tables
 * @apiDescription Get tables for a specific venue in a restaurant (DEPRECATED: use /tables/filtered)
 * @apiDeprecated Use /tables/filtered with restaurantId and venueId query parameters
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiParam {String} venueId Venue's unique ID
 * @apiSuccess {Object[]} tables List of tables
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Venue not found or does not belong to this restaurant"
 *     }
 */
router.route('/restaurants/:restaurantId/venues/:venueId/tables')
  .get(validateIds, (req: Request, res: Response, next: NextFunction) => {
    console.warn('DEPRECATED: Using /restaurants/:restaurantId/venues/:venueId/tables - Please migrate to /tables/filtered?restaurantId=X&venueId=Y');
    next();
  }, controller.getAll.bind(controller));

/**
 * @api {patch} /tables/:tableId/status Update table status
 * @apiName UpdateTableStatus
 * @apiGroup Tables
 * @apiDescription Update a table's active status
 * @apiParam {String} tableId Table's unique ID
 * @apiParam {Boolean} isActive Whether the table is active
 * @apiSuccess {Object} table Updated table object
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "isActive must be a boolean value"
 *     }
 */
router.route('/:tableId/status')
  .patch(validateIds, controller.updateStatus.bind(controller));

/**
 * @api {patch} /tables/:tableId/occupied Update table occupied status
 * @apiName UpdateTableOccupied
 * @apiGroup Tables
 * @apiDescription Update a table's occupied status (available/occupied)
 * @apiParam {String} tableId Table's unique ID
 * @apiParam {Boolean} isOccupied Whether the table is occupied
 * @apiSuccess {Object} table Updated table object
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "isOccupied must be a boolean value"
 *     }
 */
router.route('/:tableId/occupied')
  .patch(validateIds, controller.updateOccupiedStatus.bind(controller));

/**
 * @api {post} /restaurants/:restaurantId/venues/:venueId/tables Create table
 * @apiName CreateTable
 * @apiGroup Tables
 * @apiDescription Create a new table in a specific venue of a restaurant
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiParam {String} venueId Venue's unique ID
 * @apiParam {String} number Table number/name
 * @apiParam {Number} capacity Table seating capacity
 * @apiParam {String} tableTypeId Table type ID
 * @apiSuccess {Object} table Newly created table
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Table number already exists in this venue"
 *     }
 */
router.route('/restaurants/:restaurantId/venues/:venueId/tables')
  .post(validateIds, validateTableBody, controller.create.bind(controller));

/**
 * @api {get} /restaurants/:restaurantId/venues/:venueId/tables/:tableId Get table details
 * @apiName GetTableDetails
 * @apiGroup Tables
 * @apiDescription Get details for a specific table within a venue and restaurant
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiParam {String} venueId Venue's unique ID
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object} table Table object
 */
/**
 * @api {put} /restaurants/:restaurantId/venues/:venueId/tables/:tableId Update table
 * @apiName UpdateTable
 * @apiGroup Tables
 * @apiDescription Update a specific table
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiParam {String} venueId Venue's unique ID
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object} table Updated table object
 */
/**
 * @api {delete} /restaurants/:restaurantId/venues/:venueId/tables/:tableId Delete table
 * @apiName DeleteTable
 * @apiGroup Tables
 * @apiDescription Delete a specific table
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiParam {String} venueId Venue's unique ID
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {null} null No content
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Table not found"
 *     }
 */
router.route('/restaurants/:restaurantId/venues/:venueId/tables/:tableId')
  .get(validateIds, controller.getTableById.bind(controller))
  .put(validateIds, validateTableBody, controller.update.bind(controller))
  .delete(validateIds, controller.delete.bind(controller));

/**
 * @api {post} /restaurants/:restaurantId/venues/:venueId/tables/:tableId/qrcode Generate QR code
 * @apiName GenerateQRCode
 * @apiGroup Tables
 * @apiDescription Generate a QR code for a specific table
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiParam {String} venueId Venue's unique ID
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object} qrCode QR code data URL
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Restaurant or table not found"
 *     }
 * @api {get} /restaurants/:restaurantId/venues/:venueId/tables/:tableId/qrcode Get QR code
 * @apiName GetQRCode
 * @apiGroup Tables
 * @apiDescription Get the QR code for a specific table
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiParam {String} venueId Venue's unique ID
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object} qrCode QR code data URL
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "QR code not found for this table"
 *     }
 * @api {delete} /restaurants/:restaurantId/venues/:venueId/tables/:tableId/qrcode Delete QR code
 * @apiName DeleteQRCode
 * @apiGroup Tables
 * @apiDescription Delete the QR code for a specific table
 * @apiParam {String} restaurantId Restaurant's unique ID
 * @apiParam {String} venueId Venue's unique ID
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {null} null No content
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Restaurant or table not found"
 *     }
 */
router.route('/restaurants/:restaurantId/venues/:venueId/tables/:tableId/qrcode')
  .post(validateIds, rateLimitQROperations, controller.generateQRCode.bind(controller))
  .get(validateIds, controller.getQRCode.bind(controller))
  .delete(validateIds, controller.deleteQRCode.bind(controller));

// Simple QR code routes without requiring restaurant/venue context
/**
 * @api {post} /tables/:tableId/qrcode Generate QR code (simple)
 * @apiName GenerateQRCodeSimple
 * @apiGroup Tables
 * @apiDescription Generate a QR code for a specific table without restaurant/venue context
 * @apiParam {String} tableId Table's unique ID
 * @apiSuccess {Object} qrCode QR code data URL
 * @apiError {Object} error Error object with message
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Table not found"
 *     }
 * @apiErrorExample {json} Rate-Limit-Response:
 *     HTTP/1.1 429 Too Many Requests
 *     {
 *       "error": "Too many QR code operations",
 *       "resetIn": "45 seconds"
 *     }
 */
router.route('/:tableId/qrcode')
  .post(validateIds, controller.generateQRCode.bind(controller))
  .get(validateIds, controller.getQRCode.bind(controller))
  .delete(validateIds, controller.deleteQRCode.bind(controller));

export default router;
