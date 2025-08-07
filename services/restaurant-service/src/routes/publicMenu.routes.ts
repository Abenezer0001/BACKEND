import { Router } from 'express';
import { PublicMenuController } from '../controllers/PublicMenuController';

const router = Router();
const publicMenuController = new PublicMenuController();

/**
 * @openapi
 * tags:
 *   - name: Public Menu
 *     description: Public menu access for customers (no authentication required)
 */

/**
 * @openapi
 * /public/menu/categories:
 *   get:
 *     summary: Get all categories for a restaurant (public)
 *     description: Retrieve all active categories for a specific restaurant - no authentication required
 *     tags: [Public Menu]
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Restaurant ID to get categories for
 *     responses:
 *       200:
 *         description: List of active categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       400:
 *         description: Bad request - missing or invalid restaurant ID
 *       500:
 *         description: Server error
 */
router.get('/categories', publicMenuController.getCategories.bind(publicMenuController));

/**
 * @openapi
 * /public/menu/categories/{id}:
 *   get:
 *     summary: Get category by ID (public)
 *     description: Retrieve a specific active category - no authentication required
 *     tags: [Public Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid category ID format
 *       404:
 *         description: Category not found or inactive
 *       500:
 *         description: Server error
 */
router.get('/categories/:id', publicMenuController.getCategoryById.bind(publicMenuController));

/**
 * @openapi
 * /public/menu/subcategories:
 *   get:
 *     summary: Get subcategories for a category (public)
 *     description: Retrieve all active subcategories for a specific category - no authentication required
 *     tags: [Public Menu]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID to get subcategories for
 *     responses:
 *       200:
 *         description: List of active subcategories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubCategory'
 *       400:
 *         description: Bad request - missing or invalid category ID
 *       500:
 *         description: Server error
 */
router.get('/subcategories', publicMenuController.getSubCategories.bind(publicMenuController));

/**
 * @openapi
 * /public/menu/subsubcategories:
 *   get:
 *     summary: Get sub-subcategories (public)
 *     description: Retrieve all active sub-subcategories for a subcategory - no authentication required
 *     tags: [Public Menu]
 *     parameters:
 *       - in: query
 *         name: subCategoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sub-category ID to get sub-subcategories for
 *     responses:
 *       200:
 *         description: List of active sub-subcategories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubSubCategory'
 *       400:
 *         description: Bad request - missing or invalid sub-category ID
 *       500:
 *         description: Server error
 */
router.get('/subsubcategories', publicMenuController.getSubSubCategories.bind(publicMenuController));

/**
 * @openapi
 * /public/menu/menu-items:
 *   get:
 *     summary: Get menu items (public)
 *     description: Retrieve active menu items with optional filtering - no authentication required
 *     tags: [Public Menu]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: subCategoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by sub-category ID
 *       - in: query
 *         name: subSubCategoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by sub-sub-category ID
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by restaurant ID
 *     responses:
 *       200:
 *         description: List of active menu items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 *       400:
 *         description: Bad request - invalid ID format
 *       500:
 *         description: Server error
 */
router.get('/menu-items', publicMenuController.getMenuItems.bind(publicMenuController));

/**
 * @openapi
 * /public/menu/restaurant/{restaurantId}/full:
 *   get:
 *     summary: Get full menu structure for a restaurant (public)
 *     description: Retrieve complete menu hierarchy with categories, subcategories, and items - no authentication required
 *     tags: [Public Menu]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Complete menu structure
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   subCategories:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         menuItems:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MenuItem'
 *                   menuItems:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/MenuItem'
 *       400:
 *         description: Invalid restaurant ID format
 *       500:
 *         description: Server error
 */
router.get('/restaurant/:restaurantId/full', publicMenuController.getFullMenu.bind(publicMenuController));

export default router;