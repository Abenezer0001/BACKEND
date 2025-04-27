import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import WebSocketService from '../services/WebSocketService';
import { 
  validateRequestBody, 
  validateGetOrdersByRestaurant, 
  validateCreateOrder,
  validateUpdateOrder,
  isValidObjectId
} from '../middleware/validation';

const router = Router();
const wsService = WebSocketService.getInstance();
const orderController = new OrderController(wsService);

/**
 * @route POST /api/orders
 * @desc Create a new order
 * @access Public
 */
router.post('/', validateCreateOrder, orderController.create);

/**
 * @route GET /api/orders
 * @desc Get all orders with filtering options
 * @access Private
 */
router.get('/', orderController.getAll);

/**
 * @route GET /api/orders/:id
 * @desc Get order by ID
 * @access Private
 */
router.get('/:id', orderController.getById);

/**
 * @route PUT /api/orders/:id/status
 * @desc Update order status
 * @access Private
 */
router.put('/:id/status', validateUpdateOrder, orderController.updateStatus);

/**
 * @route PUT /api/orders/:id/payment
 * @desc Update payment status
 * @access Private
 */
router.put('/:id/payment', validateUpdateOrder, orderController.updatePaymentStatus);

/**
 * @route POST /api/orders/:id/cancel
 * @desc Cancel an order
 * @access Private
 */
router.post('/:id/cancel', orderController.cancel);

/**
 * @route PUT /api/orders/:id
 * @desc Update order details
 * @access Private
 */
router.put('/:id', validateUpdateOrder, orderController.updateDetails);

/**
 * @route GET /api/orders/restaurant/:restaurantId/table/:tableNumber
 * @desc Get orders by table
 * @access Private
 */
router.get('/restaurant/:restaurantId/table/:tableNumber', orderController.getByTable);

/**
 * @route GET /api/orders/user/:userId
 * @desc Get orders by user
 * @access Private
 */
router.get('/user/:userId', orderController.getByUser);

export default router; 