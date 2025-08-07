import express, { Request, Response, NextFunction } from 'express';
import { RoleController } from '../controllers/RoleController';
import { PermissionController } from '../controllers/PermissionController';
import { UserRoleAssignmentController } from '../controllers/UserRoleAssignmentController';
import { RbacService } from '../services/RbacService';
import { authenticateWithCookie } from '../middleware/auth';
import { requirePermission } from '../middleware/rbacMiddleware';
import { AuthenticatedRequest } from '../types/auth.types';

const router = express.Router();
const roleController = new RoleController();
const permissionController = new PermissionController();
const userRoleAssignmentController = new UserRoleAssignmentController();
const rbacService = new RbacService();

// Helper function to wrap async routes
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Role Management Routes
router.get('/roles', authenticateWithCookie, asyncHandler(roleController.getAllRoles));
router.get('/roles/:id', authenticateWithCookie, asyncHandler(roleController.getRoleById));
router.post('/roles', authenticateWithCookie, asyncHandler(roleController.createRole));
router.put('/roles/:id', authenticateWithCookie, asyncHandler(roleController.updateRole));
router.delete('/roles/:id', authenticateWithCookie, asyncHandler(roleController.deleteRole));

// Permission Management Routes
router.get('/permissions', authenticateWithCookie, asyncHandler(permissionController.getAllPermissions));
router.get('/permissions/:id', authenticateWithCookie, asyncHandler(permissionController.getPermissionById));
router.post('/permissions', authenticateWithCookie, asyncHandler(permissionController.createPermission));
router.post('/permissions/batch', authenticateWithCookie, asyncHandler(permissionController.createMultiplePermissions));
router.put('/permissions/:id', authenticateWithCookie, asyncHandler(permissionController.updatePermission));
router.delete('/permissions/:id', authenticateWithCookie, asyncHandler(permissionController.deletePermission));

// Get permissions by resource for UI display
router.get('/permissions/by-resource/:resource', authenticateWithCookie, asyncHandler(permissionController.getPermissionsByResource));

// User Role Assignment Routes
router.get('/users/:userId/roles', authenticateWithCookie, asyncHandler(userRoleAssignmentController.getUserRoles));
router.post('/users/:userId/assign-role', authenticateWithCookie, asyncHandler(userRoleAssignmentController.assignRoleToUser));
router.delete('/users/:userId/remove-role/:roleId', authenticateWithCookie, asyncHandler(userRoleAssignmentController.removeRoleFromUser));

// User Permission Routes (read-only, permissions come from roles)
router.get('/users/:userId/permissions', authenticateWithCookie, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const permissions = await rbacService.getUserPermissions(userId);
  res.status(200).json({ permissions });
}));

// Role Permission Management
router.post('/roles/:roleId/permissions/:permissionId', authenticateWithCookie, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roleId, permissionId } = req.params;
  const success = await rbacService.assignPermissionToRole(roleId, permissionId);
  
  if (!success) {
    res.status(404).json({ message: 'Role or permission not found' });
    return;
  }
  
  res.status(200).json({ message: 'Permission assigned to role successfully' });
}));

router.delete('/roles/:roleId/permissions/:permissionId', authenticateWithCookie, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roleId, permissionId } = req.params;
  const success = await rbacService.removePermissionFromRole(roleId, permissionId);
  
  if (!success) {
    res.status(404).json({ message: 'Role or permission not found' });
    return;
  }
  
  res.status(200).json({ message: 'Permission removed from role successfully' });
}));

// Bulk operations for UI convenience
router.post('/roles/:roleId/permissions/bulk', authenticateWithCookie, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roleId } = req.params;
  const { permissionIds } = req.body;
  
  if (!Array.isArray(permissionIds)) {
    res.status(400).json({ message: 'permissionIds must be an array' });
    return;
  }
  
  const results = await Promise.all(
    permissionIds.map(permissionId => rbacService.assignPermissionToRole(roleId, permissionId))
  );
  
  const successCount = results.filter(Boolean).length;
  res.status(200).json({ 
    message: `${successCount} of ${permissionIds.length} permissions assigned successfully` 
  });
}));

// Get available resources and actions for permission creation
router.get('/resources', authenticateWithCookie, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Define available resources and actions for the RBAC system
  const resourceActions = {
    users: ['create', 'read', 'update', 'delete'],
    roles: ['create', 'read', 'update', 'delete'],
    permissions: ['create', 'read', 'update', 'delete'],
    businesses: ['create', 'read', 'update', 'delete'],
    restaurants: ['create', 'read', 'update', 'delete'],
    venues: ['create', 'read', 'update', 'delete'],
    tables: ['create', 'read', 'update', 'delete'],
    categories: ['create', 'read', 'update', 'delete'],
    menu_items: ['create', 'read', 'update', 'delete'],
    orders: ['create', 'read', 'update', 'delete'],
    payments: ['create', 'read', 'update', 'delete'],
    notifications: ['create', 'read', 'update', 'delete'],
    analytics: ['read'],
    reports: ['read', 'create'],
    settings: ['read', 'update']
  };
  
  res.status(200).json({ resources: resourceActions });
}));

export default router; 