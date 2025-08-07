import express from 'express';
import { validateRequest } from '../middleware/validator';
import { adminValidation } from '../validation/adminSchemas';
import { SystemAdminController } from '../controllers/SystemAdminController';
import { authenticateWithCookie, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth.types';
import User, { UserRole } from '../models/user.model';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Middleware for business admin routes
router.use(authenticateWithCookie);
router.use(requireRole(['restaurant_admin']));

/**
 * Get all users created by this restaurant admin within their business
 */
const getBusinessUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user?.businessId) {
      res.status(403).json({ 
        success: false,
        message: 'You are not associated with any business' 
      });
      return;
    }
    
    console.log(`[BusinessAdmin] Fetching users for business: ${user.businessId}`);
    
    // Find all users in the same business (excluding customers and system admins)
    const businessUsers = await User.find({
      businessId: user.businessId,
      role: { $in: ['restaurant_admin', 'staff', 'manager'] }, // Exclude customers and system admins
      _id: { $ne: user.userId } // Exclude the current user
    })
    .select('-password -passwordResetToken')
    .populate('roles', 'name description permissions')
    .lean();
    
    console.log(`[BusinessAdmin] Found ${businessUsers.length} business users`);
    
    res.status(200).json({
      success: true,
      admins: businessUsers,
      message: `Found ${businessUsers.length} users in your business`
    });
  } catch (error) {
    console.error('[BusinessAdmin] Error fetching business users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching business users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create a new admin user within the business
 */
const createBusinessAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Forward to the SystemAdminController.createAdmin but with business context
    await SystemAdminController.createAdmin(req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Get available roles that the restaurant admin can assign
 */
const getAvailableRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user?.businessId) {
      res.status(403).json({ 
        success: false,
        message: 'You are not associated with any business' 
      });
      return;
    }
    
    // Import Role model
    const Role = require('../models/Role').default;
    
    // Get roles that this business admin can assign (business-scoped roles)
    const availableRoles = await Role.find({
      $or: [
        { businessId: user.businessId, isSystemRole: false },
        { scope: 'business', isSystemRole: false }
      ]
    }).select('name description scope').lean();
    
    console.log(`[BusinessAdmin] Found ${availableRoles.length} available roles for business ${user.businessId}`);
    
    res.status(200).json({
      success: true,
      roles: availableRoles.map(role => role.name),
      roleDetails: availableRoles
    });
  } catch (error) {
    console.error('[BusinessAdmin] Error fetching available roles:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching available roles',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Routes
router.get('/admins', getBusinessUsers);
router.get('/available-roles', getAvailableRoles);
router.post('/admins', validateRequest(adminValidation.createAdmin), createBusinessAdmin);

export default router; 