import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { getPermissionModel, createPermission, getAllPermissions, IPermission } from '../models/Permission';
import { Role, createRole, getAllRoles, addPermissionsToRole } from '../models/role.model';
import mongoose from 'mongoose';

interface ResourcePermissionRequest {
  resources: string[];
  actions: string[];
}

interface PermissionMatrix {
  [resource: string]: {
    [action: string]: boolean;
  };
}

export class PermissionMatrixController {
  /**
   * Create permissions for selected resources and actions
   */
  static async createSelectedPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { resources, actions }: ResourcePermissionRequest = req.body;
      
      if (!Array.isArray(resources) || !Array.isArray(actions)) {
        res.status(400).json({
          success: false,
          message: 'Resources and actions must be arrays'
        });
        return;
      }

      console.log(`[PermissionMatrix] Creating permissions for resources: ${resources.join(', ')}, actions: ${actions.join(', ')}`);

      const createdPermissions: IPermission[] = [];
      const Permission = getPermissionModel();

      // Create permissions for each resource-action combination
      for (const resource of resources) {
        for (const action of actions) {
          try {
            // Check if permission already exists
            const existingPermission = await Permission.findOne({ resource, action }).session(session);
            
            if (existingPermission) {
              console.log(`[PermissionMatrix] Permission already exists: ${resource}:${action}`);
              createdPermissions.push(existingPermission);
              continue;
            }

            // Create new permission
            const permissionData = {
              name: `${action}_${resource}`,
              description: `Permission to ${action} ${resource}`,
              resource,
              action
            };

            const permission = new Permission(permissionData);
            const savedPermission = await permission.save({ session });
            createdPermissions.push(savedPermission);

            console.log(`[PermissionMatrix] Created permission: ${resource}:${action}`);
          } catch (error) {
            console.error(`[PermissionMatrix] Error creating permission ${resource}:${action}:`, error);
          }
        }
      }

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: `Created ${createdPermissions.length} permissions`,
        permissions: createdPermissions
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('[PermissionMatrix] Error creating permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating permissions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all available resources and actions for permission matrix
   */
  static async getPermissionMatrix(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('[PermissionMatrix] Fetching permission matrix data');

      // Define available resources in the system
      const availableResources = [
        'users',
        'roles', 
        'permissions',
        'businesses',
        'restaurants',
        'venues',
        'tables',
        'menu-items',
        'categories',
        'subcategories',
        'subsubcategories',
        'modifiers',
        'orders',
        'invoices',
        'customers',
        'inventory',
        'analytics',
        'settings'
      ];

      // Define available actions
      const availableActions = ['create', 'read', 'update', 'delete'];

      // Get all existing permissions
      const Permission = getPermissionModel();
      const existingPermissions = await Permission.find({});

      // Build permission matrix
      const permissionMatrix: PermissionMatrix = {};
      
      availableResources.forEach(resource => {
        permissionMatrix[resource] = {};
        availableActions.forEach(action => {
          const exists = existingPermissions.some(p => p.resource === resource && p.action === action);
          permissionMatrix[resource][action] = exists;
        });
      });

      // Get statistics
      const totalPossiblePermissions = availableResources.length * availableActions.length;
      const totalExistingPermissions = existingPermissions.length;

      res.status(200).json({
        success: true,
        data: {
          availableResources,
          availableActions,
          permissionMatrix,
          statistics: {
            totalPossiblePermissions,
            totalExistingPermissions,
            coveragePercentage: Math.round((totalExistingPermissions / totalPossiblePermissions) * 100)
          }
        }
      });
    } catch (error) {
      console.error('[PermissionMatrix] Error fetching permission matrix:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching permission matrix',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all permissions with details
   */
  static async getAllPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('[PermissionMatrix] Fetching all permissions');

      const permissions = await getAllPermissions();

      res.status(200).json({
        success: true,
        data: {
          permissions,
          count: permissions.length
        }
      });
    } catch (error) {
      console.error('[PermissionMatrix] Error fetching permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching permissions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all roles with their permissions
   */
  static async getAllRolesWithPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('[PermissionMatrix] Fetching all roles with permissions');

      const roles = await getAllRoles();

      res.status(200).json({
        success: true,
        data: {
          roles,
          count: roles.length
        }
      });
    } catch (error) {
      console.error('[PermissionMatrix] Error fetching roles:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching roles',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new role with selected permissions
   */
  static async createRoleWithPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { name, description, permissionIds, businessId, scope = 'business' } = req.body;
      const user = req.user;

      if (!name || !Array.isArray(permissionIds)) {
        res.status(400).json({
          success: false,
          message: 'Role name and permission IDs are required'
        });
        return;
      }

      console.log(`[PermissionMatrix] Creating role: ${name} with ${permissionIds.length} permissions`);

      // Determine role scope and business association
      let roleData: any = {
        name,
        description: description || `Custom role: ${name}`,
        permissions: permissionIds,
        scope,
        isSystemRole: false
      };

      // System admins can create system-wide roles
      if (user?.role === 'system_admin') {
        if (scope === 'system') {
          roleData.isSystemRole = true;
          roleData.businessId = null;
        } else if (businessId) {
          roleData.businessId = businessId;
        }
      } else if (user?.role === 'restaurant_admin') {
        // Restaurant admins can only create business-scoped roles for their business
        if (!user.businessId) {
          res.status(403).json({
            success: false,
            message: 'Restaurant admin must be associated with a business'
          });
          return;
        }
        roleData.businessId = user.businessId;
        roleData.scope = 'business';
      } else {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create roles'
        });
        return;
      }

      // Create the role
      const role = await createRole(roleData);
      
      await session.commitTransaction();

      console.log(`[PermissionMatrix] Successfully created role: ${role._id}`);

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        role
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('[PermissionMatrix] Error creating role:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating role',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete permissions (system admin only)
   */
  static async deletePermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { permissionIds } = req.body;
      const user = req.user;

      // Only system admins can delete permissions
      if (user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Only system administrators can delete permissions'
        });
        return;
      }

      if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Permission IDs array is required'
        });
        return;
      }

      console.log(`[PermissionMatrix] Deleting ${permissionIds.length} permissions`);

      const Permission = getPermissionModel();
      const result = await Permission.deleteMany({ _id: { $in: permissionIds } }).session(session);

      // Also remove these permissions from all roles
      await Role.updateMany(
        { permissions: { $in: permissionIds } },
        { $pull: { permissions: { $in: permissionIds } } },
        { session }
      );

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: `Deleted ${result.deletedCount} permissions and removed them from roles`
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('[PermissionMatrix] Error deleting permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting permissions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      session.endSession();
    }
  }
} 