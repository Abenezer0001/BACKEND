import { Request, Response } from 'express';
import { Role, IRole } from '../models/role.model';
import { Permission } from '../models/permission.model';
import mongoose from 'mongoose';

export class RoleController {
  /**
   * Get all roles
   */
  async getAllRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = await Role.find().populate('permissions');
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
   * Create a new role
   */
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, permissions } = req.body;
      
      // Check if role with the same name already exists
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        res.status(400).json({ message: 'Role with this name already exists' });
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
      
      const role = new Role({
        name,
        description,
        permissions: permissions || []
      });
      
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