import { Router } from 'express';
import { LoyaltyController } from '../controllers/LoyaltyController';

const router = Router();

/**
 * @swagger
 * /api/loyalty/program/{restaurantId}:
 *   post:
 *     summary: Create or update loyalty program for a restaurant
 *     tags: [Loyalty]
 *     parameters:
 *       - in: path
 *         name: restaurantId
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
 *             properties:
 *               isEnabled:
 *                 type: boolean
 *               settings:
 *                 type: object
 *                 properties:
 *                   firstTimeDiscountPercent:
 *                     type: number
 *                   timeBased:
 *                     type: object
 *                   frequencyTiers:
 *                     type: object
 *                   maxDiscountCap:
 *                     type: number
 *                   allowStackingWithPromotions:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Loyalty program updated successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/program/:restaurantId', LoyaltyController.createOrUpdateLoyaltyProgram);

/**
 * @swagger
 * /api/loyalty/program/{restaurantId}:
 *   get:
 *     summary: Get loyalty program for a restaurant
 *     tags: [Loyalty]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Loyalty program retrieved successfully
 *       404:
 *         description: Loyalty program not found
 *       500:
 *         description: Server error
 */
router.get('/program/:restaurantId', LoyaltyController.getLoyaltyProgram);

/**
 * @swagger
 * /api/loyalty/program/{restaurantId}:
 *   delete:
 *     summary: Delete loyalty program for a restaurant
 *     tags: [Loyalty]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Loyalty program deleted successfully
 *       500:
 *         description: Server error
 */
router.delete('/program/:restaurantId', LoyaltyController.deleteLoyaltyProgram);

/**
 * @swagger
 * /api/loyalty/calculate-discount:
 *   post:
 *     summary: Calculate loyalty discount for a customer
 *     tags: [Loyalty]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - restaurantId
 *               - orderAmount
 *             properties:
 *               customerId:
 *                 type: string
 *               restaurantId:
 *                 type: string
 *               orderAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Discount calculated successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/calculate-discount', LoyaltyController.calculateDiscount);

/**
 * @swagger
 * /api/loyalty/apply-discount:
 *   post:
 *     summary: Apply loyalty discount and record visit
 *     tags: [Loyalty]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - restaurantId
 *               - orderAmount
 *               - discountAmount
 *               - discountPercent
 *             properties:
 *               customerId:
 *                 type: string
 *               restaurantId:
 *                 type: string
 *               orderAmount:
 *                 type: number
 *               discountAmount:
 *                 type: number
 *               discountPercent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Discount applied successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/apply-discount', LoyaltyController.applyDiscount);

/**
 * @swagger
 * /api/loyalty/customer/{customerId}/restaurant/{restaurantId}:
 *   get:
 *     summary: Get customer loyalty status for a restaurant
 *     tags: [Loyalty]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Customer loyalty status retrieved successfully
 *       404:
 *         description: Customer loyalty status not found
 *       500:
 *         description: Server error
 */
router.get('/customer/:customerId/restaurant/:restaurantId', LoyaltyController.getCustomerLoyaltyStatus);

/**
 * @swagger
 * /api/loyalty/analytics/{restaurantId}:
 *   get:
 *     summary: Get restaurant loyalty analytics
 *     tags: [Loyalty]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/analytics/:restaurantId', LoyaltyController.getRestaurantAnalytics);

/**
 * @swagger
 * /api/loyalty/customers/{restaurantId}:
 *   get:
 *     summary: Get all customers for a restaurant with their loyalty status
 *     tags: [Loyalty]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *           enum: [bronze, silver, gold, platinum]
 *         description: Filter by tier
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/customers/:restaurantId', LoyaltyController.getRestaurantCustomers);

export default router;