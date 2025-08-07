import express from 'express';
import passport from 'passport';
import jwt, { Secret } from 'jsonwebtoken';
import AuthController from '../controllers/AuthController';
import { requirePermission } from '../middleware/rbacMiddleware';
import { authenticateWithCookie, requireCustomerRole, authenticateFlexible } from '../middleware/auth';
import { RbacService } from '../services/RbacService';
import { JWT_SECRET } from '../config';
import { getUserModel } from '../models/user.model';
import multer from 'multer';
import ImageService from '../../../restaurant-service/src/services/ImageService';

// Cookie configuration
const cookieOptions: Record<string, any> = {
  httpOnly: true, // Prevents JavaScript access to cookie
  secure: process.env.NODE_ENV === 'production', // Only sent over HTTPS in production
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Protect against CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

const router = express.Router();
const rbacService = new RbacService();

// Registration and login routes
router.post('/register', async (req, res): Promise<void> => {
  await AuthController.register(req, res);
});

router.post('/login', async (req, res): Promise<void> => {
  try {
    await AuthController.login(req, res);
  } catch (error) {
    console.error('[Auth Route] Login error:', error);
    res.status(500).json({
      message: "Error logging in",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/refresh-token', async (req, res): Promise<void> => {
  await AuthController.refreshToken(req, res);
});

router.post('/logout', authenticateWithCookie, async (req, res): Promise<void> => {
  await AuthController.logout(req, res);
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

// Modified to handle the response properly
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false
  }),
  async (req, res, next) => {
    try {
      await AuthController.googleAuthSuccess(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get authenticated user's profile
router.get('/me', authenticateFlexible, async (req, res, next): Promise<void> => {
  try {
    // User ID comes from the JWT payload
    // Use type assertion to handle the JWT payload structure
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
    // Use type assertion to ensure we have the expected properties
    const userData = userRecord as any;
    
    res.status(200).json({
      success: true,
      user: {
        id: userData._id,
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phoneNumber: userData.phoneNumber || '',
        profileImage: userData.profileImage || '',
        role: userData.role || 'user',
        businessId: userData.businessId
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    next(error);
  }
});

// Get authenticated user's permissions
router.get('/me/permissions', authenticateFlexible, async (req, res, next): Promise<void> => {
  try {
    // User ID comes from the JWT payload
    const tokenUser = req.user as { userId?: string; email?: string; role?: string };
    const userId = tokenUser?.userId;
    
    console.log('[DEBUG] /me/permissions - Token user:', tokenUser);
    console.log('[DEBUG] /me/permissions - User ID:', userId);
    
    if (!userId) {
      const error = new Error('Not authenticated');
      (error as any).statusCode = 401;
      throw error;
    }
    
    // Get user permissions using RBAC service (no permission check needed for own permissions)
    console.log('[DEBUG] /me/permissions - Calling rbacService.getUserPermissions with userId:', userId);
    const permissions = await rbacService.getUserPermissions(userId);
    console.log('[DEBUG] /me/permissions - Permissions returned:', permissions);
    console.log('[DEBUG] /me/permissions - Permissions count:', permissions?.length || 0);
    
    res.status(200).json({ 
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    next(error);
  }
});

// Check authentication status
router.get('/check', (req, res) => {
  // Check for authentication token in multiple locations
  const hasTokenInCookie = !!req.cookies.access_token;
  const hasTokenInHeader = !!(req.headers.authorization && req.headers.authorization.startsWith('Bearer '));
  const isAuthenticated = hasTokenInCookie || hasTokenInHeader;
  
  res.status(200).json({ 
    isAuthenticated,
    tokenSource: hasTokenInHeader ? 'header' : hasTokenInCookie ? 'cookie' : 'none'
  });
});

// Generate guest token for order placement
router.post('/guest-token', async (req, res) => {
  try {
    const { tableId, deviceId } = req.body;
    
    // Create a unique identifier for this guest
    const guestId = deviceId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Generate a JWT token for the guest user
    const token = jwt.sign(
      { 
        id: guestId,
        email: `${guestId}@guest.inseat.com`,
        role: 'guest',
        tableId: tableId || null
      }, 
      JWT_SECRET as Secret,
      { expiresIn: '24h' }
    );
    
    // Set token in cookies
    res.cookie('access_token', token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Return success with token
    res.status(200).json({
      success: true,
      token,
      user: {
        id: guestId,
        email: `${guestId}@guest.inseat.com`,
        firstName: 'Guest',
        lastName: 'User',
        role: 'guest'
      }
    });
  } catch (error) {
    console.error('Error generating guest token:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating guest token'
    });
  }
});

// Profile management routes
router.put('/profile', authenticateFlexible, async (req, res, next): Promise<void> => {
  try {
    const tokenUser = req.user as { userId?: string; email?: string; role?: string };
    const userId = tokenUser?.userId;
    
    if (!userId) {
      const error = new Error('Not authenticated');
      (error as any).statusCode = 401;
      throw error;
    }
    
    const { firstName, lastName, phoneNumber, profileImage } = req.body;
    
    // Find and update user
    const User = getUserModel();
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phoneNumber && { phoneNumber }),
        ...(profileImage && { profileImage })
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        profileImage: updatedUser.profileImage,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    next(error);
  }
});

// Profile image upload route
// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
}).single('profileImage');

router.post('/profile/image', authenticateFlexible, upload, async (req, res, next): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
      return;
    }
    
    const tokenUser = req.user as { userId?: string; email?: string; role?: string };
    const userId = tokenUser?.userId;
    
    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
      return;
    }
    
    try {
      // Upload image to S3 using the singleton ImageService
      console.log('Uploading profile image to S3...');
      const imageUrl = await ImageService.uploadImage(req.file.buffer, req.file.originalname);
      console.log('Profile image uploaded successfully:', imageUrl);
      
      // Update user profile with image URL
      const User = getUserModel();
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { profileImage: imageUrl },
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Profile image uploaded successfully',
        imageUrl: imageUrl
      });
    } catch (uploadError) {
      console.error('Profile image upload error:', uploadError);
      res.status(500).json({ 
        success: false, 
        message: 'Error uploading profile image to S3' 
      });
    }
  } catch (error) {
    console.error('Profile image route error:', error);
    next(error);
  }
});

// Change password route
router.put('/change-password', authenticateFlexible, async (req, res, next): Promise<void> => {
  try {
    const tokenUser = req.user as { userId?: string; email?: string; role?: string };
    const userId = tokenUser?.userId;
    
    if (!userId) {
      const error = new Error('Not authenticated');
      (error as any).statusCode = 401;
      throw error;
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      const error = new Error('Current password and new password are required');
      (error as any).statusCode = 400;
      throw error;
    }
    
    // Find user
    const User = getUserModel();
    const user = await User.findById(userId);
    
    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      const error = new Error('Current password is incorrect');
      (error as any).statusCode = 400;
      throw error;
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    next(error);
  }
});

// User-Role management routes - Fix resource naming to be consistent
router.get(
  '/users/:id/roles',
  authenticateWithCookie,
  async (req, res, next): Promise<void> => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string };
      const requestedUserId = req.params.id;
      const currentUserId = tokenUser?.userId;
      
      // Allow users to access their own roles without permission check
      // Or require permission for accessing other users' roles
      if (currentUserId !== requestedUserId) {
        // Check permission for accessing other users' data
        const rbacService = new RbacService();
        const hasPermission = await rbacService.checkPermission(currentUserId || '', 'users', 'read');
        if (!hasPermission) {
          res.status(403).json({
            message: 'Access denied. Insufficient permissions.',
            details: 'Required permission: read on users'
          });
          return;
        }
      }
      
      const user = await AuthController.getUserById(req.params.id);
      if (!user) {
        const error = new Error('User not found');
        (error as any).statusCode = 404;
        throw error;
      }
      
      // Populate roles
      await user.populate('roles');
      res.status(200).json(user.roles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      next(error);
    }
  }
);

router.post(
  '/users/:id/roles',
  authenticateWithCookie,
  requirePermission('users', 'update'),
  async (req, res, next): Promise<void> => {
    try {
      const { roleId } = req.body;
      
      if (!roleId) {
        const error = new Error('Role ID is required');
        (error as any).statusCode = 400;
        throw error;
      }
      
      const success = await rbacService.assignRoleToUser(req.params.id, roleId);
      
      if (!success) {
        const error = new Error('User or role not found');
        (error as any).statusCode = 404;
        throw error;
      }
      
      res.status(200).json({ message: 'Role assigned successfully' });
    } catch (error) {
      console.error('Error assigning role to user:', error);
      next(error);
    }
  }
);

router.delete(
  '/users/:id/roles/:roleId',
  authenticateWithCookie,
  requirePermission('users', 'update'),
  async (req, res, next): Promise<void> => {
    try {
      const success = await rbacService.removeRoleFromUser(req.params.id, req.params.roleId);
      
      if (!success) {
        const error = new Error('User or role not found');
        (error as any).statusCode = 404;
        throw error;
      }
      
      res.status(200).json({ message: 'Role removed successfully' });
    } catch (error) {
      console.error('Error removing role from user:', error);
      next(error);
    }
  }
);

// User-Permission management routes (read-only, permissions come from roles)
router.get(
  '/users/:id/permissions',
  authenticateWithCookie,
  requirePermission('users', 'read'),
  async (req, res, next): Promise<void> => {
    try {
      const permissions = await rbacService.getUserPermissions(req.params.id);
      res.status(200).json(permissions);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      next(error);
    }
  }
);

// Customer management endpoint - returns customers based on business context
router.get('/customers', authenticateWithCookie, async (req, res, next): Promise<void> => {
  try {
    const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
    const currentUserId = tokenUser?.userId;
    const currentUserRole = tokenUser?.role;
    
    if (!currentUserId) {
      const error = new Error('Not authenticated');
      (error as any).statusCode = 401;
      throw error;
    }

    const User = getUserModel();
    let customers: any[] = [];
    let businesses: any[] = [];
    let restaurants: any[] = [];
    let context: 'system_admin' | 'business_user' = 'business_user';

    // Get query parameters for filtering
    const businessFilter = req.query.business as string;
    const restaurantFilter = req.query.restaurant as string;

    if (currentUserRole === 'system_admin') {
      context = 'system_admin';
      
      // For system admin, get all customers and provide business/restaurant data for filtering
      if (businessFilter) {
        // Filter by specific business
        try {
          const Business = require('../../../restaurant-service/src/models/Business').default;
          const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
          
          // Get restaurants in the selected business
          const restaurantsInBusiness = await Restaurant.find({ businessId: businessFilter });
          const restaurantIds = restaurantsInBusiness.map((r: any) => r._id);
          
          if (restaurantFilter) {
            // Filter by specific restaurant within the business
            customers = await User.find({ 
              role: 'customer',
              restaurantId: restaurantFilter
            }).populate('restaurantId', 'name businessId').exec();
          } else {
            // Get all customers from restaurants in this business
            customers = await User.find({ 
              role: 'customer',
              restaurantId: { $in: restaurantIds }
            }).populate('restaurantId', 'name businessId').exec();
          }
          
          // Get business and restaurant data for dropdowns
          const selectedBusiness = await Business.findById(businessFilter);
          businesses = [selectedBusiness];
          restaurants = restaurantsInBusiness;
          
        } catch (error) {
          console.error('Error filtering customers by business:', error);
          // Fallback to all customers
          customers = await User.find({ role: 'customer' }).populate('restaurantId', 'name businessId').exec();
        }
      } else {
        // Get all customers for system admin
        customers = await User.find({ role: 'customer' }).populate('restaurantId', 'name businessId').exec();
        
        // Get all businesses and restaurants for dropdowns
        try {
          const Business = require('../../../restaurant-service/src/models/Business').default;
          const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
          
          businesses = await Business.find({});
          restaurants = await Restaurant.find({});
        } catch (error) {
          console.error('Error loading businesses/restaurants for system admin:', error);
        }
      }
    } else if (currentUserRole === 'restaurant_admin') {
      // For restaurant admin, get customers from all restaurants in their business
      const currentUser = await User.findById(currentUserId);
      const userBusinessId = currentUser?.businessId;
      
      if (userBusinessId) {
        try {
          const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
          
          // Get all restaurants in the admin's business
          const businessRestaurants = await Restaurant.find({ businessId: userBusinessId });
          const restaurantIds = businessRestaurants.map((r: any) => r._id);
          
          if (restaurantFilter && restaurantIds.includes(restaurantFilter)) {
            // Filter by specific restaurant within their business
      customers = await User.find({
        role: 'customer',
              restaurantId: restaurantFilter
            }).populate('restaurantId', 'name businessId').exec();
          } else {
            // Get customers from all restaurants in their business
      customers = await User.find({
        role: 'customer',
              restaurantId: { $in: restaurantIds }
            }).populate('restaurantId', 'name businessId').exec();
          }
          
          restaurants = businessRestaurants;
        } catch (error) {
          console.error('Error loading customers for restaurant admin:', error);
          customers = [];
        }
      } else {
        customers = [];
      }
    } else {
      // For other users, return empty array
      customers = [];
    }

    res.json({
      success: true,
      customers: customers || [],
      businesses: businesses, // Available for system admin
      restaurants: restaurants, // Available restaurants for filtering
      count: customers?.length || 0,
      context: context,
      businessId: tokenUser.businessId // Current business ID for business users
    });

  } catch (error: any) {
    console.error('Error fetching customers:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch customers',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Customer analytics endpoint
router.get('/analytics/customers', authenticateWithCookie, async (req, res, next): Promise<void> => {
  try {
    const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
    const currentUserId = tokenUser?.userId;
    const currentUserRole = tokenUser?.role;
    
    if (!currentUserId) {
      const error = new Error('Not authenticated');
      (error as any).statusCode = 401;
      throw error;
    }

    const User = getUserModel();
    let customers: any[] = [];
    let context: 'system_admin' | 'business_user' = 'business_user';

    // Get query parameters for filtering
    const businessFilter = req.query.businessId as string;

    if (currentUserRole === 'system_admin') {
      context = 'system_admin';
      
      if (businessFilter) {
        // Filter by specific business
        try {
          const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
          
          // Get restaurants in the selected business
          const restaurantsInBusiness = await Restaurant.find({ businessId: businessFilter });
          const restaurantIds = restaurantsInBusiness.map((r: any) => r._id);
          
          // Get all customers from restaurants in this business
          customers = await User.find({ 
            role: 'customer',
            restaurantId: { $in: restaurantIds }
          }).populate('restaurantId', 'name businessId').exec();
          
        } catch (error) {
          console.error('Error filtering customers by business:', error);
          // Fallback to all customers
          customers = await User.find({ role: 'customer' }).populate('restaurantId', 'name businessId').exec();
        }
      } else {
        // Get all customers for system admin
        customers = await User.find({ role: 'customer' }).populate('restaurantId', 'name businessId').exec();
      }
    } else if (currentUserRole === 'restaurant_admin') {
      // For restaurant admin, get customers from all restaurants in their business
      const currentUser = await User.findById(currentUserId);
      const userBusinessId = currentUser?.businessId;
      
      if (userBusinessId) {
        try {
          const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
          
          // Get all restaurants in the admin's business
          const businessRestaurants = await Restaurant.find({ businessId: userBusinessId });
          const restaurantIds = businessRestaurants.map((r: any) => r._id);
          
          // Get customers from all restaurants in their business
          customers = await User.find({
            role: 'customer',
            restaurantId: { $in: restaurantIds }
          }).populate('restaurantId', 'name businessId').exec();
          
        } catch (error) {
          console.error('Error loading customers for restaurant admin:', error);
          customers = [];
        }
      } else {
        customers = [];
      }
    } else {
      // For other users, return empty analytics
      customers = [];
    }

    // Generate analytics from customer data
    const totalCustomers = customers.length;
    
    // Calculate basic analytics from existing customer data
    const newCustomersThisMonth = customers.filter(customer => {
      const createdDate = new Date(customer.createdAt);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return createdDate > oneMonthAgo;
    }).length;
    
    const activeCustomers = customers.filter(customer => customer.isActive).length;
    const returnRate = totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0;
    
    // Calculate customer activity by month (last 6 months)
    const customerActivity: Array<{ name: string; signups: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthlySignups = customers.filter(customer => {
        const createdDate = new Date(customer.createdAt);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length;
      
      customerActivity.push({
        name: date.toLocaleDateString('en-US', { month: 'short' }),
        signups: monthlySignups
      });
    }

    const analyticsData = {
      totalCustomers: totalCustomers,
      newCustomers: newCustomersThisMonth,
      activeCustomers: activeCustomers,
      returnRate: returnRate,
      averageSpend: 0, // Would need order data
      loyaltyDistribution: [
        { name: 'New', value: newCustomersThisMonth, color: '#3b82f6' },
        { name: 'Regular', value: Math.max(0, activeCustomers - newCustomersThisMonth), color: '#10b981' },
        { name: 'Inactive', value: totalCustomers - activeCustomers, color: '#ef4444' }
      ],
      customerActivity: customerActivity,
      demographicData: []
    };

    res.json({
      success: true,
      data: analyticsData,
      context: context,
      businessId: tokenUser.businessId
    });

  } catch (error: any) {
    console.error('Error fetching customer analytics:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch customer analytics',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Verify authentication endpoint - verifies current authentication status
router.get('/verify', authenticateFlexible, async (req, res): Promise<void> => {
  try {
    console.log('[Auth Verify] Checking authentication status');
    
    // Check if user is authenticated from the middleware
    if (req.user) {
      const user_data = req.user as any;
      const userId = user_data.userId || user_data.id || user_data._id;
      
      if (userId) {
        const User = getUserModel();
        
        // Get user details from database
        const user = await User.findById(userId).exec();
      
      if (user) {
        console.log(`[Auth Verify] User authenticated: ${user.email}`);
        res.json({
          success: true,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            businessId: user.businessId
          }
        });
      } else {
        console.log('[Auth Verify] User not found in database');
      }
    } else {
      console.log('[Auth Verify] No valid user ID found');
      res.status(401).json({
        success: false,
        error: 'User ID not found'
      });
      }
    } else {
      console.log('[Auth Verify] No authenticated user found');
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
  } catch (error: any) {
    console.error('[Auth Verify] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check authentication endpoint - simpler boolean check
router.get('/check', authenticateFlexible, async (req, res): Promise<void> => {
  try {
    const user_data = req.user as any;
    const isAuthenticated = !!(req.user && (user_data.userId || user_data.id || user_data._id));
    console.log(`[Auth Check] Authentication status: ${isAuthenticated}`);
    
    res.json({
      isAuthenticated
    });
  } catch (error: any) {
    console.error('[Auth Check] Error:', error);
    res.json({
      isAuthenticated: false
    });
  }
});

export default router;
