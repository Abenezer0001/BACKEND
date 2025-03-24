import { Router } from 'express';
import { ModifierController } from '../controllers/ModifierController';

const router = Router();
const modifierController = new ModifierController();

// Get all modifiers
router.get('/', modifierController.getAll);

// Get a single modifier by ID
router.get('/:id', modifierController.getById);

// Create a new modifier
router.post('/', modifierController.create);

// Update a modifier
router.put('/:id', modifierController.update);

// Delete a modifier
router.delete('/:id', modifierController.delete);

// Toggle modifier availability
router.patch('/:id/toggle-availability', modifierController.toggleAvailability);

export default router; 