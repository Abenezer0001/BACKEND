import { Request, Response } from 'express';
import { Role, IRole, getRolesByBusinessId, getSystemRoles } from '../models/role.model';
import { Permission } from '../models/permission.model';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types/auth.types';

export class RoleController {
  /**
   * Get all roles (business-scoped for Owners, all for SuperAdmins except customer roles)
   */
  async getAllRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      let roles: IRole[];

      console.log('Getting roles for user:', { 
        userId: user?.userId, // Using the correct property from JWTPayload
        role: user?.role,
        businessId: user?.businessId,
        restaurantId: user?.restaurantId 
      });

      if (user?.role === 'system_admin') {
        // System admin can see all roles except customer roles
        roles = await Role.find({ name: { $ne: 'customer' } }).populate('permissions');
        console.log(`Found ${roles.length} roles for system admin (excluding customer roles)`);
      } else if (user?.businessId) {
        // Restaurant admin can see system roles + their business roles
        roles = await getRolesByBusinessId(user.businessId);
        // Filter out system_admin role for restaurant admins
        roles = roles.filter(role => role.name !== 'system_admin');
        console.log(`Found ${roles.length} roles for restaurant admin with businessId: ${user.businessId}`);
      } else {
        // Return only system roles for users without business
        roles = await getSystemRoles();
        // Filter out system_admin and customer roles for regular users
        roles = roles.filter(role => !['system_admin', 'customer'].includes(role.name));
        console.log(`Found ${roles.length} system roles for user without business`);
      }

      res.status(200).json(roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Error fetching roles' });
    }
  }

  /**
   * Get a role by ID
   */
  async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const role = await Role.findById(id).populate('permissions');
      
      if (!role) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }
      
      res.status(200).json(role);
    } catch (error) {
      console.error('Error fetching role:', error);
      res.status(500).json({ message: 'Error fetching role' });
    }
  }

  /**
   * Create a new role (business-scoped for Owners)
   */
  async createRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description, permissions } = req.body;
      const user = req.user;
      
      // Check authorization - must be system_admin or restaurant_admin with a businessId
      if (user?.role !== 'system_admin' && !user?.businessId) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      // Restaurant admin should not be able to create system admin roles
      if (user?.role !== 'system_admin' && name === 'system_admin') {
        res.status(403).json({ message: 'Restaurant admins cannot create system admin roles' });
        return;
      }

      // Check if role with the same name already exists in the same scope
      let existingRole;
      if (user?.role === 'system_admin') {
        // SuperAdmin can create system roles - check global uniqueness for system roles
        existingRole = await Role.findOne({ 
          name, 
          $or: [{ scope: 'system' }, { businessId: null }]
        });
      } else {
        // Business Owner - check uniqueness within business scope
        existingRole = await Role.findOne({ 
          name, 
          businessId: user.businessId 
        });
      }

      if (existingRole) {
        res.status(400).json({ message: 'Role with this name already exists in your scope' });
        return;
      }
      
      // Validate permissions if provided
      if (permissions && permissions.length > 0) {
        const permissionIds = permissions.map((id: string) => 
          new mongoose.Types.ObjectId(id)
        );
        
        const permissionsExist = await Permission.countDocuments({
          _id: { $in: permissionIds }
        });
        
        if (permissionsExist !== permissions.length) {
          res.status(400).json({ message: 'One or more permissions do not exist' });
          return;
        }
      }
      
      // For logging
      console.log('Creating role with user context:', {
        userRole: user?.role,
        businessId: user?.businessId,
        name: name
      });

      const roleData: Partial<IRole> = {
        name,
        description,
        permissions: permissions || []
      };

      // Set business scope
      if (user?.role === 'system_admin') {
        if (name === 'restaurant_admin') {
          // Special case: restaurant_admin role should always have scope='business'
          roleData.scope = 'business';
          roleData.isSystemRole = true;
          // Don't set businessId for the template restaurant_admin role
        } else {
          roleData.scope = 'system';
          roleData.isSystemRole = true;
          roleData.businessId = undefined;
        }
      } else {
        // Always set the businessId for roles created by restaurant admins
        roleData.scope = 'business';
        roleData.isSystemRole = false;
        roleData.businessId = new mongoose.Types.ObjectId(user.businessId);
      }
      
      const role = new Role(roleData);
      await role.save();
      
      res.status(201).json(role);
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ message: 'Error creating role' });
    }
  }

  /**
   * Update a role
   */
  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      // Check if role exists
      const role = await Role.findById(id);
      if (!role) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }
      
      // Check if new name conflicts with existing role
      if (name && name !== role.name) {
        const existingRole = await Role.findOne({ name });
        if (existingRole) {
          res.status(400).json({ message: 'Role with this name already exists' });
          return;
        }
      }
      
      const updatedRole = await Role.findByIdAndUpdate(
        id,
        { name, description },
        { new: true }
      ).populate('permissions');
      
      res.status(200).json(updatedRole);
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: 'Error updating role' });
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if role exists
      const role = await Role.findById(id);
      if (!role) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }
      
      await Role.findByIdAndDelete(id);
      res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: 'Error deleting role' });
    }
  }

  /**
   * Get permissions for a role
   */
  async getRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const role = await Role.findById(id).populate('permissions');
      if (!role) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }
      
      res.status(200).json(role.permissions);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({ message: 'Error fetching role permissions' });
    }
  }

  /**
   * Add permissions to a role
   */
  async addPermissionsToRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      
      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        res.status(400).json({ message: 'Permissions array is required' });
        return;
      }
      
      // Check if role exists
      const role = await Role.findById(id);
      if (!role) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }
      
      // Validate permissions
      const permissionIds = permissions.map((id: string) => 
        new mongoose.Types.ObjectId(id)
      );
      
      const permissionsExist = await Permission.countDocuments({
        _id: { $in: permissionIds }
      });
      
      if (permissionsExist !== permissions.length) {
        res.status(400).json({ message: 'One or more permissions do not exist' });
        return;
      }
      
      // Add permissions to role
      const updatedRole = await Role.findByIdAndUpdate(
        id,
        { $addToSet: { permissions: { $each: permissionIds } } },
        { new: true }
      ).populate('permissions');
      
      res.status(200).json(updatedRole);
    } catch (error) {
      console.error('Error adding permissions to role:', error);
      res.status(500).json({ message: 'Error adding permissions to role' });
    }
  }

  /**
   * Remove a permission from a role
   */
  async removePermissionFromRole(req: Request, res: Response): Promise<void> {
    try {
      const { id, permissionId } = req.params;
      
      // Check if role exists
      const role = await Role.findById(id);
      if (!role) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }
      
      // Check if permission exists
      const permission = await Permission.findById(permissionId);
      if (!permission) {
        res.status(404).json({ message: 'Permission not found' });
        return;
      }
      
      // Remove permission from role
      const updatedRole = await Role.findByIdAndUpdate(
        id,
        { $pull: { permissions: permissionId } },
        { new: true }
      ).populate('permissions');
      
      res.status(200).json(updatedRole);
    } catch (error) {
      console.error('Error removing permission from role:', error);
      res.status(500).json({ message: 'Error removing permission from role' });
    }
  }
} 