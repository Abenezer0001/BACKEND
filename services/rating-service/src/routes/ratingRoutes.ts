import { Router } from 'express';
import { RatingController } from '../controllers/RatingController';
import { authenticateFlexible } from '../../../auth-service/src/middleware/auth';

const router = Router();
const ratingController = new RatingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - menuItemId
 *         - restaurantId
 *         - rating
 *         - comment
 *       properties:
 *         menuItemId:
 *           type: string
 *           description: ID of the menu item being reviewed
 *         restaurantId:
 *           type: string
 *           description: ID of the restaurant
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1 to 5 stars
 *         comment:
 *           type: string
 *           maxLength: 1000
 *           description: Review comment
 *         orderId:
 *           type: string
 *           description: Optional order ID for verified purchase
 *     
 *     RatingAggregated:
 *       type: object
 *       properties:
 *         average:
 *           type: number
 *           description: Average rating
 *         count:
 *           type: number
 *           description: Total number of reviews
 *         wilsonScore:
 *           type: number
 *           description: Wilson score for ranking
 *         bayesianAverage:
 *           type: number
 *           description: Bayesian average accounting for low review counts
 *         recentTrend:
 *           type: number
 *           description: Recent trend in ratings
 *         distribution:
 *           type: object
 *           properties:
 *             1: {type: number}
 *             2: {type: number}
 *             3: {type: number}
 *             4: {type: number}
 *             5: {type: number}
 */

/**
 * @swagger
 * /api/v1/ratings:
 *   post:
 *     summary: Submit a new rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Review'
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Authentication required
 *       409:
 *         description: User has already rated this item
 */
router.post('/', authenticateFlexible, ratingController.submitRating.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/order-item:
 *   post:
 *     summary: Submit a rating for a specific order item
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - menuItemId
 *               - rating
 *               - comment
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID of the order containing the menu item
 *               menuItemId:
 *                 type: string
 *                 description: ID of the menu item being rated
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5 stars
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Review comment
 *     responses:
 *       201:
 *         description: Order item review submitted successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Order not found or doesn't contain menu item
 *       409:
 *         description: User has already rated this menu item
 */
router.post('/order-item', authenticateFlexible, ratingController.submitOrderItemRating.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/menu-item/{id}:
 *   get:
 *     summary: Get ratings for a specific menu item
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [recent, helpful, rating_high, rating_low, verified]
 *           default: recent
 *     responses:
 *       200:
 *         description: Menu item ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     aggregated:
 *                       $ref: '#/components/schemas/RatingAggregated'
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Review'
 */
router.get('/menu-item/:id', ratingController.getMenuItemRatings.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/menu-item/{id}/stats:
 *   get:
 *     summary: Get statistical data for a specific menu item's ratings
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     responses:
 *       200:
 *         description: Menu item rating statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RatingAggregated'
 *       400:
 *         description: Invalid menu item ID
 *       404:
 *         description: Menu item not found
 */
router.get('/menu-item/:id/stats', ratingController.getMenuItemStats.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/restaurant/{id}:
 *   get:
 *     summary: Get aggregate ratings for a restaurant
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant ratings retrieved successfully
 */
router.get('/restaurant/:id', ratingController.getRestaurantRatings.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/{id}:
 *   put:
 *     summary: Update an existing rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found or unauthorized
 */
router.put('/:id', authenticateFlexible, ratingController.updateRating.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/{id}:
 *   delete:
 *     summary: Delete a rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found or unauthorized
 */
router.delete('/:id', authenticateFlexible, ratingController.deleteRating.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/user/{id}:
 *   get:
 *     summary: Get all ratings by a specific user
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User ratings retrieved successfully
 */
router.get('/user/:id', ratingController.getUserRatings.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/{id}/helpful:
 *   post:
 *     summary: Mark a review as helpful or not helpful
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - helpful
 *             properties:
 *               helpful:
 *                 type: boolean
 *                 description: true for helpful, false for not helpful
 *     responses:
 *       200:
 *         description: Helpful vote recorded successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found
 */
router.post('/:id/helpful', authenticateFlexible, ratingController.markHelpful.bind(ratingController));

// ADMIN DASHBOARD ROUTES

/**
 * @swagger
 * /api/v1/ratings/restaurant/{id}/analytics:
 *   get:
 *     summary: Get restaurant rating analytics for admin dashboard
 *     tags: [Ratings - Admin]
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
 *         description: Restaurant rating analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalReviews:
 *                       type: number
 *                     averageRating:
 *                       type: number
 *                     ratingDistribution:
 *                       type: object
 *                     trends:
 *                       type: object
 *                     recentReviews:
 *                       type: array
 */
router.get('/restaurant/:id/analytics', authenticateFlexible, ratingController.getRestaurantAnalytics.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/restaurant/{id}/reviews:
 *   get:
 *     summary: Get restaurant reviews with pagination for admin dashboard
 *     tags: [Ratings - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [recent, rating_high, rating_low, helpful]
 *           default: recent
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, flagged]
 *           default: all
 *     responses:
 *       200:
 *         description: Restaurant reviews retrieved successfully
 */
router.get('/restaurant/:id/reviews', authenticateFlexible, ratingController.getRestaurantReviews.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/restaurant/{id}/menu-items/performance:
 *   get:
 *     summary: Get menu items performance for admin dashboard
 *     tags: [Ratings - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, reviews, helpful]
 *           default: rating
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Menu items performance retrieved successfully
 */
router.get('/restaurant/:id/menu-items/performance', authenticateFlexible, ratingController.getMenuItemsPerformance.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/restaurant/{id}/customer-insights:
 *   get:
 *     summary: Get customer insights for admin dashboard
 *     tags: [Ratings - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Customer insights retrieved successfully
 */
router.get('/restaurant/:id/customer-insights', authenticateFlexible, ratingController.getCustomerInsights.bind(ratingController));

/**
 * @swagger
 * /api/v1/ratings/menu-item/{id}/can-rate:
 *   get:
 *     summary: Check if authenticated user can rate a specific menu item
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     responses:
 *       200:
 *         description: Rating eligibility check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     canRate:
 *                       type: boolean
 *                       description: Whether user can rate this menu item
 *                     reason:
 *                       type: string
 *                       enum: [eligible, already_rated, not_purchased]
 *                       description: Reason for the rating eligibility status
 *                     message:
 *                       type: string
 *                       description: Human-readable message explaining the status
 *                     existingRating:
 *                       type: object
 *                       description: Present if user already rated this item
 *                     orderDetails:
 *                       type: object
 *                       description: Present if user is eligible to rate
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Invalid menu item ID
 */
router.get('/menu-item/:menuItemId/can-rate', authenticateFlexible, ratingController.canUserRateMenuItem.bind(ratingController));

/**
 * @swagger
 * /api/v1/menu-items/{id}/ratings:
 *   get:
 *     summary: Get ratings for a specific menu item (alternative endpoint)
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [recent, helpful, rating_high, rating_low, verified]
 *           default: recent
 *     responses:
 *       200:
 *         description: Menu item ratings retrieved successfully
 */
router.get('/menu-items/:id/ratings', ratingController.getMenuItemRatings.bind(ratingController));

export default router;