import { Request, Response } from 'express';
import { Permission, IPermission } from '../models/permission.model';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types/auth.types';

export class PermissionController {
  /**
   * Get all permissions (accessible to system_admin and business owners)
   */
  async getAllPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      // Check authorization
      if (user?.role !== 'system_admin' && !user?.businessId) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      const permissions = await Permission.find().sort({ resource: 1, action: 1 });
      res.status(200).json({
        permissions,
        count: permissions.length
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ message: 'Error fetching permissions' });
    }
  }

  /**
   * Get a permission by ID
   */
  async getPermissionById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;

      // Check authorization
      if (user?.role !== 'system_admin' && !user?.businessId) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

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
   * Create a new permission (system_admin only)
   */
  async createPermission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resource, action, description } = req.body;
      const user = req.user;

      // Only system admin can create permissions
      if (user?.role !== 'system_admin') {
        res.status(403).json({ message: 'Only system administrators can create permissions' });
        return;
      }
      
      // Validate required fields
      if (!resource || !action) {
        res.status(400).json({ message: 'Resource and action are required' });
        return;
      }

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
   * Update a permission (system_admin only)
   */
  async updatePermission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resource, action, description } = req.body;
      const user = req.user;

      // Only system admin can update permissions
      if (user?.role !== 'system_admin') {
        res.status(403).json({ message: 'Only system administrators can update permissions' });
        return;
      }
      
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
   * Delete a permission (system_admin only)
   */
  async deletePermission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;

      // Only system admin can delete permissions
      if (user?.role !== 'system_admin') {
        res.status(403).json({ message: 'Only system administrators can delete permissions' });
        return;
      }
      
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
  async getPermissionsByResource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resource } = req.params;
      const user = req.user;

      // Check authorization
      if (user?.role !== 'system_admin' && !user?.businessId) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      const permissions = await Permission.find({ resource }).sort({ action: 1 });
      res.status(200).json({
        permissions,
        count: permissions.length
      });
    } catch (error) {
      console.error('Error fetching permissions by resource:', error);
      res.status(500).json({ message: 'Error fetching permissions by resource' });
    }
  }

  /**
   * Create multiple permissions at once
   */
  async createMultiplePermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { permissions } = req.body;
      const user = req.user;

      // Check authorization
      if (user?.role !== 'system_admin' && !user?.businessId) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      if (!Array.isArray(permissions)) {
        res.status(400).json({ message: 'Permissions must be an array' });
        return;
      }

      // Validate each permission
      for (const permission of permissions) {
        if (!permission.resource || !permission.action) {
          res.status(400).json({ message: 'Each permission must have resource and action' });
          return;
        }
      }

      // Check for existing permissions to avoid duplicates
      const existingPermissions = await Permission.find({
        $or: permissions.map(p => ({ resource: p.resource, action: p.action }))
      });

      const existingCombinations = new Set(
        existingPermissions.map(p => `${p.resource}:${p.action}`)
      );

      // Filter out duplicates
      const newPermissions = permissions.filter(p => 
        !existingCombinations.has(`${p.resource}:${p.action}`)
      );

      if (newPermissions.length === 0) {
        res.status(409).json({ message: 'All permissions already exist' });
        return;
      }

      // Create new permissions
      const createdPermissions = await Permission.insertMany(newPermissions);

      res.status(201).json({
        message: `${createdPermissions.length} permissions created successfully`,
        created: createdPermissions.length,
        skipped: permissions.length - createdPermissions.length,
        permissions: createdPermissions
      });
    } catch (error) {
      console.error('Error creating multiple permissions:', error);
      res.status(500).json({ message: 'Error creating permissions' });
    }
  }

  /**
   * Get available resources (for frontend dropdowns)
   */
  async getResources(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      // Check authorization
      if (user?.role !== 'system_admin' && !user?.businessId) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      const resources = await Permission.distinct('resource');
      res.status(200).json({
        resources: resources.sort(),
        count: resources.length
      });
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({ message: 'Error fetching resources' });
    }
  }

  /**
   * Get available actions (for frontend dropdowns)
   */
  async getActions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      // Check authorization
      if (user?.role !== 'system_admin' && !user?.businessId) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      const actions = await Permission.distinct('action');
      res.status(200).json({
        actions: actions.sort(),
        count: actions.length
      });
    } catch (error) {
      console.error('Error fetching actions:', error);
      res.status(500).json({ message: 'Error fetching actions' });
    }
  }
} 