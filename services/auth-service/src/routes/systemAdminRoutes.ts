import express from 'express';
import { validateRequest } from '../middleware/validator';
import { adminValidation } from '../validation/adminSchemas';
import { rbacValidation } from '../validation/rbacSchemas';
import { SystemAdminController } from '../controllers/SystemAdminController';
import { PasswordSetupController } from '../controllers/PasswordSetupController';
import { RbacController } from '../controllers/RbacController';
import { TokenUtils } from '../utils/tokenUtils';
import User from '../models/user.model';
import { requireSysAdmin } from '../middleware/systemAdminAuth';
import { authenticateJWT, authenticateWithCookie, requireSystemAdminRole } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Create explicit handler functions for each route
const setupSysAdmin = (req: Request, res: Response, next: NextFunction) => {
  SystemAdminController.setupSysAdmin(req, res).catch(next);
};

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  PasswordSetupController.verifyToken(req, res).catch(next);
};

const setupPassword = (req: Request, res: Response, next: NextFunction) => {
  PasswordSetupController.setupPassword(req, res).catch(next);
};

const createAdmin = (req: Request, res: Response, next: NextFunction) => {
  SystemAdminController.createAdmin(req, res).catch(next);
};

const listAdmins = (req: Request, res: Response, next: NextFunction) => {
  SystemAdminController.listAdmins(req, res).catch(next);
};

const assignRoleToUser = (req: Request, res: Response, next: NextFunction) => {
  RbacController.assignRoleToUser(req, res).catch(next);
};

const removeRoleFromUser = (req: Request, res: Response, next: NextFunction) => {
  RbacController.removeRoleFromUser(req, res).catch(next);
};

const getUserPermissions = (req: Request, res: Response, next: NextFunction) => {
  RbacController.getUserPermissions(req, res).catch(next);
};

// Handler for generating password reset token by ID
const generateResetToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Generate password reset token
    const { token, hashedToken } = TokenUtils.generatePasswordResetToken();
    
    // Update user with the reset token
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = TokenUtils.getTokenExpirationDate();
    await user.save();
    
    // Return the plaintext token for immediate use
    res.status(200).json({
      message: 'Password reset token generated successfully',
      token,
      email: user.email
    });
  } catch (error) {
    console.error('Error generating password reset token:', error);
    next(error);
  }
};

// Handler for generating password reset token by email
const generateResetTokenByEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Generate password reset token
    const { token, hashedToken } = TokenUtils.generatePasswordResetToken();
    
    // Update user with the reset token
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = TokenUtils.getTokenExpirationDate();
    await user.save();
    
    // Return the plaintext token for immediate use
    res.status(200).json({
      message: 'Password reset token generated successfully',
      token,
      userId: user._id
    });
  } catch (error) {
    console.error('Error generating password reset token:', error);
    next(error);
  }
};

const router = express.Router();

// Rate limiter for sys-admin setup
const setupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window (temporarily reduced for testing)
  max: 100, // limit each IP to 10 requests per windowMs (temporarily increased for testing)
  message: { message: 'Too many attempts, please try again later' }
});

// Rate limiter for admin creation
const adminCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // limit each IP to 10 requests per windowMs
  message: { message: 'Too many admin creation attempts, please try again later' }
});

// Auth routes (no authentication required)
router.post(
  '/setup',
  setupLimiter,
  validateRequest(adminValidation.setupFirstSysAdmin),
  setupSysAdmin
);

router.get(
  '/verify-setup-token',
  validateRequest(adminValidation.verifyToken),
  verifyToken
);

router.post(
  '/setup-password',
  validateRequest(adminValidation.setupPassword),
  setupPassword
);

// Protected routes - using cookie-based authentication
router.use(authenticateWithCookie);
// Apply system admin role check middleware
router.use(requireSystemAdminRole);

// Admin management
router.post(
  '/admins',
  adminCreationLimiter,
  validateRequest(adminValidation.createAdmin),
  createAdmin
);

router.get(
  '/admins',
  validateRequest(adminValidation.listAdmins),
  listAdmins
);

// Generate password reset token for admin
router.post('/admins/:id/reset-token', generateResetToken);

// Same endpoint but by email for convenience
router.post('/admins/reset-token/by-email', generateResetTokenByEmail);

// RBAC routes
router.put(
  '/users/:userId/roles/:roleId',
  validateRequest(rbacValidation.assignRole),
  assignRoleToUser
);

router.delete(
  '/users/:userId/roles/:roleId',
  validateRequest(rbacValidation.removeRole),
  removeRoleFromUser
);

router.get(
  '/users/:userId/permissions',
  validateRequest(rbacValidation.getUserPermissions),
  getUserPermissions
);

export default router;

