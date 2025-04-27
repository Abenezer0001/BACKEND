import { Router } from 'express';
import { SubSubCategoryController } from '../controllers/SubSubCategoryController';

const router = Router();
const subSubCategoryController = new SubSubCategoryController();

// Get all sub-subcategories (optional filter: ?subCategoryId=...)
router.get('/', subSubCategoryController.getAll);

// Get a single sub-subcategory by ID
router.get('/:id', subSubCategoryController.getById);

// Create a new sub-subcategory
router.post('/', subSubCategoryController.create);

// Update a sub-subcategory
router.put('/:id', subSubCategoryController.update);

// Delete a sub-subcategory
router.delete('/:id', subSubCategoryController.delete);

// Toggle sub-subcategory availability
router.patch('/:id/toggle-availability', subSubCategoryController.toggleAvailability);

export default router;
