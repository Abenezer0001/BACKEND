import { Request, Response } from 'express';
import User, { IUser, UserRole } from '../models/user.model';
import { Role } from '../models/Role';
import { TokenUtils } from '../utils/tokenUtils';
import * as EmailService from '../services/EmailService';
import mongoose from 'mongoose';

// Define type for authenticated requests with user information
type AuthenticatedRequest = Request & {
  user?: Express.User & {
    role?: string;
    businessId?: string;
    id?: string;
    userId?: string;
  };
};

export class SystemAdminController {
  /**
   * Set up a system administrator
   * Creates a new system administrator user with appropriate role
   */
  static async setupSysAdmin(req: Request, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if system_admin role exists
      let sysAdminRole = await Role.findOne({ name: 'system_admin' });
      
      // Create system_admin role if it doesn't exist
      if (!sysAdminRole) {
        const [createdRole] = await Role.create([{
          name: 'system_admin',
          description: 'System Administrator with full system access',
          permissions: [], // We'll add permissions in a separate method
          businessId: null, // System roles are not business-scoped
          isSystemRole: true,
          scope: 'system'
        }], { session });
        sysAdminRole = createdRole;
      }

      const { email, firstName, lastName } = req.body;

      if (!email || !firstName || !lastName) {
        await session.abortTransaction();
        res.status(400).json({ 
          message: 'Missing required fields',
          details: {
            email: email ? undefined : 'Email is required',
            firstName: firstName ? undefined : 'First name is required',
            lastName: lastName ? undefined : 'Last name is required'
          }
        });
        return;
      }

      // Check if user with email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        await session.abortTransaction();
        res.status(400).json({ message: 'User with this email already exists' });
        return;
      }

      // Generate temporary password and reset token
      const tempPassword = Math.random().toString(36).slice(-8);
      const { token, hashedToken } = TokenUtils.generatePasswordResetToken();

      // Log token and magic link in development environment
      if (process.env.NODE_ENV !== 'production') {
        console.log('====== DEVELOPMENT ONLY ======');
        console.log('Generated reset token:', token);
        console.log('Hashed token for DB storage:', hashedToken);
        console.log('Token expiration:', TokenUtils.getTokenExpirationDate());
        
        // Use HTTP for local development
        const frontendUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:5173';
        const developmentUrl = frontendUrl.startsWith('https://localhost') 
          ? frontendUrl.replace('https://localhost', 'http://localhost')
          : frontendUrl;
        
        console.log('Magic link:', `${developmentUrl}/password-setup?token=${token}`);
        console.log('============================');
      }

      // Create system_admin user
      const sysAdmin = await User.create([{
        email,
        firstName,
        lastName,
        password: tempPassword,
        roles: [sysAdminRole._id],
        role: UserRole.SYSTEM_ADMIN,
        isPasswordSet: false,
        passwordResetToken: hashedToken,
        passwordResetExpires: TokenUtils.getTokenExpirationDate()
      }], { session });

      // Validate email
      if (!EmailService.isValidEmail(email)) {
        await session.abortTransaction();
        res.status(400).json({ message: 'Invalid email address' });
        return;
      }

      // Send password setup email
      let emailSent = false;
      try {
        console.log('Attempting to send password setup email to:', email);
        emailSent = await EmailService.sendPasswordSetupEmail(
          email,
          firstName,
          token,
          true
        );
        console.log('Email sending result:', emailSent);
      } catch (emailError) {
        console.error('Error in email sending process:', emailError);
        emailSent = false;
      }

      if (!emailSent) {
        console.log('Email was not sent successfully, but continuing with account creation...');
        // In development, we'll still create the account even if email fails
        if (process.env.NODE_ENV === 'production') {
          await session.abortTransaction();
          res.status(500).json({ message: 'Failed to send password setup email' });
          return;
        }
      }

      await session.commitTransaction();

      const responseObj = {
        message: 'System administrator account created successfully',
        user: {
          id: sysAdmin[0]._id,
          email: sysAdmin[0].email,
          firstName: sysAdmin[0].firstName,
          lastName: sysAdmin[0].lastName
        }
      };

      // Include token and setup URL in response for development environments
      if (process.env.NODE_ENV !== 'production') {
        const frontendUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:5173';
        const developmentUrl = frontendUrl.startsWith('https://localhost') 
          ? frontendUrl.replace('https://localhost', 'http://localhost')
          : frontendUrl;
        const setupUrl = `${developmentUrl}/password-setup?token=${token}`;
        
        // Add development info directly to the response object for easier access
        Object.assign(responseObj, {
          dev_info: {
            plain_token: token,
            hashed_token: hashedToken,
            expires: TokenUtils.getTokenExpirationDate(),
            setupUrl: setupUrl,
            curl_command: `curl -X POST http://localhost:3001/api/system-admin/setup-password -H "Content-Type: application/json" -d '{"token":"${token}","password":"Admin@123456"}'`
          }
        });
      }

      res.status(201).json(responseObj);
    } catch (error) {
      await session.abortTransaction();
      console.error('Error setting up system administrator:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      res.status(500).json({ message: 'Error creating system administrator' });
    } finally {
      session.endSession();
    }
  }

  /**
   * Create a new admin user
   * - System admins can create both system and restaurant admins with any roles
   * - Restaurant admins can only create users with roles they created (business-scoped)
   */
  static async createAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get authenticated user information
      const currentUser = req.user;
      const { roleId, businessId: requestedBusinessId, email, firstName, lastName } = req.body;
      
      console.log('Creating admin with user context:', {
        currentUserRole: currentUser?.role,
        currentUserBusinessId: currentUser?.businessId,
        requestedRoleId: roleId,
        requestedBusinessId: requestedBusinessId
      });

      // Validate required fields
      if (!email || !firstName || !lastName || !roleId) {
        await session.abortTransaction();
        res.status(400).json({ 
          message: 'Missing required fields',
          details: {
            email: email ? undefined : 'Email is required',
            firstName: firstName ? undefined : 'First name is required',
            lastName: lastName ? undefined : 'Last name is required',
            roleId: roleId ? undefined : 'Role ID is required'
          }
        });
        return;
      }
      
      // Find the selected role and validate it
      const selectedRole = await Role.findById(roleId);
      if (!selectedRole) {
        await session.abortTransaction();
        res.status(404).json({ 
          message: 'Selected role not found',
          details: 'The specified role does not exist'
        });
        return;
      }
      
      // Validate role permissions based on current user
      if (currentUser?.role === 'restaurant_admin') {
        // Restaurant admins can only assign roles they created for their business
        if (!currentUser.businessId) {
          await session.abortTransaction();
          res.status(500).json({
            message: 'Current user has no business ID',
            details: 'Your account is not properly associated with a business'
          });
          return;
        }
        
        // Check if the role belongs to their business or is a non-system global role
        const isValidRole = selectedRole.businessId?.toString() === currentUser.businessId ||
                           (!selectedRole.businessId && !selectedRole.isSystemRole);
        
        if (!isValidRole) {
          await session.abortTransaction();
          res.status(403).json({
            message: 'Insufficient permissions',
            details: 'You can only assign roles that belong to your business'
          });
          return;
        }
        
        // Ensure business-scoped roles have the correct businessId
        if (selectedRole.scope === 'business' && !selectedRole.businessId) {
          console.log(`Updating role ${selectedRole.name} to have businessId: ${currentUser.businessId}`);
          selectedRole.businessId = new mongoose.Types.ObjectId(currentUser.businessId);
          await selectedRole.save({ session });
        }
      } else if (currentUser?.role === 'system_admin') {
        // System admins can assign any role
        // If assigning a business-scoped role and businessId is provided, ensure role has businessId
        if (selectedRole.scope === 'business' && requestedBusinessId && !selectedRole.businessId) {
          console.log(`Updating role ${selectedRole.name} to have businessId: ${requestedBusinessId}`);
          selectedRole.businessId = new mongoose.Types.ObjectId(requestedBusinessId);
          await selectedRole.save({ session });
        }
      }

      // Determine the businessId to use
      let businessIdToUse: string | null = null;
      
      if (currentUser?.role === 'restaurant_admin') {
        // For restaurant admins, always use their business ID
        businessIdToUse = currentUser.businessId!;
      } else if (currentUser?.role === 'system_admin') {
        // System admins can specify business ID for business-scoped roles
        if (!selectedRole.isSystemRole) {
          if (!requestedBusinessId) {
            await session.abortTransaction();
            res.status(400).json({ 
              message: 'Business ID is required for business-scoped roles',
              details: 'Business-scoped roles must be associated with a business'
            });
            return;
          }
          
          // Validate business exists
          const Business = require('../../../restaurant-service/src/models/Business').default;
          const business = await Business.findById(requestedBusinessId);
          if (!business) {
            await session.abortTransaction();
            res.status(404).json({ 
              message: 'Business not found',
              details: 'The specified business does not exist'
            });
            return;
          }
          businessIdToUse = requestedBusinessId;
        }
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        await session.abortTransaction();
        res.status(400).json({ message: 'User with this email already exists' });
        return;
      }

      // Generate temporary password and reset token
      const tempPassword = Math.random().toString(36).slice(-8);
      const { token, hashedToken } = TokenUtils.generatePasswordResetToken();

      // Determine user role based on selected role
      let userRole: UserRole;
      if (selectedRole.isSystemRole || selectedRole.name === 'system_admin') {
        userRole = UserRole.SYSTEM_ADMIN;
      } else {
        userRole = UserRole.RESTAURANT_ADMIN;
      }

      // Create admin user data
      const adminData: any = {
        email,
        firstName,
        lastName,
        password: tempPassword,
        roles: [selectedRole._id],
        role: userRole,
        isPasswordSet: false,
        passwordResetToken: hashedToken,
        passwordResetExpires: TokenUtils.getTokenExpirationDate()
      };

      // Associate with business if provided
      if (businessIdToUse) {
        adminData.businessId = new mongoose.Types.ObjectId(businessIdToUse);
      }

      // Create admin user
      const admin = await User.create([adminData], { session });

      // Validate email
      if (!EmailService.isValidEmail(email)) {
        await session.abortTransaction();
        res.status(400).json({ message: 'Invalid email address' });
        return;
      }

      // Send password setup email
      let emailSent = false;
      try {
        console.log('Attempting to send password setup email to:', email);
        emailSent = await EmailService.sendPasswordSetupEmail(
          email,
          firstName,
          token,
          true
        );
        console.log('Email sending result:', emailSent);
      } catch (emailError) {
        console.error('Error in email sending process:', emailError);
        emailSent = false;
      }

      if (!emailSent) {
        console.log('Email was not sent successfully, but continuing with account creation...');
        // In development, we'll still create the account even if email fails
        if (process.env.NODE_ENV === 'production') {
          await session.abortTransaction();
          res.status(500).json({ message: 'Failed to send password setup email' });
          return;
        }
      }

      await session.commitTransaction();

      const accountType = selectedRole.isSystemRole ? 'System administrator' : 'Admin';
      res.status(201).json({
        message: `${accountType} account created successfully`,
        user: {
          id: admin[0]._id,
          email: admin[0].email,
          firstName: admin[0].firstName,
          lastName: admin[0].lastName,
          role: admin[0].role,
          businessId: admin[0].businessId,
          assignedRole: {
            id: selectedRole._id,
            name: selectedRole.name,
            description: selectedRole.description
          }
        }
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating admin user:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      res.status(500).json({ 
        message: 'Error creating admin user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Get available roles based on user's permissions
   * - System admins can see all roles
   * - Restaurant admins can only see roles they created (business-scoped)
   */
  static async getAvailableRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;
      console.log('Getting available roles for user:', {
        role: currentUser?.role,
        businessId: currentUser?.businessId
      });
      
      let query: any = {};
      
      if (currentUser?.role === 'system_admin') {
        // System admins can see all roles
        query = {};
      } else if (currentUser?.role === 'restaurant_admin') {
        // Restaurant admins can only see roles they created (business-scoped)
        if (!currentUser.businessId) {
          res.status(500).json({
            message: 'Current user has no business ID',
            details: 'Your account is not properly associated with a business'
          });
          return;
        }
        
        query = {
          $or: [
            { businessId: new mongoose.Types.ObjectId(currentUser.businessId) },
            { businessId: null, isSystemRole: false } // Allow non-system global roles
          ]
        };
      } else {
        res.status(403).json({
          message: 'Insufficient permissions',
          details: 'You do not have permission to view available roles'
        });
        return;
      }
      
      const availableRoles = await Role.find(query).select('_id name description businessId isSystemRole scope');
      
      res.status(200).json({
        roles: availableRoles,
        context: currentUser?.role,
        businessId: currentUser?.businessId
      });
    } catch (error) {
      console.error('Error getting available roles:', error);
      res.status(500).json({
        message: 'Failed to get available roles',
        error: process.env.NODE_ENV === 'production' ? undefined : error
      });
    }
  }

  /**
   * List admin users with filtering:
   * - System admins can see all admins
   * - Restaurant admins can only see admins in their business
   */
  static async listAdmins(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;
      console.log('Listing admins with user context:', {
        role: currentUser?.role,
        businessId: currentUser?.businessId
      });
      
      // Build query based on user role
      let query: any = {
        role: { $in: [UserRole.SYSTEM_ADMIN, UserRole.RESTAURANT_ADMIN] }
      };
      
      // Restaurant admins can only see admins in their business
      if (currentUser?.role === 'restaurant_admin' && currentUser?.businessId) {
        // For restaurant admins, filter by businessId
        query.businessId = new mongoose.Types.ObjectId(currentUser.businessId);
        console.log('Filtering admins by businessId:', query);
      }

      const admins = await User.find(query)
        .populate('roles', 'name description businessId isSystemRole scope')
        .populate('businessId', 'name')
        .select('-password -passwordResetToken -passwordResetExpires');

      res.status(200).json({ 
        message: 'Admin users retrieved successfully',
        admins,
        count: admins.length,
        context: currentUser?.role,
        businessId: currentUser?.businessId
      });
    } catch (error) {
      console.error('Error listing admin users:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve admin users',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get admin user details by ID
   * - System admins can view any admin
   * - Restaurant admins can only view admins in their business
   */
  static async getAdminById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;
      const { adminId } = req.params;

      if (!adminId) {
        res.status(400).json({
          message: 'Admin ID is required'
        });
        return;
      }

      // Build query based on user role
      let query: any = {
        _id: adminId,
        role: { $in: [UserRole.SYSTEM_ADMIN, UserRole.RESTAURANT_ADMIN] }
      };

      // Restaurant admins can only view admins in their business
      if (currentUser?.role === 'restaurant_admin' && currentUser?.businessId) {
        query.businessId = new mongoose.Types.ObjectId(currentUser.businessId);
      }

      const admin = await User.findOne(query)
        .populate('roles', 'name description businessId isSystemRole scope')
        .populate('businessId', 'name')
        .select('-password -passwordResetToken -passwordResetExpires');

      if (!admin) {
        res.status(404).json({
          message: 'Admin not found or access denied'
        });
        return;
      }

      res.status(200).json({
        message: 'Admin details retrieved successfully',
        admin
      });
    } catch (error) {
      console.error('Error getting admin details:', error);
      res.status(500).json({
        message: 'Failed to retrieve admin details',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update admin user
   * - System admins can update any admin
   * - Restaurant admins can only update admins in their business
   */
  static async updateAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const currentUser = req.user;
      const { adminId } = req.params;
      const { firstName, lastName, roleId } = req.body;

      if (!adminId) {
        await session.abortTransaction();
        res.status(400).json({
          message: 'Admin ID is required'
        });
        return;
      }

      // Find the admin to update
      let query: any = {
        _id: adminId,
        role: { $in: [UserRole.SYSTEM_ADMIN, UserRole.RESTAURANT_ADMIN] }
      };

      // Restaurant admins can only update admins in their business
      if (currentUser?.role === 'restaurant_admin' && currentUser?.businessId) {
        query.businessId = new mongoose.Types.ObjectId(currentUser.businessId);
      }

      const admin = await User.findOne(query);
      if (!admin) {
        await session.abortTransaction();
        res.status(404).json({
          message: 'Admin not found or access denied'
        });
        return;
      }

      // Build update object
      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;

      // Handle role change if provided
      if (roleId) {
        const newRole = await Role.findById(roleId);
        if (!newRole) {
          await session.abortTransaction();
          res.status(404).json({
            message: 'Role not found'
          });
          return;
        }

        // Validate role assignment permissions
        if (currentUser?.role === 'restaurant_admin') {
          if (newRole.isSystemRole || (newRole.businessId && newRole.businessId.toString() !== currentUser.businessId)) {
            await session.abortTransaction();
            res.status(403).json({
              message: 'Cannot assign role from different business or system role'
            });
            return;
          }
        }

        updateData.roles = [newRole._id];
        updateData.role = newRole.isSystemRole ? UserRole.SYSTEM_ADMIN : UserRole.RESTAURANT_ADMIN;
      }

      // Update admin
      const updatedAdmin = await User.findByIdAndUpdate(
        adminId,
        updateData,
        { new: true, session }
      )
        .populate('roles', 'name description businessId isSystemRole scope')
        .populate('businessId', 'name')
        .select('-password -passwordResetToken -passwordResetExpires');

      await session.commitTransaction();

      res.status(200).json({
        message: 'Admin updated successfully',
        admin: updatedAdmin
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error updating admin:', error);
      res.status(500).json({
        message: 'Failed to update admin',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete admin user
   * - System admins can delete any admin
   * - Restaurant admins can only delete admins in their business
   */
  static async deleteAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const currentUser = req.user;
      const { adminId } = req.params;

      if (!adminId) {
        await session.abortTransaction();
        res.status(400).json({
          message: 'Admin ID is required'
        });
        return;
      }

      // Build query based on user role
      let query: any = {
        _id: adminId,
        role: { $in: [UserRole.SYSTEM_ADMIN, UserRole.RESTAURANT_ADMIN] }
      };

      // Restaurant admins can only delete admins in their business
      if (currentUser?.role === 'restaurant_admin' && currentUser?.businessId) {
        query.businessId = new mongoose.Types.ObjectId(currentUser.businessId);
      }

      // Prevent users from deleting themselves
      const currentUserId = currentUser?.id || currentUser?.userId;
      if (adminId === currentUserId) {
        await session.abortTransaction();
        res.status(400).json({
          message: 'Cannot delete your own account'
        });
        return;
      }

      const admin = await User.findOne(query);
      if (!admin) {
        await session.abortTransaction();
        res.status(404).json({
          message: 'Admin not found or access denied'
        });
        return;
      }

      await User.findByIdAndDelete(adminId, { session });
      await session.commitTransaction();

      res.status(200).json({
        message: 'Admin deleted successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error deleting admin:', error);
      res.status(500).json({
        message: 'Failed to delete admin',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      session.endSession();
    }
  }
}
