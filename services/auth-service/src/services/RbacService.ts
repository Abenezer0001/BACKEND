import { getUserModel } from '../models/user.model';
import { Role, IRole } from '../models/role.model';
import { Permission, IPermission } from '../models/permission.model';
import mongoose from 'mongoose';

export class RbacService {
  /**
   * Check if a user has a specific permission for a resource and action
   */
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const User = getUserModel();
      // Find the user and populate roles
      const user = await User.findById(userId)
        .populate({
          path: 'roles',
          populate: {
            path: 'permissions'
          }
        });
      
      if (!user) {
        return false;
      }
      
      // Check permissions from roles
      if (user.roles && Array.isArray(user.roles)) {
        for (const role of user.roles) {
          // Skip if role is just a string ID
          if (typeof role === 'string') continue;
          
          const roleObj = role as IRole;
          if (roleObj.permissions && Array.isArray(roleObj.permissions)) {
            const hasPermissionFromRole = roleObj.permissions.some((permission: any) =>
              permission.resource === resource && permission.action === action
            );
            
            if (hasPermissionFromRole) {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }
  
  /**
   * Check if a user has any of the specified roles
   */
  async checkUserHasRole(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const User = getUserModel();
      const user = await User.findById(userId).populate('roles');
      
      if (!user || !user.roles || !Array.isArray(user.roles)) {
        return false;
      }
      
      return user.roles.some((role: any) => {
        if (typeof role === 'string') return false;
        return roleNames.includes((role as IRole).name);
      });
    } catch (error) {
      console.error('Error checking user roles:', error);
      return false;
    }
  }
  
  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<boolean> {
    try {
      const User = getUserModel();
      // Check if user and role exist
      const user = await User.findById(userId);
      const role = await Role.findById(roleId);
      
      if (!user || !role) {
        return false;
      }
      
      // Add role to user if not already assigned
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { roles: roleId } },
        { new: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error assigning role to user:', error);
      return false;
    }
  }
  
  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    try {
      const User = getUserModel();
      // Check if user and role exist
      const user = await User.findById(userId);
      const role = await Role.findById(roleId);
      
      if (!user || !role) {
        return false;
      }
      
      // Remove role from user
      await User.findByIdAndUpdate(
        userId,
        { $pull: { roles: roleId } },
        { new: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error removing role from user:', error);
      return false;
    }
  }
  
  /**
   * Get all permissions for a user (from roles and direct permissions)
   */
  async getUserPermissions(userId: string): Promise<any[]> {
    try {
      console.log(`[RbacService] Getting permissions for user ID: ${userId}`);
      
      const User = getUserModel();
      const user = await User.findById(userId)
        .populate({
          path: 'roles',
          populate: {
            path: 'permissions'
          }
        });
      
      if (!user) {
        console.log(`[RbacService] User not found: ${userId}`);
        return [];
      }
      
      console.log(`[RbacService] User found: ${user.email}, roles count: ${user.roles?.length || 0}`);
      
      const permissions = new Set();
        
      // Add permissions from roles
      if (user.roles && Array.isArray(user.roles)) {
        console.log(`[RbacService] Processing ${user.roles.length} roles`);
        for (const role of user.roles) {
          // Skip if role is just a string ID
          if (typeof role === 'string') {
            console.log(`[RbacService] Skipping unpopulated role ID: ${role}`);
            continue;
          }
          
          const roleObj = role as IRole;
          console.log(`[RbacService] Processing role: ${roleObj.name}, permissions count: ${roleObj.permissions?.length || 0}`);
          
          if (roleObj.permissions && Array.isArray(roleObj.permissions)) {
            roleObj.permissions.forEach((permission: any) => {
              console.log(`[RbacService] Adding role permission: ${permission.resource}:${permission.action}`);
              permissions.add(JSON.stringify(permission));
            });
          }
        }
      }
      
      // Convert back to objects
      const result = Array.from(permissions).map(p => JSON.parse(p as string));
      console.log(`[RbacService] Total unique permissions found: ${result.length}`);
      
      return result;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Assign a permission to a role
   */
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      // Check if role and permission exist
      const role = await Role.findById(roleId);
      const permission = await Permission.findById(permissionId);
      
      if (!role || !permission) {
        return false;
      }
      
      // Add permission to role if not already assigned
      await Role.findByIdAndUpdate(
        roleId,
        { $addToSet: { permissions: permissionId } },
        { new: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error assigning permission to role:', error);
      return false;
    }
  }

  /**
   * Remove a permission from a role
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      // Check if role and permission exist
      const role = await Role.findById(roleId);
      const permission = await Permission.findById(permissionId);
      
      if (!role || !permission) {
        return false;
      }
      
      // Remove permission from role
      await Role.findByIdAndUpdate(
        roleId,
        { $pull: { permissions: permissionId } },
        { new: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error removing permission from role:', error);
      return false;
    }
  }

  /**
   * Assign a direct permission to a user
   */
  async assignPermissionToUser(userId: string, permissionId: string): Promise<boolean> {
    try {
      const User = getUserModel();
      // Check if user and permission exist
      const user = await User.findById(userId);
      const permission = await Permission.findById(permissionId);
      
      if (!user || !permission) {
        return false;
      }
      
      // Add permission to user if not already assigned
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { directPermissions: permissionId } },
        { new: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error assigning permission to user:', error);
      return false;
    }
  }

  /**
   * Remove a direct permission from a user
   */
  async removePermissionFromUser(userId: string, permissionId: string): Promise<boolean> {
    try {
      const User = getUserModel();
      // Check if user and permission exist
      const user = await User.findById(userId);
      const permission = await Permission.findById(permissionId);
      
      if (!user || !permission) {
        return false;
      }
      
      // Remove permission from user
      await User.findByIdAndUpdate(
        userId,
        { $pull: { directPermissions: permissionId } },
        { new: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error removing permission from user:', error);
      return false;
    }
  }
}
