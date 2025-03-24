import { Router } from 'express';
import { MenuController } from '../controllers/MenuController';

const router = Router();
const controller = new MenuController();

// Menu routes
router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

// Menu category routes
router.post('/:menuId/categories', controller.addCategory);
router.get('/:menuId/categories', controller.getCategories);
router.put('/:menuId/categories/:categoryId', controller.updateCategory);
router.delete('/:menuId/categories/:categoryId', controller.deleteCategory);

// Menu item routes
router.post('/:menuId/categories/:categoryId/items', controller.addMenuItem);
router.put('/:menuId/categories/:categoryId/items/:itemId', controller.updateMenuItem);
router.delete('/:menuId/categories/:categoryId/items/:itemId', controller.deleteMenuItem);
router.patch('/:menuId/categories/:categoryId/items/:itemId/availability', controller.updateItemAvailability);

export default router; 
