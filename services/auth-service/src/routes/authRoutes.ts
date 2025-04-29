import express from 'express';
import passport from 'passport';
import AuthController from '../controllers/AuthController';
import { requirePermission } from '../middleware/rbacMiddleware';
import { authenticateWithCookie, requireCustomerRole } from '../middleware/auth';
import { RbacService } from '../services/RbacService';

const router = express.Router();
const rbacService = new RbacService();

// Registration and login routes
router.post('/register', async (req, res): Promise<void> => {
  await AuthController.register(req, res);
});

router.post('/login', async (req, res): Promise<void> => {
  await AuthController.login(req, res);
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
router.get('/me', authenticateWithCookie, async (req, res, next): Promise<void> => {
  try {
    // User ID comes from the JWT middleware
    const userId = req.user?.id;
    
    if (!userId) {
      const error = new Error('Not authenticated');
      (error as any).statusCode = 401;
      throw error;
    }
    
    // Find the user
    const user = await AuthController.getUserById(userId);
    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }
    
    // Return user data (excluding password)
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    next(error);
  }
});

// Check authentication status
router.get('/check', (req, res) => {
  const isAuthenticated = !!req.cookies.access_token;
  res.status(200).json({ isAuthenticated });
});

// User-Role management routes
router.get(
  '/users/:id/roles',
  authenticateWithCookie,
  requirePermission('users', 'read'),
  async (req, res, next): Promise<void> => {
    try {
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

// User-Permission management routes
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

router.post(
  '/users/:id/permissions',
  authenticateWithCookie,
  requirePermission('users', 'update'),
  async (req, res, next): Promise<void> => {
    try {
      const { permissionId } = req.body;
      
      if (!permissionId) {
        const error = new Error('Permission ID is required');
        (error as any).statusCode = 400;
        throw error;
      }
      
      const success = await rbacService.assignPermissionToUser(req.params.id, permissionId);
      
      if (!success) {
        const error = new Error('User or permission not found');
        (error as any).statusCode = 404;
        throw error;
      }
      
      res.status(200).json({ message: 'Permission assigned successfully' });
    } catch (error) {
      console.error('Error assigning permission to user:', error);
      next(error);
    }
  }
);

router.delete(
  '/users/:id/permissions/:permissionId',
  authenticateWithCookie,
  requirePermission('users', 'update'),
  async (req, res, next): Promise<void> => {
    try {
      const success = await rbacService.removePermissionFromUser(req.params.id, req.params.permissionId);
      
      if (!success) {
        const error = new Error('User or permission not found');
        (error as any).statusCode = 404;
        throw error;
      }
      
      res.status(200).json({ message: 'Permission removed successfully' });
    } catch (error) {
      console.error('Error removing permission from user:', error);
      next(error);
    }
  }
);

export default router;
