import { Router } from 'express';
import {
  createTableType,
  getTableTypesByRestaurant,
  getTableTypeById,
  updateTableType,
  deleteTableType,
} from '../controllers/TableTypeController';
// Add any necessary middleware (e.g., authentication)
// import { protect, admin } from '../middleware/authMiddleware';

const router = Router();

// Debug middleware
const debugMiddleware = (req: any, res: any, next: any) => {
  console.log('TableType Route:', {
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

// Apply debug middleware to all routes
router.use(debugMiddleware);

// Special handler for when the route is mounted at /restaurants/:restaurantId/table-types
// This handles the case when the frontend calls `/api/restaurants/:restaurantId/table-types`
router.get('/', (req: any, res: any) => {
  console.log('Restaurant table types route accessed via nested path');
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
    // Set the restaurantId in the params object for the controller
    req.params.restaurantId = restaurantId;
    console.log('Getting table types for restaurant ID:', restaurantId);
    getTableTypesByRestaurant(req, res);
  } else {
    // If no restaurantId parameter, return 400 error
    res.status(400).json({ message: 'Restaurant ID is required.' });
  }
});

// GET /api/table-types/:restaurantId - Get all table types for a restaurant
// This handles the direct route to table-types
router.get('/:restaurantId', (req, res) => {
  console.log('Restaurant table types direct route accessed, restaurantId:', req.params.restaurantId);
  getTableTypesByRestaurant(req, res);
});

// POST /api/table-types/:restaurantId - Create a new table type
router.post('/:restaurantId', (req, res) => {
  createTableType(req, res);
});

// GET /api/table-types/:restaurantId/:id - Get a single table type
router.get('/:restaurantId/:id', (req, res) => {
  getTableTypeById(req, res);
});

// PUT /api/table-types/:restaurantId/:id - Update a table type
router.put('/:restaurantId/:id', (req, res) => {
  updateTableType(req, res);
});

// DELETE /api/table-types/:restaurantId/:id - Delete a table type
router.delete('/:restaurantId/:id', (req, res) => {
  deleteTableType(req, res);
});

export default router;
