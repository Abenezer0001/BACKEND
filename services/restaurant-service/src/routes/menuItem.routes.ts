import { Router } from 'express';
import { MenuItemController, upload } from '../controllers/MenuItemController'; // Import upload middleware

const router = Router();
const menuItemController = new MenuItemController();

// Get all menu items (optional filters: ?restaurantId=...&subSubCategoryId=...&includeInactive=true)
router.get('/', menuItemController.getAll);

// Get a single menu item by ID
router.get('/:id', menuItemController.getById);

// Create a new menu item
router.post('/', upload.single('image'), menuItemController.create); // Apply middleware

// Update a menu item
router.put('/:id', upload.single('image'), menuItemController.update); // Apply middleware

// Delete a menu item (soft by default, use ?hardDelete=true for permanent)
router.delete('/:id', menuItemController.delete);

// Toggle menu item availability (isAvailable field)
router.patch('/:id/toggle-availability', menuItemController.toggleAvailability);

export default router;
