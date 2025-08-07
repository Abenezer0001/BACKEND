import { Router, Response, RequestHandler } from 'express';
import { 
    AdminPromotionController, 
    promotionCreationValidationRules, 
    promotionUpdateValidationRules,
    upload  // Import multer upload middleware
} from '../controllers/AdminPromotionController'; // Adjust path if necessary
import { AuthenticatedRequest } from '../../../auth-service/src/types/auth.types';

// Import authentication middleware
import { authenticateFlexible } from '../../../auth-service/src/middleware/auth'; // Corrected path

// Import business RBAC middleware directly (not through alias)
import { 
  requireBusinessRole, 
  requireBusinessScope, 
  requireBusinessPermission 
} from '../../../auth-service/src/middleware/businessRbacMiddleware'; // Direct import

/**
 * @swagger
 * tags:
 *   name: AdminPromotions
 *   description: Promotion management endpoints for administrators
 */

const router = Router();
const controller = new AdminPromotionController();

// Use flexible authentication and business role authorization
router.use(authenticateFlexible);
// Allow both system admins and restaurant admins to access promotions
// router.use(requireBusinessRole(['system_admin', 'restaurant_admin'])); // Temporarily commented out
// Ensure business scoping for all promotion operations
// router.use(requireBusinessScope()); // Temporarily commented out

// Wrapper functions with proper typing
const createPromotion = (req: AuthenticatedRequest, res: Response) => controller.createPromotion(req, res);
const getAllPromotionsForRestaurant = (req: AuthenticatedRequest, res: Response) => controller.getAllPromotionsForRestaurant(req, res);
const getPromotionById = (req: AuthenticatedRequest, res: Response) => controller.getPromotionById(req, res);
const updatePromotion = (req: AuthenticatedRequest, res: Response) => controller.updatePromotion(req, res);
const deletePromotion = (req: AuthenticatedRequest, res: Response) => controller.deletePromotion(req, res);
const getMenuItemsForRestaurant = (req: AuthenticatedRequest, res: Response) => controller.getMenuItemsForRestaurant(req, res);
const getMenuItemsForVenue = (req: AuthenticatedRequest, res: Response) => controller.getMenuItemsForVenue(req, res);
const getVenuesForRestaurant = (req: AuthenticatedRequest, res: Response) => controller.getVenuesForRestaurant(req, res);

/**
 * @swagger
 * /admin/promotions:
 *   post:
 *     tags: [AdminPromotions]
 *     summary: Create a new promotion
 *     description: Allows administrators to create a new promotion with venue enablement and combo support.
 *     security:
 *       - bearerAuth: [] # Indicates that this endpoint requires authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PromotionCreation' # Define this in global Swagger components
 *     responses:
 *       201:
 *         description: Promotion created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/simple-test', (req: any, res: any) => {
  try {
    console.log('=== SIMPLE TEST ENDPOINT ===');
    console.log('Body:', Object.keys(req.body || {}));
    console.log('User:', req.user ? 'Present' : 'Missing');
    res.status(201).json({ 
      success: true, 
      message: 'Simple test POST endpoint working',
      hasUser: !!req.user,
      bodyKeys: Object.keys(req.body || {})
    });
  } catch (error: any) {
    console.error('Simple test error:', error.message);
    res.status(500).json({ error: `Simple test failed: ${error.message}` });
  }
});

router.post(
    '/', 
    upload.single('image'), // Restore multer middleware 
    // promotionCreationValidationRules,  // Keep validation commented out for now
    createPromotion as RequestHandler
);

/**
 * @swagger
 * /admin/promotions:
 *   get:
 *     tags: [AdminPromotions]
 *     summary: Get all promotions for a restaurant
 *     description: Retrieves all promotions for a specified restaurant with optional venue filtering.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant to fetch promotions for.
 *       - in: query
 *         name: venueId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional venue ID to filter promotions by venue.
 *     responses:
 *       200:
 *         description: A list of promotions for the restaurant.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Promotion'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', getAllPromotionsForRestaurant as RequestHandler);

/**
 * @swagger
 * /admin/promotions/{promotionId}:
 *   get:
 *     tags: [AdminPromotions]
 *     summary: Get a specific promotion by ID
 *     description: Retrieves details of a specific promotion by its ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promotionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the promotion.
 *     responses:
 *       200:
 *         description: Details of the promotion.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:promotionId', getPromotionById as RequestHandler);

/**
 * @swagger
 * /admin/promotions/{promotionId}:
 *   put:
 *     tags: [AdminPromotions]
 *     summary: Update an existing promotion
 *     description: Allows administrators to update details of an existing promotion.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promotionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the promotion to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PromotionUpdate' # Define this in global Swagger components
 *     responses:
 *       200:
 *         description: Promotion updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put(
    '/:promotionId', 
    upload.single('image'), // Add multer middleware to handle optional image upload
    promotionUpdateValidationRules, 
    updatePromotion as RequestHandler
);

/**
 * @swagger
 * /admin/promotions/{promotionId}:
 *   delete:
 *     tags: [AdminPromotions]
 *     summary: Delete a promotion
 *     description: Allows administrators to delete a promotion.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promotionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the promotion to delete.
 *     responses:
 *       200:
 *         description: Promotion deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Promotion deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:promotionId', deletePromotion as RequestHandler);

/**
 * @swagger
 * /admin/promotions/restaurants/{restaurantId}/menu-items:
 *   get:
 *     tags: [AdminPromotions]
 *     summary: Get all menu items for a restaurant
 *     description: Retrieves all active menu items for a restaurant to help with combo creation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant.
 *     responses:
 *       200:
 *         description: A list of menu items for the restaurant.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/restaurants/:restaurantId/menu-items', getMenuItemsForRestaurant as RequestHandler);

/**
 * @swagger
 * /admin/promotions/restaurants/{restaurantId}/venues:
 *   get:
 *     tags: [AdminPromotions]
 *     summary: Get all venues for a restaurant
 *     description: Retrieves all active venues for a restaurant to help with venue enablement.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant.
 *     responses:
 *       200:
 *         description: A list of venues for the restaurant.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Venue'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/restaurants/:restaurantId/venues', getVenuesForRestaurant as RequestHandler);

/**
 * @swagger
 * /admin/promotions/restaurants/{restaurantId}/venues/{venueId}/menu-items:
 *   get:
 *     tags: [AdminPromotions]
 *     summary: Get menu items for a specific venue
 *     description: Retrieves menu items filtered by venue for better combo creation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant.
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the venue.
 *     responses:
 *       200:
 *         description: A list of menu items for the venue.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/restaurants/:restaurantId/venues/:venueId/menu-items', getMenuItemsForVenue as RequestHandler);

// Test endpoint to check if routes work
router.get('/test', (req: any, res: any) => {
  res.json({ message: 'Test endpoint working', method: 'GET' });
});

router.post('/test', (req: any, res: any) => {
  res.json({ message: 'Test POST endpoint working', body: req.body });
});

export default router;
