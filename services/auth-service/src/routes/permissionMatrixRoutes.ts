import express from 'express';
import { PermissionMatrixController } from '../controllers/PermissionMatrixController';
import { authenticateWithCookie, requireSystemAdminRole, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth.types';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateWithCookie);

// Permission Matrix Management Routes

/**
 * GET /permission-matrix
 * Get the permission matrix showing all resources and actions
 * Accessible to system_admin and restaurant_admin
 */
router.get(
  '/permission-matrix',
  requireRole(['system_admin', 'restaurant_admin']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await PermissionMatrixController.getPermissionMatrix(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /permissions/create-selected
 * Create permissions for selected resources and actions
 * Only system admins can create new permissions
 */
router.post(
  '/permissions/create-selected',
  requireSystemAdminRole,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await PermissionMatrixController.createSelectedPermissions(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /permissions
 * Get all permissions with details
 */
router.get(
  '/permissions',
  requireRole(['system_admin', 'restaurant_admin']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await PermissionMatrixController.getAllPermissions(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /roles
 * Get all roles with their permissions
 */
router.get(
  '/roles',
  requireRole(['system_admin', 'restaurant_admin']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await PermissionMatrixController.getAllRolesWithPermissions(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /roles/create
 * Create a new role with selected permissions
 * System admins can create system roles, restaurant admins can create business roles
 */
router.post(
  '/roles/create',
  requireRole(['system_admin', 'restaurant_admin']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await PermissionMatrixController.createRoleWithPermissions(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /permissions
 * Delete selected permissions
 * Only system admins can delete permissions
 */
router.delete(
  '/permissions',
  requireSystemAdminRole,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await PermissionMatrixController.deletePermissions(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router; 