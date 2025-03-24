import express, { Request, Response, NextFunction } from 'express';
import { PermissionController } from '../controllers/PermissionController';
import { requirePermission } from '../middleware/rbacMiddleware';
import { PermissionCheckController } from '../controllers/PermissionCheckController';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();
const permissionController = new PermissionController();
const permissionCheckController = new PermissionCheckController();

// Get all permissions
router.get(
  '/',
  requirePermission('permissions', 'read'),
  permissionController.getAllPermissions
);

// Get a permission by ID
router.get(
  '/:id',
  requirePermission('permissions', 'read'),
  permissionController.getPermissionById
);

// Create a new permission
router.post(
  '/',
  requirePermission('permissions', 'create'),
  permissionController.createPermission
);

// Update a permission
router.patch(
  '/:id',
  requirePermission('permissions', 'update'),
  permissionController.updatePermission
);

// Delete a permission
router.delete(
  '/:id',
  requirePermission('permissions', 'delete'),
  permissionController.deletePermission
);

// Get permissions by resource
router.get(
  '/resource/:resource',
  requirePermission('permissions', 'read'),
  permissionController.getPermissionsByResource
);

// Create multiple permissions at once
router.post(
  '/batch',
  requirePermission('permissions', 'create'),
  permissionController.createMultiplePermissions
);

// Route to check if a user has a specific permission (using @ts-ignore to bypass type check issues)
// @ts-ignore - Express route handler type issues
router.post('/check', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await permissionCheckController.checkPermission(req, res);
  } catch (error) {
    next(error);
  }
});

export default router; 