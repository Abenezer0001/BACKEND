import { Request, Response, NextFunction } from 'express';
import { RbacService } from '../services/RbacService';
import { getUserModel } from '../models/user.model';
import Business from '../../../restaurant-service/src/models/Business';
import Restaurant from '../../../restaurant-service/src/models/Restaurant';
import mongoose from 'mongoose';

// Helper to get user data from request
function getAuthUser(req: Request) {
  const user = req.user;
  console.log('[Business RBAC] Raw req.user:', user);
  
  if (!user) {
    console.log('[Business RBAC] No user found in request');
    return null;
  }
  
  // Handle different token structures - the JWT token has 'userId' field
  const authUser = {
    id: (user as any).userId || (user as any).id || '',
    businessId: (user as any).businessId || '',
    role: String((user as any).role || ''),
    roles: (user as any).roles || []
  };
  
  console.log('[Business RBAC] Extracted auth user:', authUser);
  return authUser;
}

/**
 * Enhanced middleware to check permissions with business-level scoping
 * @param resource The resource being accessed (e.g., 'restaurant', 'menu-item')
 * @param action The action being performed (e.g., 'create', 'read', 'update', 'delete')
 */
export const requireBusinessPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = getAuthUser(req);
      
      if (!authUser || !authUser.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // SuperAdmin has access to everything
      if (authUser.role === 'system_admin') {
        next();
        return;
      }

      // For business-scoped operations, check business association
      if (!authUser.businessId) {
        res.status(403).json({ 
          message: 'Access denied. User not associated with any business.' 
        });
        return;
      }

      // Check if accessing a specific resource that belongs to a business
      const resourceId = req.params.restaurantId || req.params.businessId || req.params.id;
      
      if (resourceId && mongoose.Types.ObjectId.isValid(resourceId)) {
        const hasAccess = await checkBusinessResourceAccess(
          authUser.businessId, 
          resourceId, 
          resource, 
          req.method
        );

        if (!hasAccess) {
          res.status(403).json({ 
            message: 'Access denied. Resource does not belong to your business.' 
          });
          return;
        }
      }

      // Check RBAC permissions
      const rbacService = new RbacService();
      const hasPermission = await rbacService.checkPermission(authUser.id, resource, action);
      
      if (!hasPermission) {
        res.status(403).json({
          message: 'Access denied. Insufficient permissions.',
          details: `Required permission: ${action} on ${resource}`
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Business RBAC authorization error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};

/**
 * Check if a user can access a specific resource based on business ownership
 */
async function checkBusinessResourceAccess(
  userBusinessId: string, 
  resourceId: string, 
  resourceType: string, 
  httpMethod: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case 'business':
        // User can only access their own business
        return userBusinessId === resourceId;

      case 'restaurant':
        // Check if restaurant belongs to user's business
        const restaurant = await Restaurant.findById(resourceId);
        return restaurant?.businessId?.toString() === userBusinessId;

      case 'venue':
        // Check if venue's restaurant belongs to user's business
        const Venue = require('../../../restaurant-service/src/models/Venue').default;
        const venue = await Venue.findById(resourceId).populate('restaurantId');
        return venue?.restaurantId?.businessId?.toString() === userBusinessId;

      case 'table':
        // Check if table's restaurant belongs to user's business
        const Table = require('../../../restaurant-service/src/models/Table').default;
        const table = await Table.findById(resourceId);
        if (table?.restaurantId) {
          const tableRestaurant = await Restaurant.findById(table.restaurantId);
          return tableRestaurant?.businessId?.toString() === userBusinessId;
        }
        return false;

      case 'menu-item':
      case 'category':
        // Check if menu item/category's restaurant belongs to user's business
        const MenuItem = require('../../../restaurant-service/src/models/MenuItem').default;
        const Category = require('../../../restaurant-service/src/models/Category').default;
        
        const Model = resourceType === 'menu-item' ? MenuItem : Category;
        const item = await Model.findById(resourceId);
        
        if (item?.restaurant) {
          const itemRestaurant = await Restaurant.findById(item.restaurant);
          return itemRestaurant?.businessId?.toString() === userBusinessId;
        }
        return false;

      case 'order':
        // Check if order's restaurant belongs to user's business
        const Order = require('../../../order-service/src/models/Order').default;
        const order = await Order.findById(resourceId);
        
        if (order?.restaurant) {
          const orderRestaurant = await Restaurant.findById(order.restaurant);
          return orderRestaurant?.businessId?.toString() === userBusinessId;
        }
        return false;
        
      case 'promotion':
        // Check if promotion's restaurant belongs to user's business
        const Promotion = require('../../../restaurant-service/src/models/Promotion').default;
        const promotion = await Promotion.findById(resourceId);
        
        console.log('[Business RBAC] Checking promotion access:', {
          promotionId: resourceId,
          promotionRestaurantId: promotion?.restaurantId,
          userBusinessId
        });
        
        if (promotion?.restaurantId) {
          const promotionRestaurant = await Restaurant.findById(promotion.restaurantId);
          return promotionRestaurant?.businessId?.toString() === userBusinessId;
        }
        return false;

      case 'schedule':
        // Check if schedule's restaurant belongs to user's business
        const Schedule = require('../../../restaurant-service/src/models/Schedule').default;
        const schedule = await Schedule.findById(resourceId);
        
        console.log('[Business RBAC] Checking schedule access:', {
          scheduleId: resourceId,
          scheduleRestaurantId: schedule?.restaurantId,
          userBusinessId
        });
        
        if (schedule?.restaurantId) {
          const scheduleRestaurant = await Restaurant.findById(schedule.restaurantId);
          return scheduleRestaurant?.businessId?.toString() === userBusinessId;
        }
        return false;

      default:
        // For unknown resource types, allow access if user has business association
        // This provides a fallback for resources not explicitly handled
        return true;
    }
  } catch (error) {
    console.error('Error checking business resource access:', error);
    return false;
  }
}

/**
 * Middleware to ensure all list operations are scoped to user's business
 */
export const requireBusinessScope = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = getAuthUser(req);
      
      if (!authUser || !authUser.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // SuperAdmin can see all resources  
      if (authUser.role === 'system_admin' || authUser.role === 'SYSTEM_ADMIN') {
        console.log('[Business Scope] System admin detected, skipping business scope check');
        next();
        return;
      }

      // For business users, ensure queries are scoped to their business
      if (!authUser.businessId) {
        console.log('[Business Scope] No businessId found for user:', authUser);
        res.status(403).json({ 
          message: 'Access denied. User not associated with any business.',
          debug: {
            userId: authUser.id,
            role: authUser.role,
            hasBusinessId: !!authUser.businessId
          }
        });
        return;
      }

      // Add business filter to query parameters
      req.query.businessId = authUser.businessId;
      
      next();
    } catch (error) {
      console.error('Business scope error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};

/**
 * Middleware specifically for role-based checks with business context
 */
export const requireBusinessRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('[Business RBAC] Checking roles for URL:', req.method, req.url);
      console.log('[Business RBAC] Headers:', req.headers);
      console.log('[Business RBAC] Cookies:', req.cookies);
      
      const authUser = getAuthUser(req);
      
      console.log('[Business RBAC] Auth user data:', authUser);
      console.log('[Business RBAC] Required roles:', roles);
      
      if (!authUser || !authUser.id) {
        console.log('[Business RBAC] No auth user or ID found');
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      
      // Debug the whole request object minus sensitive info
      const reqDebug = { 
        url: req.url, 
        method: req.method, 
        path: req.path,
        params: req.params,
        query: req.query,
        headers: { ...req.headers, authorization: req.headers.authorization ? 'REDACTED' : undefined },
        cookies: req.cookies,
        user: req.user
      };
      console.log('[Business RBAC] Request debug info:', JSON.stringify(reqDebug, null, 2));

      // Check if user has any of the required roles
      let hasRole = false;
      
      // First check the direct role field from JWT token
      if (authUser.role && roles.includes(authUser.role)) {
        hasRole = true;
        console.log('[Business RBAC] Role found in direct role field:', authUser.role);
      }
      
      // If not found in direct role and not system_admin, check via RBAC service
      if (!hasRole && authUser.role !== 'system_admin') {
        try {
        const rbacService = new RbacService();
        hasRole = await rbacService.checkUserHasRole(authUser.id, roles);
        console.log('[Business RBAC] RBAC service role check result:', hasRole);
        } catch (rbacError) {
          console.error('[Business RBAC] RBAC service error:', rbacError);
          // Continue with hasRole = false if RBAC service fails
        }
      }
      
      if (!hasRole) {
        console.log('[Business RBAC] User does not have required role');
        res.status(403).json({
          message: 'Access denied. Insufficient role.',
          details: `Required roles: ${roles.join(', ')}, user role: ${authUser.role}`
        });
        return;
      }

      // For system_admin, allow access to everything without business association check
      if (authUser.role === 'system_admin') {
        console.log('[Business RBAC] System admin access granted');
        next();
        return;
      }

      // For non-SuperAdmin users, check business association
      if (!authUser.businessId) {
        console.log('[Business RBAC] Non-admin user without business association');
        res.status(403).json({ 
          message: 'Access denied. User not associated with any business.' 
        });
        return;
      }
      
      console.log('[Business RBAC] Business user access granted');
      next();
    } catch (error) {
      console.error('Business role check error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};

/**
 * Middleware to require business ownership (business owners only)
 */
export const requireBusinessOwnership = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = getAuthUser(req);
      
      if (!authUser || !authUser.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // SuperAdmin has access to everything
      if (authUser.role === 'system_admin') {
        next();
        return;
      }

      // Check if user is business owner
      if (!authUser.businessId) {
        res.status(403).json({ 
          message: 'Access denied. User not associated with any business.' 
        });
        return;
      }

      // Verify user is the owner of the business
      const User = getUserModel();
      const user = await User.findById(authUser.id);
      
      if (!user) {
        res.status(401).json({ message: 'User not found' });
        return;
      }

      const business = await Business.findById(authUser.businessId);
      
      if (!business) {
        res.status(404).json({ message: 'Business not found' });
        return;
      }

      if (business.ownerId.toString() !== authUser.id) {
        res.status(403).json({ 
          message: 'Access denied. Business ownership required.' 
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Business ownership check error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};

export default {
  requireBusinessPermission,
  requireBusinessScope,
  requireBusinessRole,
  requireBusinessOwnership
}; 