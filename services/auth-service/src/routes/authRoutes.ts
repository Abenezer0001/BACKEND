import express from 'express';
import AuthController from '../controllers/AuthController';
import { requirePermission } from '../middleware/rbacMiddleware';
import { RbacService } from '../services/RbacService';

const router = express.Router();
const rbacService = new RbacService();

// Authentication routes
router.post('/register', async (req, res): Promise<void> => {
  await AuthController.register(req, res);
});
router.post('/login', async (req, res): Promise<void> => {
  await AuthController.login(req, res);
});
router.post('/refresh-token', async (req, res): Promise<void> => {
  await AuthController.refreshToken(req, res);
});
router.post('/logout', async (req, res): Promise<void> => {
  await AuthController.logout(req, res);
});

// User-Role management routes
router.get(
  '/users/:id/roles',
  requirePermission('users', 'read'),
  async (req, res): Promise<void> => {
    try {
      const user = await AuthController.getUserById(req.params.id);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Populate roles
      await user.populate('roles');
      res.status(200).json(user.roles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      res.status(500).json({ message: 'Error fetching user roles' });
    }
  }
);

router.post(
  '/users/:id/roles',
  requirePermission('users', 'update'),
  async (req, res): Promise<void> => {
    try {
      const { roleId } = req.body;
      
      if (!roleId) {
        res.status(400).json({ message: 'Role ID is required' });
        return;
      }
      
      const success = await rbacService.assignRoleToUser(req.params.id, roleId);
      
      if (!success) {
        res.status(404).json({ message: 'User or role not found' });
        return;
      }
      
      res.status(200).json({ message: 'Role assigned successfully' });
    } catch (error) {
      console.error('Error assigning role to user:', error);
      res.status(500).json({ message: 'Error assigning role to user' });
    }
  }
);

router.delete(
  '/users/:id/roles/:roleId',
  requirePermission('users', 'update'),
  async (req, res): Promise<void> => {
    try {
      const success = await rbacService.removeRoleFromUser(req.params.id, req.params.roleId);
      
      if (!success) {
        res.status(404).json({ message: 'User or role not found' });
        return;
      }
      
      res.status(200).json({ message: 'Role removed successfully' });
    } catch (error) {
      console.error('Error removing role from user:', error);
      res.status(500).json({ message: 'Error removing role from user' });
    }
  }
);

// User-Permission management routes
router.get(
  '/users/:id/permissions',
  requirePermission('users', 'read'),
  async (req, res): Promise<void> => {
    try {
      const permissions = await rbacService.getUserPermissions(req.params.id);
      res.status(200).json(permissions);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({ message: 'Error fetching user permissions' });
    }
  }
);

router.post(
  '/users/:id/permissions',
  requirePermission('users', 'update'),
  async (req, res): Promise<void> => {
    try {
      const { permissionId } = req.body;
      
      if (!permissionId) {
        res.status(400).json({ message: 'Permission ID is required' });
        return;
      }
      
      const success = await rbacService.assignPermissionToUser(req.params.id, permissionId);
      
      if (!success) {
        res.status(404).json({ message: 'User or permission not found' });
        return;
      }
      
      res.status(200).json({ message: 'Permission assigned successfully' });
    } catch (error) {
      console.error('Error assigning permission to user:', error);
      res.status(500).json({ message: 'Error assigning permission to user' });
    }
  }
);

router.delete(
  '/users/:id/permissions/:permissionId',
  requirePermission('users', 'update'),
  async (req, res): Promise<void> => {
    try {
      const success = await rbacService.removePermissionFromUser(req.params.id, req.params.permissionId);
      
      if (!success) {
        res.status(404).json({ message: 'User or permission not found' });
        return;
      }
      
      res.status(200).json({ message: 'Permission removed successfully' });
    } catch (error) {
      console.error('Error removing permission from user:', error);
      res.status(500).json({ message: 'Error removing permission from user' });
    }
  }
);

export default router;
