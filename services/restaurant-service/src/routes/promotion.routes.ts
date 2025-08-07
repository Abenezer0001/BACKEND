import { Router } from 'express';
import { PromotionController } from '../controllers/PromotionController'; // Adjust path if necessary

/**
 * @swagger
 * tags:
 *   name: Promotions
 *   description: Customer-facing promotion endpoints
 */

const router = Router();
const controller = new PromotionController();

/**
 * @swagger
 * /promotions/splash:
 *   get:
 *     tags: [Promotions]
 *     summary: Get active splash screen promotions for a restaurant
 *     description: Retrieve a list of promotions that are active, marked for splash display, and within their valid date range for a specific restaurant.
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant.
 *       - in: query
 *         name: venueId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional ID of the venue to filter promotions.
 *     responses:
 *       200:
 *         description: A list of active splash promotions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Promotion' // Ensure Promotion schema is defined in global Swagger components
 *       400:
 *         description: Bad request (e.g., missing restaurantId).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/BadRequestError'
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/ServerError'
 */
router.get('/splash', controller.getActiveSplashPromotions.bind(controller));

/**
 * @swagger
 * /promotions/all:
 *   get:
 *     tags: [Promotions]
 *     summary: Get all active promotions for a restaurant
 *     description: Retrieve a list of all active promotions for a specific restaurant or venue.
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant.
 *       - in: query
 *         name: venueId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional ID of the venue to filter promotions.
 *     responses:
 *       200:
 *         description: A list of active promotions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Promotion'
 *       400:
 *         description: Bad request (e.g., missing restaurantId).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/BadRequestError'
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/ServerError'
 */
router.get('/all', controller.getActivePromotions.bind(controller));

/**
 * @swagger
 * /promotions/{promotionId}:
 *   get:
 *     tags: [Promotions]
 *     summary: Get a specific promotion by ID
 *     description: Retrieve details of a specific promotion by its ID.
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
 *       400:
 *         description: Bad request (e.g., invalid promotionId format).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/BadRequestError'
 *       404:
 *         description: Promotion not found or not active.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/NotFoundError'
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/ServerError'
 */
router.get('/:promotionId', controller.getPromotionById.bind(controller));

export default router;
