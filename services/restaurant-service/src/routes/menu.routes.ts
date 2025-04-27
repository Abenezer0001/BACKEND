import { Router } from 'express';
import { MenuController } from '../controllers/MenuController';
import { MenuItemController } from '../controllers/MenuItemController'; // Import MenuItemController

const router = Router();
const controller = new MenuController();
const menuItemController = new MenuItemController(); // Instantiate MenuItemController

// Menu routes
router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

// Removed routes related to old embedded category/item management
export default router; 
