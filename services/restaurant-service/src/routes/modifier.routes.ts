import { Router } from 'express';
import { ModifierController } from '../controllers/ModifierController';
import { authenticateFlexible as authMiddleware } from '../../../auth-service/src/middleware/auth';

const router = Router();
const modifierController = new ModifierController();

/**
 * @swagger
 * tags:
 *   name: Modifiers
 *   description: Modifier Group management endpoints for restaurants
 */

/**
 * @swagger
 * /api/modifiers/restaurants/{restaurantId}:
 *   get:
 *     summary: Get all modifier groups for a restaurant
 *     description: Retrieve a list of all modifier groups for the specified restaurant
 *     tags: [Modifiers]
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
 *         description: A list of modifier groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ModifierGroup'
 */
router.get('/restaurants/:restaurantId', authMiddleware, modifierController.getAll.bind(modifierController));

/**
 * @swagger
 * /api/modifiers/restaurants/{restaurantId}:
 *   post:
 *     summary: Create a new modifier group
 *     description: Add a new modifier group to the specified restaurant
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - name
 *               - options
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cheese Options"
 *               description:
 *                 type: string
 *                 example: "Choose your preferred cheese"
 *               selectionType:
 *                 type: string
 *                 enum: [SINGLE, MULTIPLE]
 *                 default: "SINGLE"
 *                 example: "SINGLE"
 *               isRequired:
 *                 type: boolean
 *                 default: false
 *                 example: true
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - price
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Extra Cheese"
 *                     price:
 *                       type: number
 *                       example: 1.5
 *                     isAvailable:
 *                       type: boolean
 *                       default: true
 *                       example: true
 *                     isDefault:
 *                       type: boolean
 *                       default: false
 *                       example: false
 *                     order:
 *                       type: number
 *                       default: 0
 *                       example: 1
 *     responses:
 *       201:
 *         description: Modifier group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModifierGroup'
 */
router.post('/restaurants/:restaurantId', authMiddleware, modifierController.create.bind(modifierController));

/**
 * @swagger
 * /api/modifiers/{id}:
 *   get:
 *     summary: Get a modifier group by ID
 *     description: Retrieve a specific modifier group by its ID
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Modifier Group ID
 *     responses:
 *       200:
 *         description: Modifier group details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModifierGroup'
 */
router.get('/:id', authMiddleware, modifierController.getById.bind(modifierController));

/**
 * @swagger
 * /api/modifiers/{id}:
 *   put:
 *     summary: Update a modifier group
 *     description: Update an existing modifier group by its ID
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Modifier Group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cheese Options"
 *               description:
 *                 type: string
 *                 example: "Choose your preferred cheese"
 *               selectionType:
 *                 type: string
 *                 enum: [SINGLE, MULTIPLE]
 *                 example: "SINGLE"
 *               isRequired:
 *                 type: boolean
 *                 example: true
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: "Include for existing options to update"
 *                     name:
 *                       type: string
 *                       example: "Extra Cheese"
 *                     price:
 *                       type: number
 *                       example: 1.5
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *                     isDefault:
 *                       type: boolean
 *                       example: false
 *                     order:
 *                       type: number
 *                       example: 1
 *     responses:
 *       200:
 *         description: Modifier group updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModifierGroup'
 */
router.put('/:id', authMiddleware, modifierController.update.bind(modifierController));

/**
 * @swagger
 * /api/modifiers/{id}:
 *   delete:
 *     summary: Delete a modifier group
 *     description: Delete a modifier group by its ID (only if not used by any menu items)
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Modifier Group ID
 *     responses:
 *       204:
 *         description: Modifier group deleted successfully
 *       400:
 *         description: Cannot delete modifier group because it's in use
 */
router.delete('/:id', authMiddleware, modifierController.delete.bind(modifierController));

/**
 * @swagger
 * /api/modifiers/{id}/toggle-availability:
 *   patch:
 *     summary: Toggle modifier group availability
 *     description: Toggle the availability status of a modifier group
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Modifier Group ID
 *     responses:
 *       200:
 *         description: Modifier group availability toggled successfully
 */
router.patch('/:id/toggle-availability', authMiddleware, modifierController.toggleAvailability.bind(modifierController));

/**
 * @swagger
 * /api/modifiers/{id}/options/{optionId}/toggle-availability:
 *   patch:
 *     summary: Toggle modifier option availability
 *     description: Toggle the availability status of a specific modifier option
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Modifier Group ID
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Modifier Option ID
 *     responses:
 *       200:
 *         description: Modifier option availability toggled successfully
 */
router.patch('/:id/options/:optionId/toggle-availability', authMiddleware, modifierController.toggleOptionAvailability.bind(modifierController));

export default router; 