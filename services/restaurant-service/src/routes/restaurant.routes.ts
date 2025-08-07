import { Router, RequestHandler } from 'express';
import { RestaurantController } from '../controllers/RestaurantController';
import { TableController } from '../controllers/TableController';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../auth-service/src/types/auth.types';
import { authenticateFlexible } from '../../../auth-service/src/middleware/auth';

/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management endpoints
 */

const router = Router();
const controller = new RestaurantController();
const tableController = new TableController();

// Apply flexible authentication middleware to all routes (supports both Bearer tokens and cookies)
router.use(authenticateFlexible);

// Debug middleware for tables route
const debugMiddleware = (req: Request, res: Response, next: NextFunction) => {
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

// Wrapper functions with proper typing
const createRestaurant = (req: AuthenticatedRequest, res: Response) => controller.create(req, res);
const getAllRestaurants = (req: AuthenticatedRequest, res: Response) => controller.getAll(req, res);
const getRestaurantById = (req: AuthenticatedRequest, res: Response) => controller.getById(req, res);
const getRestaurantsByBusiness = (req: AuthenticatedRequest, res: Response) => controller.getRestaurantsByBusiness(req, res);
const updateRestaurant = (req: AuthenticatedRequest, res: Response) => controller.update(req, res);
const deleteRestaurant = (req: AuthenticatedRequest, res: Response) => controller.delete(req, res);
const getVenues = (req: AuthenticatedRequest, res: Response) => controller.getVenues(req, res);
const addMenuCategory = (req: AuthenticatedRequest, res: Response) => controller.addMenuCategory(req, res);
const addMenuItem = (req: AuthenticatedRequest, res: Response) => controller.addMenuItem(req, res);
const updateServiceCharge = (req: AuthenticatedRequest, res: Response) => controller.updateServiceCharge(req, res);
const getServiceCharge = (req: AuthenticatedRequest, res: Response) => controller.getServiceCharge(req, res);

/**
 * @swagger
 * /restaurants:
 *   post:
 *     tags: [Restaurants]
 *     summary: Create a new restaurant
 *     description: Create a new restaurant with the provided details
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Restaurant'
 *           example:
 *             name: "Sample Restaurant"
 *             locations: [
 *               {
 *                 address: "123 Main St, City, Country",
 *                 coordinates: {
 *                   latitude: 40.7128,
 *                   longitude: -74.0060
 *                 }
 *               }
 *             ]
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   get:
 *     tags: [Restaurants]
 *     summary: Get all restaurants
 *     description: Retrieve a list of all restaurants
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of restaurants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Restaurant'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', createRestaurant as RequestHandler);
router.get('/', getAllRestaurants as RequestHandler);

/**
 * @swagger
 * /restaurants/business/{businessId}:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get restaurants for a specific business
 *     description: Retrieve all restaurants that belong to a specific business
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: List of restaurants for the business
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Restaurant'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/business/:businessId', getRestaurantsByBusiness as RequestHandler);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get a restaurant by ID
 *     description: Retrieve detailed information about a specific restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   put:
 *     tags: [Restaurants]
 *     summary: Update a restaurant
 *     description: Update an existing restaurant's information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Restaurant'
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   delete:
 *     tags: [Restaurants]
 *     summary: Delete a restaurant
 *     description: Delete a restaurant and all associated data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       204:
 *         description: Restaurant deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', getRestaurantById as RequestHandler);
router.put('/:id', updateRestaurant as RequestHandler);
router.delete('/:id', deleteRestaurant as RequestHandler);

/**
 * @swagger
 * /restaurants/{restaurantId}/venues:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get all venues for a restaurant
 *     description: Retrieve all venues associated with a specific restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Venues retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Venue'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:restaurantId/venues', getVenues as RequestHandler);

/**
 * @swagger
 * /restaurants/{restaurantId}/tables:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get all tables for a restaurant
 *     description: Retrieve all tables associated with a specific restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Tables retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Table'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:restaurantId/tables', debugMiddleware, tableController.getAllForRestaurant.bind(tableController));

/**
 * @swagger
 * /restaurants/{id}/menu-categories:
 *   post:
 *     tags: [Restaurants]
 *     summary: Add a menu category to a restaurant
 *     description: Add a new menu category to a restaurant's menu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Appetizers"
 *               description:
 *                 type: string
 *                 example: "Starter dishes"
 *     responses:
 *       201:
 *         description: Menu category added successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/menu-categories', addMenuCategory as RequestHandler);

/**
 * @swagger
 * /restaurants/{id}/menu-items:
 *   post:
 *     tags: [Restaurants]
 *     summary: Add a menu item to a restaurant
 *     description: Add a new menu item to a restaurant's menu category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItem'
 *     responses:
 *       201:
 *         description: Menu item added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItem'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/menu-items', addMenuItem as RequestHandler);

/**
 * @swagger
 * /restaurants/{id}/service-charge:
 *   put:
 *     tags: [Restaurants]
 *     summary: Update restaurant service charge settings
 *     description: Update the service charge configuration for a restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *               - percentage
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Whether service charge is enabled
 *               percentage:
 *                 type: number
 *                 minimum: 10
 *                 maximum: 20
 *                 description: Service charge percentage (10-20%)
 *           example:
 *             enabled: true
 *             percentage: 15
 *     responses:
 *       200:
 *         description: Service charge updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   get:
 *     tags: [Restaurants]
 *     summary: Get restaurant service charge settings
 *     description: Retrieve the service charge configuration for a restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Service charge settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service_charge:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     percentage:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id/service-charge', updateServiceCharge as RequestHandler);
router.get('/:id/service-charge', getServiceCharge as RequestHandler);

export default router;
