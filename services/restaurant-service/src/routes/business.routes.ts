import express from 'express';
import { BusinessController } from '../controllers/BusinessController';
import { authenticateFlexible, requireSystemAdminRole, requireRole as authRequireRole } from '../../../auth-service/src/middleware/auth';
import { AuthenticatedRequest } from '../../../auth-service/src/types/auth.types';
import { requireBusinessRole } from '../../../auth-service/src/middleware/businessRbacMiddleware';

const router = express.Router();

// Type-safe wrapper for business role checking
const requireRole = requireBusinessRole;

// Middleware to wrap controller methods for better error handling
const wrapController = (controllerMethod: Function) => {
  return async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      await controllerMethod(req, res);
    } catch (error) {
      next(error);
    }
  };
};

// Debug endpoint to test if routes are reachable
router.get('/debug/business-routes', (req: AuthenticatedRequest, res: any) => {
  console.log('[Business Routes] Debug endpoint reached');
  res.json({ message: 'Business routes are working', timestamp: new Date().toISOString() });
});

// Debug endpoint to test authentication
router.get('/debug/auth', authenticateFlexible, (req: AuthenticatedRequest, res: any) => {
  console.log('[Business Routes] Auth debug endpoint reached');
  console.log('[Business Routes] req.user:', req.user);
  res.json({ 
    message: 'Authentication debug', 
    user: req.user,
    timestamp: new Date().toISOString() 
  });
});

// Debug endpoint to test authentication with POST
router.post('/debug/auth', authenticateFlexible, (req: AuthenticatedRequest, res: any) => {
  console.log('[Business Routes] POST Auth debug endpoint reached');
  console.log('[Business Routes] req.user:', req.user);
  console.log('[Business Routes] req.body:', req.body);
  res.json({ 
    message: 'POST Authentication debug', 
    user: req.user,
    body: req.body,
    timestamp: new Date().toISOString() 
  });
});

// Debug endpoint to test system admin role middleware
router.get('/debug/system-admin', authenticateFlexible, requireSystemAdminRole, (req: AuthenticatedRequest, res: any) => {
  console.log('[Business Routes] System admin debug endpoint reached');
  console.log('[Business Routes] req.user:', req.user);
  res.json({ 
    message: 'System admin role check passed', 
    user: req.user,
    timestamp: new Date().toISOString() 
  });
});

// Simple test route to bypass middleware issues
router.get('/test/businesses-admin', authenticateFlexible, async (req: AuthenticatedRequest, res: any) => {
  try {
    console.log('[Business Routes] Test businesses endpoint reached');
    console.log('[Business Routes] req.user:', req.user);

    // Call the controller directly
    await BusinessController.getAllBusinesses(req, res);
  } catch (error) {
    console.error('[Business Routes] Error in test businesses endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check user roles array
router.get('/test/check-user/:email', authenticateFlexible, async (req: AuthenticatedRequest, res: any) => {
  try {
    console.log('[Business Routes] Check user endpoint reached');
    const { email } = req.params;
    
    // Import getUserModel to check the user
    const { getUserModel } = require('../../../auth-service/src/models/user.model');
    const UserModel = getUserModel();
    
    const user = await UserModel.findOne({ email: email })
      .populate('roles', 'name description scope businessId')
      .select('-password -passwordResetToken');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'User found',
      user: user.toObject(),
      rolesCount: user.roles ? user.roles.length : 0
    });
  } catch (error) {
    console.error('[Business Routes] Error in check user endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary working POST endpoint for business creation (bypass middleware issues)
router.post('/test/create-business', authenticateFlexible, async (req: AuthenticatedRequest, res: any) => {
  try {
    console.log('[Business Routes] Test create business endpoint reached');
    console.log('[Business Routes] req.user:', req.user);
    console.log('[Business Routes] req.body:', req.body);

    // Check system admin role (same as debug endpoint pattern)
    const tokenUser = req.user as { userId?: string; email?: string; role?: string };
    
    if (!req.user || tokenUser.role !== 'system_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'System admin role required',
        userRole: tokenUser?.role || 'none'
      });
    }

    // Call the controller directly
    await BusinessController.createBusiness(req, res);
  } catch (error) {
    console.error('[Business Routes] Error in test create business endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Working System Admin routes - use pattern that works with our debug endpoint
router.get(
  '/businesses-admin',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      // Check system admin role inline (same logic as requireSystemAdminRole)
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      console.log(`[Business Routes] Admin businesses - checking role for user: ${tokenUser?.userId}, role: ${tokenUser?.role}`);
      
      if (!req.user || tokenUser.role !== 'system_admin') {
        console.log(`[Business Routes] Admin businesses - access denied for role: ${tokenUser?.role}`);
        return res.status(403).json({ 
          success: false, 
          message: 'System admin role required',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      console.log(`[Business Routes] Admin businesses - access granted for system admin: ${tokenUser.userId}`);
      await BusinessController.getAllBusinesses(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in admin businesses endpoint:', error);
      next(error);
    }
  }
);

router.post(
  '/businesses-admin',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      console.log('[Business Routes] POST /businesses-admin - starting');
      console.log('[Business Routes] req.user:', JSON.stringify(req.user, null, 2));
      console.log('[Business Routes] req.body:', JSON.stringify(req.body, null, 2));
      
      // Check system admin role inline
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      console.log('[Business Routes] Extracted tokenUser:', JSON.stringify(tokenUser, null, 2));
      
      if (!req.user) {
        console.log('[Business Routes] ERROR: No req.user found');
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required',
          debug: 'No req.user'
        });
      }
      
      if (tokenUser.role !== 'system_admin') {
        console.log('[Business Routes] ERROR: Role check failed');
        console.log('[Business Routes] Expected: system_admin, Got:', tokenUser.role);
        return res.status(403).json({ 
          success: false, 
          message: 'System admin role required',
          userRole: tokenUser?.role || 'none',
          debug: 'Role check failed'
        });
      }
      
      console.log('[Business Routes] Role check passed, calling controller');
      await BusinessController.createBusiness(req, res);
      console.log('[Business Routes] Controller call completed');
    } catch (error) {
      console.error('[Business Routes] Error in create business endpoint:', error);
      next(error);
    }
  }
);

router.get(
  '/businesses-admin/:businessId',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      console.log(`[Business Routes] Get business by ID - checking access for user: ${tokenUser?.userId}, role: ${tokenUser?.role}`);
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      // Allow system_admin or restaurant_admin with matching businessId
      const { businessId } = req.params;
      const hasAccess = tokenUser.role === 'system_admin' || 
                       (tokenUser.role === 'restaurant_admin' && tokenUser.businessId === businessId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.getBusinessById(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in get business by ID endpoint:', error);
      next(error);
    }
  }
);

router.put(
  '/businesses-admin/:businessId',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      // Allow system_admin or restaurant_admin with matching businessId
      const { businessId } = req.params;
      const hasAccess = tokenUser.role === 'system_admin' || 
                       (tokenUser.role === 'restaurant_admin' && tokenUser.businessId === businessId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.updateBusiness(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in update business endpoint:', error);
      next(error);
    }
  }
);

router.post(
  '/businesses-admin/:businessId/deactivate',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user || tokenUser.role !== 'system_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'System admin role required',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.deactivateBusiness(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in deactivate business endpoint:', error);
      next(error);
    }
  }
);

router.post(
  '/businesses-admin/:businessId/activate',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user || tokenUser.role !== 'system_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'System admin role required',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.activateBusiness(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in activate business endpoint:', error);
      next(error);
    }
  }
);

// Owner-specific routes
router.get(
  '/businesses-admin/my-business',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      console.log(`[Business Routes] My business - checking access for user: ${tokenUser?.userId}, role: ${tokenUser?.role}, businessId: ${tokenUser?.businessId}`);
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      if (tokenUser.role !== 'restaurant_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Restaurant admin role required',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      if (!tokenUser.businessId) {
        return res.status(403).json({ 
          success: false, 
          message: 'No business associated with this user'
        });
      }
      
      await BusinessController.getMyBusiness(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in my business endpoint:', error);
      next(error);
    }
  }
);

// Add frontend-compatible route for /businesses/my-business
router.get(
  '/businesses/my-business',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      console.log(`[Business Routes] My business (frontend compatible) - checking access for user: ${tokenUser?.userId}, role: ${tokenUser?.role}, businessId: ${tokenUser?.businessId}`);
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      if (tokenUser.role !== 'restaurant_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Restaurant admin role required',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      if (!tokenUser.businessId) {
        return res.status(403).json({ 
          success: false, 
          message: 'No business associated with this user'
        });
      }
      
      await BusinessController.getMyBusiness(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in my business endpoint (frontend compatible):', error);
      next(error);
    }
  }
);

// New route for restaurant admins to get their own business by ID
router.get(
  '/businesses/:businessId',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      const { businessId } = req.params;

      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }

      if (tokenUser.role !== 'restaurant_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. This route is for restaurant admins only.',
          userRole: tokenUser?.role || 'none'
        });
      }

      if (tokenUser.businessId !== businessId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only access your own business data.',
        });
      }

      // We can reuse the getBusinessById controller method. 
      // It will handle the actual fetching of the business data.
      await BusinessController.getBusinessById(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in get business by ID for restaurant admin:', error);
      next(error);
    }
  }
);

// Business user management routes
router.get(
  '/businesses-admin/:businessId/users',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      // Allow system_admin or restaurant_admin with matching businessId
      const { businessId } = req.params;
      const hasAccess = tokenUser.role === 'system_admin' || 
                       (tokenUser.role === 'restaurant_admin' && tokenUser.businessId === businessId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.getBusinessUsers(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in get business users endpoint:', error);
      next(error);
    }
  }
);

router.post(
  '/businesses-admin/:businessId/users',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      // Allow system_admin or restaurant_admin with matching businessId
      const { businessId } = req.params;
      const hasAccess = tokenUser.role === 'system_admin' || 
                       (tokenUser.role === 'restaurant_admin' && tokenUser.businessId === businessId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.createBusinessUser(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in create business user endpoint:', error);
      next(error);
    }
  }
);

router.put(
  '/businesses-admin/:businessId/users/:userId',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      // Allow system_admin or restaurant_admin with matching businessId
      const { businessId } = req.params;
      const hasAccess = tokenUser.role === 'system_admin' || 
                       (tokenUser.role === 'restaurant_admin' && tokenUser.businessId === businessId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.updateBusinessUser(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in update business user endpoint:', error);
      next(error);
    }
  }
);

router.delete(
  '/businesses-admin/:businessId/users/:userId',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      // Allow system_admin or restaurant_admin with matching businessId
      const { businessId } = req.params;
      const hasAccess = tokenUser.role === 'system_admin' || 
                       (tokenUser.role === 'restaurant_admin' && tokenUser.businessId === businessId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.deleteBusinessUser(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in delete business user endpoint:', error);
      next(error);
    }
  }
);

// Add frontend-compatible routes to match what the frontend expects
// Frontend expects /admin/businesses but this conflicts with auth service, so use /business-admin/businesses
router.get(
  '/business-admin/businesses',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      // Check system admin role inline (same logic as requireSystemAdminRole)
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      console.log(`[Business Routes] Business admin businesses (frontend compatible) - checking role for user: ${tokenUser?.userId}, role: ${tokenUser?.role}`);
      
      if (!req.user || tokenUser.role !== 'system_admin') {
        console.log(`[Business Routes] Business admin businesses (frontend compatible) - access denied for role: ${tokenUser?.role}`);
        return res.status(403).json({ 
          success: false, 
          message: 'System admin role required',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      console.log(`[Business Routes] Business admin businesses (frontend compatible) - access granted for system admin: ${tokenUser.userId}`);
      await BusinessController.getAllBusinesses(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in business admin businesses endpoint (frontend compatible):', error);
      next(error);
    }
  }
);

router.post(
  '/business-admin/businesses',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      console.log('[Business Routes] POST /business-admin/businesses (frontend compatible) - starting');
      console.log('[Business Routes] req.user:', JSON.stringify(req.user, null, 2));
      console.log('[Business Routes] req.body:', JSON.stringify(req.body, null, 2));
      
      // Check system admin role inline
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      console.log('[Business Routes] Extracted tokenUser:', JSON.stringify(tokenUser, null, 2));
      
      if (!req.user) {
        console.log('[Business Routes] ERROR: No req.user found');
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required',
          debug: 'No req.user'
        });
      }
      
      if (tokenUser.role !== 'system_admin') {
        console.log('[Business Routes] ERROR: Role check failed');
        console.log('[Business Routes] Expected: system_admin, Got:', tokenUser.role);
        return res.status(403).json({ 
          success: false, 
          message: 'System admin role required',
          userRole: tokenUser?.role || 'none',
          debug: 'Role check failed'
        });
      }
      
      console.log('[Business Routes] Role check passed, calling controller');
      await BusinessController.createBusiness(req, res);
      console.log('[Business Routes] Controller call completed');
    } catch (error) {
      console.error('[Business Routes] Error in create business endpoint (frontend compatible):', error);
      next(error);
    }
  }
);

// Business user management routes - frontend compatible
router.get(
  '/business-admin/businesses/:businessId/users',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      // Allow system_admin or restaurant_admin with matching businessId
      const { businessId } = req.params;
      const hasAccess = tokenUser.role === 'system_admin' || 
                       (tokenUser.role === 'restaurant_admin' && tokenUser.businessId === businessId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.getBusinessUsers(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in get business users endpoint (frontend compatible):', error);
      next(error);
    }
  }
);

router.post(
  '/business-admin/businesses/:businessId/users',
  authenticateFlexible,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required'
        });
      }
      
      // Allow system_admin or restaurant_admin with matching businessId
      const { businessId } = req.params;
      const hasAccess = tokenUser.role === 'system_admin' || 
                       (tokenUser.role === 'restaurant_admin' && tokenUser.businessId === businessId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          userRole: tokenUser?.role || 'none'
        });
      }
      
      await BusinessController.createBusinessUser(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in create business user endpoint (frontend compatible):', error);
      next(error);
    }
  }
);

// Public business registration endpoint
router.post(
  '/register',
  async (req: any, res: any, next: any) => {
    try {
      console.log('[Business Routes] POST /register - business registration');
      console.log('[Business Routes] req.body:', JSON.stringify(req.body, null, 2));
      
      await BusinessController.registerBusiness(req, res);
    } catch (error) {
      console.error('[Business Routes] Error in business registration endpoint:', error);
      next(error);
    }
  }
);

export default router; 