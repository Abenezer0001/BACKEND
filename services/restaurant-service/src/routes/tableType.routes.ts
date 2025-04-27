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

// GET /api/table-types/:restaurantId - Get all table types for a restaurant
router.get('/:restaurantId', (req, res) => {
  console.log('Restaurant table types route accessed, restaurantId:', req.params.restaurantId);
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
