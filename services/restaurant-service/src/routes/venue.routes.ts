import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { VenueController } from '../controllers/VenueController';

const router = Router();
const controller = new VenueController();

// Debug middleware
const debugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('Venue Route:', {
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

// Apply debug middleware
router.use(debugMiddleware);

// Get all venues (global)
router.get('/', controller.getAllVenues);

// Restaurant-specific venue routes
router.post('/restaurant/:restaurantId', controller.create);
router.get('/restaurant/:restaurantId', controller.getAll);

// Individual venue routes
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

// Venue tables routes
router.get('/:venueId/tables', controller.getTables);
router.post('/:venueId/tables', controller.createTable);

export default router;
