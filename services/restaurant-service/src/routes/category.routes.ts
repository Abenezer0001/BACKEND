import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';

const router = Router();
const categoryController = new CategoryController();

// Get all categories
router.get('/', categoryController.getAll);

// Get a single category by ID
router.get('/:id', categoryController.getById);

// Create a new category
router.post('/', categoryController.create);

// Update a category
router.put('/:id', categoryController.update);

// Delete a category
router.delete('/:id', categoryController.delete);

// Toggle category availability
router.patch('/:id/toggle-availability', categoryController.toggleAvailability);

export default router; 