import { Router } from 'express';
import { SubSubCategoryController } from '../controllers/SubSubCategoryController';
import { authenticateFlexible as authMiddleware, authenticateOptional } from '../../../auth-service/src/middleware/auth';

const router = Router();
const subSubCategoryController = new SubSubCategoryController();

// Get all sub-subcategories (optional filter: ?subCategoryId=...)
router.get('/', authenticateOptional, subSubCategoryController.getAll.bind(subSubCategoryController));

// Get a single sub-subcategory by ID
router.get('/:id', authenticateOptional, subSubCategoryController.getById.bind(subSubCategoryController));

// Create a new sub-subcategory
router.post('/', authMiddleware, subSubCategoryController.create.bind(subSubCategoryController));

// Update a sub-subcategory
router.put('/:id', authMiddleware, subSubCategoryController.update.bind(subSubCategoryController));

// Delete a sub-subcategory
router.delete('/:id', authMiddleware, subSubCategoryController.delete.bind(subSubCategoryController));

// Toggle sub-subcategory availability
router.patch('/:id/toggle-availability', authMiddleware, subSubCategoryController.toggleAvailability.bind(subSubCategoryController));

export default router;
