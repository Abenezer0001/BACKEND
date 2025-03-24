import { Request, Response, NextFunction } from 'express';
import { RbacService } from '../services/RbacService';

export class PermissionCheckController {
  /**
   * Handler function for routes
   */
  checkPermissionHandler = (req: Request, res: Response, next: NextFunction): void => {
    this.checkPermission(req, res).catch(next);
  };
  
  /**
   * Check if the current user has a specific permission
   */
  async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      const { resource, action } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ 
          hasPermission: false,
          message: 'Authentication required' 
        });
        return;
      }
      
      if (!resource || !action) {
        res.status(400).json({ 
          hasPermission: false,
          message: 'Resource and action are required' 
        });
        return;
      }
      
      const rbacService = new RbacService();
      const hasPermission = await rbacService.checkPermission(userId, resource, action);
      
      res.status(200).json({ hasPermission });
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({ 
        hasPermission: false,
        message: 'Error checking permission' 
      });
    }
  }
} 