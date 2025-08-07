import express, { Request, Response, NextFunction } from 'express';
import { RoleController } from '../controllers/RoleController';
import { requirePermission } from '../middleware/rbacMiddleware';

const router = express.Router();
const roleController = new RoleController();

// Wrapper functions to handle controller method types
const wrapController = (controllerMethod: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = controllerMethod(req, res);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
};

// Get all roles
router.get(
  '/',
  requirePermission('roles', 'read'),
  wrapController(roleController.getAllRoles.bind(roleController))
);

// Get a role by ID
router.get(
  '/:id',
  requirePermission('roles', 'read'),
  wrapController(roleController.getRoleById.bind(roleController))
);

// Create a new role
router.post(
  '/',
  requirePermission('roles', 'create'),
  wrapController(roleController.createRole.bind(roleController))
);

// Update a role
router.patch(
  '/:id',
  requirePermission('roles', 'update'),
  wrapController(roleController.updateRole.bind(roleController))
);

// Delete a role
router.delete(
  '/:id',
  requirePermission('roles', 'delete'),
  wrapController(roleController.deleteRole.bind(roleController))
);

// Get permissions for a role
router.get(
  '/:id/permissions',
  requirePermission('roles', 'read'),
  wrapController(roleController.getRolePermissions.bind(roleController))
);

// Add permissions to a role
router.post(
  '/:id/permissions',
  requirePermission('roles', 'update'),
  wrapController(roleController.addPermissionsToRole.bind(roleController))
);

// Remove a permission from a role
router.delete(
  '/:id/permissions/:permissionId',
  requirePermission('roles', 'update'),
  wrapController(roleController.removePermissionFromRole.bind(roleController))
);

export default router; 