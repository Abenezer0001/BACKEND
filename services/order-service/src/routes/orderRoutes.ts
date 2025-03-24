import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { WebSocketService } from '../services/WebSocketService';

export const createOrderRoutes = (wsService?: WebSocketService) => {
  const router = Router();
  const controller = new OrderController(wsService);

  // Order CRUD routes
  router.post('/orders', controller.create.bind(controller));
  router.get('/orders', controller.getAll.bind(controller));
  router.get('/orders/:id', controller.getById.bind(controller));
  router.put('/orders/:id/status', controller.updateStatus.bind(controller));
  router.put('/orders/:id/payment', controller.updatePaymentStatus.bind(controller));
  router.post('/orders/:id/cancel', controller.cancel.bind(controller));

  // Table specific routes
  router.get('/restaurants/:restaurantId/tables/:tableNumber/orders', controller.getByTable.bind(controller));

  return router;
};

export default createOrderRoutes();
