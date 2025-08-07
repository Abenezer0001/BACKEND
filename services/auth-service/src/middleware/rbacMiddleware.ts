import { Request, Response, NextFunction } from 'express';
import { RbacService } from '../services/RbacService';

/**
 * Middleware to check if a user has the required permission for a resource and action
 * @param resource The resource being accessed (e.g., 'orders', 'menu-items')
 * @param action The action being performed (e.g., 'create', 'read', 'update', 'delete')
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get the user ID from the request (set by auth middleware)
      // Use type assertion to handle the JWT payload structure
      const tokenUser = req.user as { userId?: string; email?: string; role?: string };
      const userId = tokenUser?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const rbacService = new RbacService();
      const hasPermission = await rbacService.checkPermission(userId, resource, action);
      
      if (!hasPermission) {
        res.status(403).json({
          message: 'Access denied. Insufficient permissions.',
          details: `Required permission: ${action} on ${resource}`
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('RBAC authorization error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};

/**
 * Middleware to check if a user has any of the specified roles
 * @param roles Array of role names to check against
 */
// Legacy export alias for backward compatibility
export { requireBusinessRole as requireRole } from './businessRbacMiddleware';

/**
 * @deprecated Use requireBusinessRole from businessRbacMiddleware instead
 */
export const requireRoleLegacy = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use type assertion to handle the JWT payload structure
      const tokenUser = req.user as { userId?: string; email?: string; role?: string };
      const userId = tokenUser?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const rbacService = new RbacService();
      const hasRole = await rbacService.checkUserHasRole(userId, roles);
      
      if (!hasRole) {
        res.status(403).json({
          message: 'Access denied. Insufficient role.',
          details: `Required roles: ${roles.join(', ')}`
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('RBAC role check error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};