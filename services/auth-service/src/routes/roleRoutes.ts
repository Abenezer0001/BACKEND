import express from 'express';
import { RoleController } from '../controllers/RoleController';
import { requirePermission } from '../middleware/rbacMiddleware';

const router = express.Router();
const roleController = new RoleController();

// Get all roles
router.get(
  '/',
  requirePermission('roles', 'read'),
  roleController.getAllRoles
);

// Get a role by ID
router.get(
  '/:id',
  requirePermission('roles', 'read'),
  roleController.getRoleById
);

// Create a new role
router.post(
  '/',
  requirePermission('roles', 'create'),
  roleController.createRole
);

// Update a role
router.patch(
  '/:id',
  requirePermission('roles', 'update'),
  roleController.updateRole
);

// Delete a role
router.delete(
  '/:id',
  requirePermission('roles', 'delete'),
  roleController.deleteRole
);

// Get permissions for a role
router.get(
  '/:id/permissions',
  requirePermission('roles', 'read'),
  roleController.getRolePermissions
);

// Add permissions to a role
router.post(
  '/:id/permissions',
  requirePermission('roles', 'update'),
  roleController.addPermissionsToRole
);

// Remove a permission from a role
router.delete(
  '/:id/permissions/:permissionId',
  requirePermission('roles', 'update'),
  roleController.removePermissionFromRole
);

export default router; 