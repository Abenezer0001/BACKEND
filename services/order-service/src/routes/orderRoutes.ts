import { Router } from 'express';
import OrderController from '../controllers/OrderController';
import { authenticateUser } from '../middleware/auth';
import { authorizeRestaurant } from '../middleware/authorizeRestaurant';
import {
  validateCreateOrder,
  validateUpdateOrder,
  validateGetOrdersByRestaurant
} from '../middleware/validation';

const router = Router();

// Use the Singleton instance
const orderController = OrderController.getInstance();

// Create a new order
router.post(
  '/',
  authenticateUser,
  validateCreateOrder, 
  orderController.createOrder.bind(orderController)
);

// Get all orders with optional filters
router.get('/', orderController.getOrdersByRestaurant.bind(orderController));

// Get order by ID
router.get('/:id', orderController.getOrderById.bind(orderController));

// Update order status
router.patch('/:id/status', validateUpdateOrder, orderController.updateOrderStatus.bind(orderController));

// Update payment status
router.patch('/:id/payment-status', 
  authenticateUser,
  (req, res) => orderController.updatePaymentStatus(req, res)
);

// Cancel order
// router.post('/:id/cancel', orderController.cancel.bind(orderController));

// Get orders by table
// router.get('/restaurant/:restaurantId/table/:tableNumber', 
//   authenticateUser,
//   (req, res) => orderController.getByTable(req, res)
// );

// Get orders by user
router.get('/user/:userId', 
  authenticateUser,
  orderController.getOrdersByUser.bind(orderController)
);

// Update order details (items, instructions, etc.)
// router.patch('/:id', 
//   authenticateUser,
//   (req, res) => orderController.updateDetails(req, res)
// );

// Set estimated preparation time
// router.patch('/:id/preparation-time', 
//   authenticateUser,
//   authorizeRestaurant,
//   (req, res) => orderController.setEstimatedPrepTime(req, res)
// );

// Get order status history
// router.get('/:id/status-history', 
//   authenticateUser,
//   (req, res) => orderController.getStatusHistory(req, res)
// );

// Get order alerts
// router.get('/:id/alerts', 
//   authenticateUser,
//   (req, res) => orderController.getOrderAlerts(req, res)
// );

// Acknowledge order alert
// router.post('/:id/alerts/:alertId/acknowledge', 
//   authenticateUser,
//   authorizeRestaurant,
//   (req, res) => orderController.acknowledgeAlert(req, res)
// );

// Get restaurant active alerts
// router.get('/restaurant/:restaurantId/alerts', 
//   authenticateUser,
//   authorizeRestaurant,
//   (req, res) => orderController.getRestaurantAlerts(req, res)
// );

export default router;
