import { Router } from 'express';
import { TableController } from '../controllers/TableController';

const router = Router();

// Use arrow functions to properly bind methods
router.get('/:tableId/verify', async (req, res) => {
  const controller = new TableController();
  await controller.verifyTable(req, res);
});

router.get('/:tableId/menu', async (req, res) => {
  const controller = new TableController();
  await controller.getTableMenu(req, res);
});

export default router;
