import { Router } from 'express';
import { SubCategoryController } from '../controllers/SubCategoryController';

const router = Router();
const subCategoryController = new SubCategoryController();

// Get all subcategories (optional filter: ?categoryId=...)
router.get('/', subCategoryController.getAll);

// Get a single subcategory by ID
router.get('/:id', subCategoryController.getById);

// Create a new subcategory
router.post('/', subCategoryController.create);

// Update a subcategory
router.put('/:id', subCategoryController.update);

// Delete a subcategory
router.delete('/:id', subCategoryController.delete);

// Toggle subcategory availability
router.patch('/:id/toggle-availability', subCategoryController.toggleAvailability);

export default router;
