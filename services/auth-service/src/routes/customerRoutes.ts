import express from 'express';
import AuthController from '../controllers/AuthController';
import { CustomerController } from '../controllers/CustomerController';
import { authenticateFlexible } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth.types';

const router = express.Router();

// Get authenticated customer's profile - forwards to main auth controller
router.get('/me', authenticateFlexible, async (req, res, next): Promise<void> => {
  try {
    // User ID comes from the JWT payload
    const tokenUser = req.user as { userId?: string; email?: string; role?: string };
    const userId = tokenUser?.userId;
    
    if (!userId) {
      const error = new Error('Not authenticated');
      (error as any).statusCode = 401;
      throw error;
    }
    
    // Find the user
    const userRecord = await AuthController.getUserById(userId);
    if (!userRecord) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }
    
    // Return user data (excluding password)
    const userData = userRecord as any;
    
    res.status(200).json({
      success: true,
      user: {
        id: userData._id,
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userData.role || 'user'
      }
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    next(error);
  }
});

// Registration and login routes specifically for customers
router.post('/register', async (req, res): Promise<void> => {
  try {
  // Set role to customer automatically
  req.body.role = 'customer';
    
    // Log the registration request for debugging
    console.log('Customer registration request:', {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      restaurantId: req.body.restaurantId || 'Not provided',
      tableId: req.body.tableId || 'Not provided'
    });
    
  await AuthController.register(req, res);
  } catch (error) {
    console.error('[Customer Registration Route] Error:', error);
    res.status(500).json({
      message: 'Error registering customer',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/login', async (req, res): Promise<void> => {
  try {
    await AuthController.login(req, res);
  } catch (error) {
    console.error('[Customer Auth Route] Login error:', error);
    res.status(500).json({
      message: 'Error logging in',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/google', async (req, res): Promise<void> => {
  try {
    // Handle Google OAuth token from frontend
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ message: 'Google token is required' });
      return;
    }
    
    // Use the standard passport auth route until we implement the direct token handling
    res.status(501).json({ message: 'Google authentication via token not implemented yet' });
    // TODO: Implement direct token verification with Google
  } catch (error) {
    console.error('[Customer Auth Route] Google login error:', error);
    res.status(500).json({
      message: 'Error with Google authentication',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add logout route that doesn't require authentication
router.post('/logout', (req, res) => {
  // Clear auth cookies
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  
  console.log('[Customer Auth Route] User logged out successfully');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// Initialize CustomerController for restaurant admin and system admin routes
const customerController = new CustomerController();

// Restaurant admin and system admin routes for managing customers
// These routes require authentication and proper role permissions
router.get(
  '/by-restaurant',
  authenticateFlexible,
  (req, res) => customerController.getCustomersByRestaurant(req as AuthenticatedRequest, res)
);

router.get(
  '/:id',
  authenticateFlexible,
  (req, res) => customerController.getCustomerById(req as AuthenticatedRequest, res)
);

router.put(
  '/:id',
  authenticateFlexible,
  (req, res) => customerController.updateCustomer(req as AuthenticatedRequest, res)
);

export default router;
