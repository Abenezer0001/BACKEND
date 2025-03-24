import User from '../models/user.model';
import { Role, IRole } from '../models/role.model';
import { Permission, IPermission } from '../models/permission.model';
import mongoose from 'mongoose';

export class RbacService {
  /**
   * Check if a user has a specific permission for a resource and action
   */
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      // Find the user and populate roles and direct permissions
      const user = await User.findById(userId)
        .populate({
          path: 'roles',
          populate: {
            path: 'permissions'
          }
        })
        .populate('directPermissions');
      
      if (!user) {
        return false;
      }
      
      // Check direct permissions first
      if (user.directPermissions && Array.isArray(user.directPermissions)) {
        const hasDirectPermission = user.directPermissions.some((permission: any) =>
          permission.resource === resource && permission.action === action
        );
        
        if (hasDirectPermission) {
          return true;
        }
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
      const user = await User.findById(userId)
        .populate({
          path: 'roles',
          populate: {
            path: 'permissions'
          }
        })
        .populate('directPermissions');
      
      if (!user) {
        return [];
      }
      
      const permissions = new Set();
      
      // Add direct permissions
      if (user.directPermissions && Array.isArray(user.directPermissions)) {
        user.directPermissions.forEach((permission: any) => {
          permissions.add(JSON.stringify(permission));
        });
      }
      
      // Add permissions from roles
      if (user.roles && Array.isArray(user.roles)) {
        for (const role of user.roles) {
          // Skip if role is just a string ID
          if (typeof role === 'string') continue;
          
          const roleObj = role as IRole;
          if (roleObj.permissions && Array.isArray(roleObj.permissions)) {
            roleObj.permissions.forEach((permission: any) => {
              permissions.add(JSON.stringify(permission));
            });
          }
        }
      }
      
      // Convert back to objects
      return Array.from(permissions).map(p => JSON.parse(p as string));
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }
  
  /**
   * Assign a direct permission to a user
   */
  async assignPermissionToUser(userId: string, permissionId: string): Promise<boolean> {
    try {
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
