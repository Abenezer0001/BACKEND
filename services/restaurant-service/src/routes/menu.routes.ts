import { Router } from 'express';
import { MenuController } from '../controllers/MenuController';
import { MenuItemController } from '../controllers/MenuItemController'; // Import MenuItemController

/**
 * @swagger
 * tags:
 *   name: Menus
 *   description: Menu management endpoints
 */

const router = Router();
const controller = new MenuController();
const menuItemController = new MenuItemController(); // Instantiate MenuItemController

/**
 * @swagger
 * /menus:
 *   post:
 *     tags: [Menus]
 *     summary: Create a new menu
 *     description: Create a new menu for a restaurant
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - name
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: ID of the restaurant this menu belongs to
 *               name:
 *                 type: string
 *                 description: Name of the menu
 *               description:
 *                 type: string
 *                 description: Description of the menu
 *           example:
 *             restaurantId: "123abc"
 *             name: "Lunch Menu"
 *             description: "Available from 11 AM to 3 PM"
 *     responses:
 *       201:
 *         description: Menu created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 restaurantId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   get:
 *     tags: [Menus]
 *     summary: Get all menus
 *     description: Retrieve all menus with optional restaurant filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *         description: Filter menus by restaurant ID
 *     responses:
 *       200:
 *         description: List of menus retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   restaurantId:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', controller.create);
router.get('/', controller.getAll);

/**
 * @swagger
 * /menus/{id}:
 *   get:
 *     tags: [Menus]
 *     summary: Get a menu by ID
 *     description: Retrieve detailed information about a specific menu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 restaurantId:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   put:
 *     tags: [Menus]
 *     summary: Update a menu
 *     description: Update an existing menu's information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *           example:
 *             name: "Updated Lunch Menu"
 *             description: "Now available from 11:30 AM to 3:30 PM"
 *     responses:
 *       200:
 *         description: Menu updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   delete:
 *     tags: [Menus]
 *     summary: Delete a menu
 *     description: Delete a menu and all its associated data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *     responses:
 *       204:
 *         description: Menu deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

// Removed routes related to old embedded category/item management
export default router; 
