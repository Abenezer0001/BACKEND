import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authenticateFlexible as authMiddleware, authenticateOptional } from '../../../auth-service/src/middleware/auth';

const router = Router();
const categoryController = new CategoryController();

/**
 * @openapi
 * tags:
 *   - name: Categories
 *     description: Menu category management
 * 
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *         - restaurantId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The auto-generated UUID of the category
 *         name:
 *           type: string
 *           description: The name of the category
 *         description:
 *           type: string
 *           description: Optional description of the category
 *         restaurantId:
 *           type: string
 *           format: uuid
 *           description: UUID of the restaurant this category belongs to
 *         order:
 *           type: integer
 *           description: Order position of the category in the menu
 *         isAvailable:
 *           type: boolean
 *           description: Whether the category is available
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date-time when the category was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date-time when the category was last updated
 */

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: Retrieve all categories
 *     description: Get a list of all menu categories, with optional filtering by restaurant
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter categories by restaurant ID
 *     responses:
 *       200:
 *         description: A list of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticateOptional, categoryController.getAll.bind(categoryController));

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     summary: Get a single category
 *     description: Retrieve detailed information about a specific category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the category to retrieve
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', authenticateOptional, categoryController.getById.bind(categoryController));

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Create a new category
 *     description: Add a new category to a restaurant's menu
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - restaurantId
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category
 *               description:
 *                 type: string
 *                 description: Optional description of the category
 *               restaurantId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the restaurant this category belongs to
 *               order:
 *                 type: integer
 *                 description: Order position of the category in the menu
 *               isAvailable:
 *                 type: boolean
 *                 description: Whether the category is available
 *                 default: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authMiddleware, categoryController.create.bind(categoryController));

/**
 * @openapi
 * /categories/{id}:
 *   put:
 *     summary: Update a category
 *     description: Modify an existing menu category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the category to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category
 *               description:
 *                 type: string
 *                 description: Description of the category
 *               order:
 *                 type: integer
 *                 description: Order position of the category in the menu
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
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
router.put('/:id', authMiddleware, categoryController.update.bind(categoryController));

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     description: Remove a category from a restaurant's menu
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the category to delete
 *     responses:
 *       200:
 *         description: Category successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Category deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', authMiddleware, categoryController.delete.bind(categoryController));

/**
 * @openapi
 * /categories/{id}/toggle-availability:
 *   patch:
 *     summary: Toggle category availability
 *     description: Enable or disable a category's availability on the menu
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the category to toggle availability
 *     responses:
 *       200:
 *         description: Category availability successfully toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/toggle-availability', authMiddleware, categoryController.toggleAvailability.bind(categoryController));

export default router;
