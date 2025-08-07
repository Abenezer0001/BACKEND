import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import WebSocketService from '../services/WebSocketService';
import { authenticateUser } from '../middleware/auth';
import { authorizeRestaurant } from '../middleware/authorizeRestaurant';
import {
  validateCreateOrder,
  validateUpdateOrder,
  validateGetOrdersByRestaurant
} from '../middleware/validation';

// Use typeof to refer to the type of the WebSocketService singleton
export const createOrderRoutes = (wsService: typeof WebSocketService) => {
  const router = Router();
  const orderController = new OrderController(wsService);

  // Create a new order
  router.post(
    '/',
    authenticateUser,
    validateCreateOrder, 
    orderController.create.bind(orderController)
  );

  // Get all orders with optional filters
  router.get('/', authenticateUser, orderController.getAll.bind(orderController));

  // Get current user's orders
  router.get('/my-orders', authenticateUser, orderController.getMyOrders.bind(orderController));

  // Get order by ID
  router.get('/:id', orderController.getById.bind(orderController));

  // Update order status
  router.put('/:id/status', 
    authenticateUser,
    validateUpdateOrder, 
    orderController.updateStatus.bind(orderController)
  );

  // Update payment status
  router.put('/:id/payment', 
    authenticateUser,
    orderController.updatePaymentStatus.bind(orderController)
  );

  // Cancel order
  router.post('/:id/cancel', 
    authenticateUser,
    orderController.cancel.bind(orderController)
  );

  // Get orders by restaurant
  router.get('/restaurant/:restaurantId', 
    ...validateGetOrdersByRestaurant,
    orderController.getByRestaurant.bind(orderController)
  );

  // Get orders by table
  router.get('/restaurant/:restaurantId/table/:tableNumber', 
    authenticateUser,
    orderController.getByTable.bind(orderController)
  );

  // Get orders by user
  router.get('/user/:userId', 
    authenticateUser,
    orderController.getByUser.bind(orderController)
  );

  // Update order details
  router.put('/:id', 
    authenticateUser,
    orderController.updateDetails.bind(orderController)
  );

  // Send alert for an order
  router.post('/:id/alert',
    authenticateUser,
    orderController.sendAlert.bind(orderController)
  );

  // Get live orders for KDS (last 8 active orders)
  router.get('/restaurant/:restaurantId/live',
    authenticateUser,
    orderController.getLiveOrdersForKDS.bind(orderController)
  );

  // Update individual item status within an order
  router.put('/:orderId/items/:itemId/status',
    authenticateUser,
    orderController.updateItemStatus.bind(orderController)
  );

  return router;
};

// Add default export
export default createOrderRoutes;
