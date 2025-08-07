import { Router } from 'express';
import { MenuItemController, upload } from '../controllers/MenuItemController';
import { authenticateFlexible as authMiddleware, authenticateOptional } from '../../../auth-service/src/middleware/auth';

/**
 * @swagger
 * tags:
 *   name: Menu Items
 *   description: Menu item management endpoints
 */

const router = Router();
const controller = new MenuItemController();

/**
 * @swagger
 * components:
 *   schemas:
 *     MenuItemRequest:
 *       type: object
 *       required:
 *         - name
 *         - categoryId
 *         - price
 *       properties:
 *         name:
 *           type: string
 *           example: "Margherita Pizza"
 *         description:
 *           type: string
 *           example: "Fresh tomatoes, mozzarella, and basil"
 *         categoryId:
 *           type: string
 *           example: "123abc"
 *         price:
 *           type: number
 *           example: 12.99
 *         modifiers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Size"
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Small", "Medium", "Large"]
 *               price:
 *                 type: number
 *                 example: 2.00
 *         isAvailable:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /menu-items:
 *   post:
 *     tags: [Menu Items]
 *     summary: Create a new menu item
 *     description: Add a new menu item to a specific category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Menu item image file
 *               name:
 *                 type: string
 *                 example: "Margherita Pizza"
 *               description:
 *                 type: string
 *                 example: "Fresh tomatoes, mozzarella, and basil"
 *               categoryId:
 *                 type: string
 *                 example: "123abc"
 *               price:
 *                 type: number
 *                 example: 12.99
 *               modifiers:
 *                 type: string
 *                 format: json
 *                 example: "[{\"name\":\"Size\",\"options\":[\"Small\",\"Medium\",\"Large\"],\"price\":2.00}]"
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItemRequest'
 *     responses:
 *       201:
 *         description: Menu item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItem'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Category not found"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   get:
 *     tags: [Menu Items]
 *     summary: Get all menu items
 *     description: Retrieve all menu items with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search items by name or description
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability status
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: List of menu items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', upload.any(), controller.create);
router.get('/', authenticateOptional, controller.getAll);

/**
 * @swagger
 * /menu-items/{id}:
 *   get:
 *     tags: [Menu Items]
 *     summary: Get a menu item by ID
 *     description: Retrieve detailed information about a specific menu item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu Item ID
 *     responses:
 *       200:
 *         description: Menu item details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItem'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   put:
 *     tags: [Menu Items]
 *     summary: Update a menu item
 *     description: Update an existing menu item's information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Menu item image file
 *               name:
 *                 type: string
 *                 example: "Margherita Pizza"
 *               description:
 *                 type: string
 *                 example: "Fresh tomatoes, mozzarella, and basil"
 *               categoryId:
 *                 type: string
 *                 example: "123abc"
 *               price:
 *                 type: number
 *                 example: 12.99
 *               modifiers:
 *                 type: string
 *                 format: json
 *                 example: "[{\"name\":\"Size\",\"options\":[\"Small\",\"Medium\",\"Large\"],\"price\":2.00}]"
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItemRequest'
 *     responses:
 *       200:
 *         description: Menu item updated successfully
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
 *   delete:
 *     tags: [Menu Items]
 *     summary: Delete a menu item
 *     description: Remove a menu item from the system
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu Item ID
 *     responses:
 *       204:
 *         description: Menu item deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', authenticateOptional, controller.getById);
router.put('/:id', upload.any(), controller.update);
router.delete('/:id', controller.delete);

/**
 * @swagger
 * /menu-items/{id}/toggle-availability:
 *   patch:
 *     tags: [Menu Items]
 *     summary: Update menu item availability
 *     description: Toggle the availability status of a menu item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Availability status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 isAvailable:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/toggle-availability', controller.toggleAvailability);

/**
 * @swagger
 * /menu-items/{id}/modifiers:
 *   post:
 *     tags: [Menu Items]
 *     summary: Add a modifier to a menu item
 *     description: Add a new modifier option to an existing menu item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - options
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Spice Level"
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Mild", "Medium", "Hot"]
 *               price:
 *                 type: number
 *                 example: 0.50
 *     responses:
 *       201:
 *         description: Modifier added successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/modifiers', controller.addModifier);

export default router;
