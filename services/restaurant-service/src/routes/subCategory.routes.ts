import { Router } from 'express';
import { SubCategoryController } from '../controllers/SubCategoryController';
import { authenticateFlexible as authMiddleware, authenticateOptional } from '../../../auth-service/src/middleware/auth';

const router = Router();
const subCategoryController = new SubCategoryController();

/**
 * @swagger
 * /api/restaurant/subcategory:
 *   get:
 *     summary: Get all subcategories
 *     description: Retrieve a list of all subcategories, optionally filtered by category ID
 *     tags: [SubCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Optional category ID to filter subcategories
 *     responses:
 *       200:
 *         description: A list of subcategories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Subcategory ID
 *                   name:
 *                     type: string
 *                     description: Subcategory name
 *                   description:
 *                     type: string
 *                     description: Subcategory description
 *                   displayOrder:
 *                     type: integer
 *                     description: Display order for the subcategory
 *                   isAvailable:
 *                     type: boolean
 *                     description: Whether the subcategory is available
 *                   categoryId:
 *                     type: string
 *                     description: ID of the parent category
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticateOptional, subCategoryController.getAll.bind(subCategoryController));

/**
 * @swagger
 * /api/restaurant/subcategory/{id}:
 *   get:
 *     summary: Get a subcategory by ID
 *     description: Retrieve a specific subcategory by its ID
 *     tags: [SubCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The subcategory ID
 *     responses:
 *       200:
 *         description: Subcategory details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Subcategory ID
 *                 name:
 *                   type: string
 *                   description: Subcategory name
 *                 description:
 *                   type: string
 *                   description: Subcategory description
 *                 displayOrder:
 *                   type: integer
 *                   description: Display order for the subcategory
 *                 isAvailable:
 *                   type: boolean
 *                   description: Whether the subcategory is available
 *                 categoryId:
 *                   type: string
 *                   description: ID of the parent category
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', authenticateOptional, subCategoryController.getById.bind(subCategoryController));

/**
 * @swagger
 * /api/restaurant/subcategory:
 *   post:
 *     summary: Create a new subcategory
 *     description: Create a new subcategory under a specific category
 *     tags: [SubCategories]
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
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Subcategory name
 *               description:
 *                 type: string
 *                 description: Subcategory description
 *               categoryId:
 *                 type: string
 *                 description: ID of the parent category
 *               displayOrder:
 *                 type: integer
 *                 description: Order in which to display this subcategory (optional)
 *               isAvailable:
 *                 type: boolean
 *                 description: Whether the subcategory is available (defaults to true)
 *     responses:
 *       201:
 *         description: Subcategory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Subcategory ID
 *                 name:
 *                   type: string
 *                   description: Subcategory name
 *                 description:
 *                   type: string
 *                   description: Subcategory description
 *                 displayOrder:
 *                   type: integer
 *                   description: Display order for the subcategory
 *                 isAvailable:
 *                   type: boolean
 *                   description: Whether the subcategory is available
 *                 categoryId:
 *                   type: string
 *                   description: ID of the parent category
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Parent category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authMiddleware, subCategoryController.create.bind(subCategoryController));

/**
 * @swagger
 * /api/restaurant/subcategory/{id}:
 *   put:
 *     summary: Update a subcategory
 *     description: Update an existing subcategory's information
 *     tags: [SubCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The subcategory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Subcategory name
 *               description:
 *                 type: string
 *                 description: Subcategory description
 *               categoryId:
 *                 type: string
 *                 description: ID of the parent category
 *               displayOrder:
 *                 type: integer
 *                 description: Order in which to display this subcategory
 *               isAvailable:
 *                 type: boolean
 *                 description: Whether the subcategory is available
 *     responses:
 *       200:
 *         description: Subcategory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Subcategory ID
 *                 name:
 *                   type: string
 *                   description: Subcategory name
 *                 description:
 *                   type: string
 *                   description: Subcategory description
 *                 displayOrder:
 *                   type: integer
 *                   description: Display order for the subcategory
 *                 isAvailable:
 *                   type: boolean
 *                   description: Whether the subcategory is available
 *                 categoryId:
 *                   type: string
 *                   description: ID of the parent category
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id', authMiddleware, subCategoryController.update.bind(subCategoryController));

/**
 * @swagger
 * /api/restaurant/subcategory/{id}:
 *   delete:
 *     summary: Delete a subcategory
 *     description: Delete a subcategory by ID
 *     tags: [SubCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The subcategory ID
 *     responses:
 *       200:
 *         description: Subcategory deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Subcategory deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', authMiddleware, subCategoryController.delete.bind(subCategoryController));

/**
 * @swagger
 * /api/restaurant/subcategory/{id}/toggle-availability:
 *   patch:
 *     summary: Toggle subcategory availability
 *     description: Toggle the availability status of a subcategory
 *     tags: [SubCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The subcategory ID
 *     responses:
 *       200:
 *         description: Subcategory availability toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Subcategory ID
 *                 isAvailable:
 *                   type: boolean
 *                   description: The updated availability status
 *                 message:
 *                   type: string
 *                   example: Subcategory availability toggled successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/toggle-availability', authMiddleware, subCategoryController.toggleAvailability.bind(subCategoryController));

export default router;
