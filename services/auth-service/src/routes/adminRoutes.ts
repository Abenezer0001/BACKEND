import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import roleRoutes from './roleRoutes';
import permissionRoutes from './permissionRoutes';
import { authenticateJWT } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbacMiddleware';
import { RbacService } from '../services/RbacService';

const router = express.Router();
const rbacService = new RbacService();

// Apply authentication middleware to all admin routes
router.use(authenticateJWT);

// Apply authorization middleware to ensure admin access
router.use((req, res, next) => requireRole(['system_admin', 'restaurant_admin'])(req, res, next));

// Mount role and permission routes
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);

// Route for assigning a role to a user
router.put('/users/:userId/roles/:roleId', (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    try {
      const { userId, roleId } = req.params;
      
      const result = await rbacService.assignRoleToUser(userId, roleId);
      
      if (!result) {
        return res.status(404).json({ message: 'User or role not found' });
      }
      
      res.status(200).json({ 
        message: 'Role assigned successfully',
        userId,
        roleId
      });
    } catch (error) {
      console.error('Error assigning role to user:', error);
      res.status(500).json({ message: 'Error assigning role to user' });
    }
  })();
});

// Route for removing a role from a user
router.delete('/users/:userId/roles/:roleId', (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    try {
      const { userId, roleId } = req.params;
      
      const result = await rbacService.removeRoleFromUser(userId, roleId);
      
      if (!result) {
        return res.status(404).json({ message: 'User or role not found' });
      }
      
      res.status(200).json({ 
        message: 'Role removed successfully',
        userId,
        roleId
      });
    } catch (error) {
      console.error('Error removing role from user:', error);
      res.status(500).json({ message: 'Error removing role from user' });
    }
  })();
});

// Route for getting user permissions
router.get('/users/:userId/permissions', (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    try {
      const { userId } = req.params;
      
      const permissions = await rbacService.getUserPermissions(userId);
      
      res.status(200).json({ permissions });
    } catch (error) {
      console.error('Error getting user permissions:', error);
      res.status(500).json({ message: 'Error getting user permissions' });
    }
  })();
});

// Route for assigning a direct permission to a user
router.put('/users/:userId/permissions/:permissionId', (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    try {
      const { userId, permissionId } = req.params;
      
      const result = await rbacService.assignPermissionToUser(userId, permissionId);
      
      if (!result) {
        return res.status(404).json({ message: 'User or permission not found' });
      }
      
      res.status(200).json({ 
        message: 'Permission assigned successfully',
        userId,
        permissionId
      });
    } catch (error) {
      console.error('Error assigning permission to user:', error);
      res.status(500).json({ message: 'Error assigning permission to user' });
    }
  })();
});

// Route for removing a direct permission from a user
router.delete('/users/:userId/permissions/:permissionId', (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    try {
      const { userId, permissionId } = req.params;
      
      const result = await rbacService.removePermissionFromUser(userId, permissionId);
      
      if (!result) {
        return res.status(404).json({ message: 'User or permission not found' });
      }
      
      res.status(200).json({ 
        message: 'Permission removed successfully',
        userId,
        permissionId
      });
    } catch (error) {
      console.error('Error removing permission from user:', error);
      res.status(500).json({ message: 'Error removing permission from user' });
    }
  })();
});

export default router;
