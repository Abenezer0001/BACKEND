import { Request, Response } from 'express';
import { Permission, IPermission } from '../models/permission.model';
import mongoose from 'mongoose';

export class PermissionController {
  /**
   * Get all permissions
   */
  async getAllPermissions(req: Request, res: Response): Promise<void> {
    try {
      const permissions = await Permission.find();
      res.status(200).json(permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ message: 'Error fetching permissions' });
    }
  }

  /**
   * Get a permission by ID
   */
  async getPermissionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const permission = await Permission.findById(id);
      
      if (!permission) {
        res.status(404).json({ message: 'Permission not found' });
        return;
      }
      
      res.status(200).json(permission);
    } catch (error) {
      console.error('Error fetching permission:', error);
      res.status(500).json({ message: 'Error fetching permission' });
    }
  }

  /**
   * Create a new permission
   */
  async createPermission(req: Request, res: Response): Promise<void> {
    try {
      const { resource, action, description } = req.body;
      
      // Check if permission with the same resource and action already exists
      const existingPermission = await Permission.findOne({ resource, action });
      if (existingPermission) {
        res.status(400).json({ 
          message: `Permission for ${action} on ${resource} already exists` 
        });
        return;
      }
      
      const permission = new Permission({
        resource,
        action,
        description
      });
      
      await permission.save();
      res.status(201).json(permission);
    } catch (error) {
      console.error('Error creating permission:', error);
      res.status(500).json({ message: 'Error creating permission' });
    }
  }

  /**
   * Update a permission
   */
  async updatePermission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resource, action, description } = req.body;
      
      // Check if permission exists
      const permission = await Permission.findById(id);
      if (!permission) {
        res.status(404).json({ message: 'Permission not found' });
        return;
      }
      
      // Check if new resource and action conflict with existing permission
      if ((resource && resource !== permission.resource) || 
          (action && action !== permission.action)) {
        const existingPermission = await Permission.findOne({
          resource: resource || permission.resource,
          action: action || permission.action,
          _id: { $ne: id }
        });
        
        if (existingPermission) {
          res.status(400).json({ 
            message: `Permission for ${action || permission.action} on ${resource || permission.resource} already exists` 
          });
          return;
        }
      }
      
      const updatedPermission = await Permission.findByIdAndUpdate(
        id,
        { resource, action, description },
        { new: true }
      );
      
      res.status(200).json(updatedPermission);
    } catch (error) {
      console.error('Error updating permission:', error);
      res.status(500).json({ message: 'Error updating permission' });
    }
  }

  /**
   * Delete a permission
   */
  async deletePermission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if permission exists
      const permission = await Permission.findById(id);
      if (!permission) {
        res.status(404).json({ message: 'Permission not found' });
        return;
      }
      
      await Permission.findByIdAndDelete(id);
      res.status(200).json({ message: 'Permission deleted successfully' });
    } catch (error) {
      console.error('Error deleting permission:', error);
      res.status(500).json({ message: 'Error deleting permission' });
    }
  }

  /**
   * Get permissions by resource
   */
  async getPermissionsByResource(req: Request, res: Response): Promise<void> {
    try {
      const { resource } = req.params;
      const permissions = await Permission.find({ resource });
      res.status(200).json(permissions);
    } catch (error) {
      console.error('Error fetching permissions by resource:', error);
      res.status(500).json({ message: 'Error fetching permissions by resource' });
    }
  }

  /**
   * Create multiple permissions at once
   */
  async createMultiplePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { permissions } = req.body;
      
      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        res.status(400).json({ message: 'Permissions array is required' });
        return;
      }
      
      // Validate each permission
      for (const perm of permissions) {
        if (!perm.resource || !perm.action) {
          res.status(400).json({ 
            message: 'Each permission must have resource and action fields' 
          });
          return;
        }
      }
      
      // Check for duplicates in the request
      const resourceActionPairs = permissions.map(p => `${p.resource}:${p.action}`);
      const uniquePairs = new Set(resourceActionPairs);
      
      if (uniquePairs.size !== permissions.length) {
        res.status(400).json({ 
          message: 'Duplicate resource-action pairs found in the request' 
        });
        return;
      }
      
      // Check for existing permissions
      const existingPermissions = await Permission.find({
        $or: permissions.map(p => ({ resource: p.resource, action: p.action }))
      });
      
      if (existingPermissions.length > 0) {
        const existing = existingPermissions.map(
          p => `${p.resource}:${p.action}`
        ).join(', ');
        
        res.status(400).json({ 
          message: `The following permissions already exist: ${existing}` 
        });
        return;
      }
      
      // Create all permissions
      const createdPermissions = await Permission.insertMany(permissions);
      res.status(201).json(createdPermissions);
    } catch (error) {
      console.error('Error creating multiple permissions:', error);
      res.status(500).json({ message: 'Error creating multiple permissions' });
    }
  }
} 