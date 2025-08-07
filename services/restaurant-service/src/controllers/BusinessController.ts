import { Request, Response } from 'express';
import Business from '../models/Business';
import { getUserModel, UserRole } from '../../../auth-service/src/models/user.model';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../../auth-service/src/types/auth.types';
import * as EmailService from '../../../auth-service/src/services/EmailService';
import { TokenUtils } from '../../../auth-service/src/utils/tokenUtils';

export class BusinessController {
  /**
   * Create a new Business (SuperAdmin only)
   * POST /api/admin/businesses
   */
  static async createBusiness(req: AuthenticatedRequest, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { name, legalName, registrationNumber, contactInfo, ownerEmail } = req.body;

      // Validate required fields
      if (!name || !contactInfo?.email || !ownerEmail) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Missing required fields: name, contactInfo.email, ownerEmail'
        });
      }

      // Validate owner email
      if (!EmailService.isValidEmail(ownerEmail)) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Invalid email address'
        });
      }

      // Find or create the business owner
      const UserModel = getUserModel();
      let owner = await UserModel.findOne({ email: ownerEmail });
      
      if (!owner) {
        // Generate temporary password and reset token for new owner
        const tempPassword = Math.random().toString(36).slice(-8);
        const { token, hashedToken } = TokenUtils.generatePasswordResetToken();

        // Create new owner user (we'll add role after business creation)
        owner = new UserModel({
          email: ownerEmail,
          password: tempPassword,
          firstName: ownerEmail.split('@')[0],
          lastName: '',
          role: UserRole.RESTAURANT_ADMIN,
          isPasswordSet: false,
          passwordResetToken: hashedToken,
          passwordResetExpires: TokenUtils.getTokenExpirationDate()
        });
        await owner.save({ session });
        
        // Store the plain token for email
        var emailToken = token;
      } else {
        // For existing user, generate new password reset token
        const { token, hashedToken } = TokenUtils.generatePasswordResetToken();
        owner.role = UserRole.RESTAURANT_ADMIN;
        owner.passwordResetToken = hashedToken;
        owner.passwordResetExpires = TokenUtils.getTokenExpirationDate();
        owner.isPasswordSet = false;
        await owner.save({ session });
        
        // Store the plain token for email
        var emailToken = token;
      }

      // Create the business
      const business = new Business({
        name,
        legalName,
        registrationNumber,
        contactInfo,
        ownerId: owner._id,
        isActive: true
      });

      await business.save({ session });

      // Update the owner's businessId
      owner.businessId = business._id as mongoose.Types.ObjectId;
      
      // Get or create the restaurant_admin role
      const Role = require('../../../auth-service/src/models/role.model').Role;
      let restaurantAdminRole = await Role.findOne({ 
        name: 'restaurant_admin', 
        businessId: null // System-level role
      });
      
      // If no system-level restaurant_admin role exists, create it
      if (!restaurantAdminRole) {
        restaurantAdminRole = await Role.create({
          name: 'restaurant_admin',
          description: 'Restaurant Administrator with full business access',
          scope: 'business',
          businessId: null, // System-level role
          isSystemRole: true
        });
      }
      
      // Assign the role to the owner
      owner.roles = [restaurantAdminRole._id];
      await owner.save({ session });

      // Send password setup email to owner
      let emailSent = false;
      if (!owner.isPasswordSet) {
        try {
          console.log('Attempting to send business invitation email to:', ownerEmail);
          
          emailSent = await EmailService.sendPasswordSetupEmail(
            ownerEmail,
            owner.firstName,
            emailToken,
            true
          );
          console.log('Email sending result:', emailSent);
        } catch (emailError) {
          console.error('Error in email sending process:', emailError);
          emailSent = false;
        }

        if (!emailSent) {
          console.log('Email was not sent successfully, but continuing with business creation...');
          // In development, we'll still create the business even if email fails
          if (process.env.NODE_ENV === 'production') {
            await session.abortTransaction();
            return res.status(500).json({ message: 'Failed to send invitation email' });
          }
        }
      }

      await session.commitTransaction();

      res.status(201).json({
        message: 'Business created successfully',
        business: business.toObject({ virtuals: true }),
        owner: {
          id: owner._id,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName
        },
        emailSent: emailSent
      });

    } catch (error: any) {
      await session.abortTransaction();
      console.error('Create business error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Business name already exists'
        });
      }

      res.status(500).json({
        error: 'Failed to create business',
        details: error.message
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all businesses (SuperAdmin only)
   * GET /api/admin/businesses
   */
  static async getAllBusinesses(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('[BusinessController] getAllBusinesses called');
      console.log('[BusinessController] User:', req.user);
      console.log('[BusinessController] User role:', req.user?.role);
      
      const businesses = await Business.find()
        .populate('ownerId', 'email firstName lastName')
        .populate('restaurants')
        .sort({ createdAt: -1 });

      console.log('[BusinessController] Found businesses:', businesses.length);

      res.json({
        businesses,
        count: businesses.length
      });

    } catch (error: any) {
      console.error('Get all businesses error:', error);
      res.status(500).json({
        error: 'Failed to fetch businesses',
        details: error.message
      });
    }
  }

  /**
   * Get business by ID (SuperAdmin or Owner)
   * GET /api/admin/businesses/:businessId
   */
  static async getBusinessById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const tokenUser = req.user as { userId?: string; email?: string; role?: string; businessId?: string };

      console.log(`[BusinessController] getBusinessById called for business: ${businessId}`);
      console.log(`[BusinessController] User details:`, {
        userId: tokenUser?.userId,
        role: tokenUser?.role,
        businessId: tokenUser?.businessId
      });

      // Validate businessId format
      if (!mongoose.Types.ObjectId.isValid(businessId)) {
        console.log(`[BusinessController] Invalid business ID format: ${businessId}`);
        res.status(400).json({ message: 'Invalid business ID format' });
        return;
      }

      // Double-check authorization although middleware should handle this
      if (tokenUser?.role !== 'system_admin' && tokenUser?.businessId !== businessId) {
        console.log(`[BusinessController] Access denied for user ${tokenUser?.userId} to business ${businessId}`);
        res.status(403).json({ message: "Forbidden: You don't have access to this business." });
        return;
      }

      console.log(`[BusinessController] Attempting to find business with ID: ${businessId}`);

      // Find business and populate related data properly
      const business = await Business.findById(businessId)
        .populate('ownerId', 'email firstName lastName role')
        .populate('restaurants', 'name address contactInfo isActive');

      if (!business) {
        console.log(`[BusinessController] Business not found: ${businessId}`);
        res.status(404).json({ message: 'Business not found' });
        return;
      }

      console.log(`[BusinessController] Business found successfully:`, {
        id: business._id,
        name: business.name,
        owner: business.ownerId
      });

      // Transform the response to match frontend expectations
      const responseData = {
        _id: business._id,
        name: business.name,
        legalName: business.legalName,
        registrationNumber: business.registrationNumber,
        contactInfo: business.contactInfo,
        ownerId: business.ownerId,
        owner: business.ownerId, // Include both for backward compatibility
        isActive: business.isActive,
        loyaltyProgramEnabled: business.loyaltyProgramEnabled,
        settings: business.settings,
        restaurants: business.restaurants,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      };

      res.status(200).json(responseData);
    } catch (error) {
      console.error('Error in getBusinessById:', error);
      // Provide more detailed error information
      if (error instanceof mongoose.Error.CastError) {
        res.status(400).json({ message: 'Invalid business ID format' });
      } else if (error instanceof mongoose.Error) {
        res.status(500).json({ message: 'Database error occurred' });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  /**
   * Update business (SuperAdmin or Owner)
   * PUT /api/admin/businesses/:businessId
   */
  static async updateBusiness(req: AuthenticatedRequest, res: Response) {
    try {
      const { businessId } = req.params;
      const user = req.user;
      const updates = req.body;

      if (!mongoose.Types.ObjectId.isValid(businessId)) {
        return res.status(400).json({ error: 'Invalid business ID' });
      }

      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      // Check access permissions
      if (user?.role !== 'system_admin' && user?.businessId !== businessId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Owners cannot change certain fields
      if (user?.role !== 'system_admin') {
        delete updates.ownerId;
        delete updates.isActive;
      }

      Object.assign(business, updates);
      await business.save();

      res.json({
        message: 'Business updated successfully',
        business: business.toObject({ virtuals: true })
      });

    } catch (error: any) {
      console.error('Update business error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Business name already exists'
        });
      }

      res.status(500).json({
        error: 'Failed to update business',
        details: error.message
      });
    }
  }

  /**
   * Deactivate business (SuperAdmin only)
   * DELETE /api/admin/businesses/:businessId
   */
  static async deactivateBusiness(req: AuthenticatedRequest, res: Response) {
    try {
      const { businessId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(businessId)) {
        return res.status(400).json({ error: 'Invalid business ID' });
      }

      const business = await Business.findByIdAndUpdate(
        businessId,
        { isActive: false },
        { new: true }
      );

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      res.json({
        message: 'Business deactivated successfully',
        business
      });

    } catch (error: any) {
      console.error('Deactivate business error:', error);
      res.status(500).json({
        error: 'Failed to deactivate business',
        details: error.message
      });
    }
  }

  /**
   * Deactivate business
   **/ 
  static async activateBusiness(req: AuthenticatedRequest, res: Response) {
    try {
      const { businessId } = req.params;
      if(!mongoose.Types.ObjectId.isValid(businessId)) {
        return res.status(400).json({ error: 'Invalid business ID' });
      }
      
      const business = await Business.findByIdAndUpdate(
        businessId,
        { isActive: true },
        { new: true }
      );

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      } else {

      res.json({  
        message: 'Business activated successfully',
        business
      });
      }
      } catch (error: any) {
      console.error('Activate business error:', error);
      res.status(500).json({
        error: 'Failed to activate business',
        details: error.message  
      });
    }
  }
  /**
   * Get current user's business (Owner)
   * GET /api/businesses/my-business
   */
  static async getMyBusiness(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;

      if (!user?.businessId) {
        return res.status(404).json({ 
          error: 'No business associated with this user' 
        });
      }

      const business = await Business.findById(user.businessId)
        .populate('ownerId', 'email firstName lastName')
        .populate('restaurants');

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      res.json(business.toObject({ virtuals: true }));

    } catch (error: any) {
      console.error('Get my business error:', error);
      res.status(500).json({
        error: 'Failed to fetch business',
        details: error.message
      });
    }
  }

  /**
   * Get current user's business users (non-customers only)
   * GET /api/businesses/my-business/users  
   */
  static async getBusinessUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { businessId } = req.params; // Get businessId from URL params for system admin use

      // Determine which businessId to use
      let targetBusinessId: string | undefined;
      
      if (user?.role === 'system_admin') {
        // System admin can access any business's users - use URL param
        targetBusinessId = businessId;
        
        if (!targetBusinessId) {
          return res.status(400).json({ 
            error: 'Business ID is required for system admin access' 
          });
        }
      } else {
        // Restaurant admin can only access their own business
      if (!user?.businessId) {
        return res.status(404).json({ 
          error: 'No business associated with this user' 
        });
        }
        targetBusinessId = user.businessId;
        
        // Also check if they're trying to access their own business when URL param is provided
        if (businessId && businessId !== user.businessId) {
          return res.status(403).json({ 
            error: 'Access denied - can only access your own business users' 
          });
        }
      }

      const UserModel = getUserModel();
      
      // Get all users for this business excluding customers
      const users = await UserModel.find({
        businessId: targetBusinessId,
        role: { $ne: 'customer' } // Exclude customers
      })
      .populate('roles', 'name description')
      .populate('businessId', 'name')
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 });

      res.json({
        users,
        count: users.length
      });

    } catch (error: any) {
      console.error('Get business users error:', error);
      res.status(500).json({
        error: 'Failed to fetch business users',
        details: error.message
      });
    }
  }

  /**
   * Create a new user in the business (Owner only)
   * POST /api/businesses/my-business/users
   */
  static async createBusinessUser(req: AuthenticatedRequest, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { email, firstName, lastName, roleIds } = req.body;
      const user = req.user;
      const { businessId } = req.params; // Get businessId from URL params

      // Determine which businessId to use
      let targetBusinessId: string | undefined;
      
      if (user?.role === 'system_admin') {
        // System admin can create users for any business - use URL param
        targetBusinessId = businessId;
        
        if (!targetBusinessId) {
          await session.abortTransaction();
          return res.status(400).json({ 
            error: 'Business ID is required for system admin access' 
          });
        }
      } else {
        // Restaurant admin can only create users for their own business
      if (!user?.businessId) {
        await session.abortTransaction();
        return res.status(403).json({ 
          error: 'No business associated with this user' 
        });
        }
        targetBusinessId = user.businessId;
        
        // Also check if they're trying to access their own business when URL param is provided
        if (businessId && businessId !== user.businessId) {
          await session.abortTransaction();
          return res.status(403).json({ 
            error: 'Access denied - can only create users for your own business' 
          });
        }
      }

      // Validate required fields
      if (!email || !firstName || !lastName) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Missing required fields: email, firstName, lastName'
        });
      }

      // Validate email
      if (!EmailService.isValidEmail(email)) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Invalid email address'
        });
      }

      // Check if roles are provided
      if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'At least one role must be assigned to the user. Please create roles for your business first.'
        });
      }

      const UserModel = getUserModel();

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        await session.abortTransaction();
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }

      // Validate roles belong to this business
      const Role = require('../../../auth-service/src/models/role.model').Role;
      const roles = await Role.find({
        _id: { $in: roleIds },
        businessId: targetBusinessId
      });

      if (roles.length !== roleIds.length) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Some roles do not exist or do not belong to your business'
        });
      }

      // Generate temporary password and reset token
      const tempPassword = Math.random().toString(36).slice(-8);
      const { token, hashedToken } = TokenUtils.generatePasswordResetToken();

      // Create the user
      const newUser = await UserModel.create([{
        email,
        firstName,
        lastName,
        password: tempPassword,
        businessId: new mongoose.Types.ObjectId(targetBusinessId),
        roles: roleIds.map((id: string) => new mongoose.Types.ObjectId(id)),
        role: 'staff', // Default role for business users
        isPasswordSet: false,
        passwordResetToken: hashedToken,
        passwordResetExpires: TokenUtils.getTokenExpirationDate()
      }], { session });

      // Send password setup email
      let emailSent = false;
      try {
        console.log('Attempting to send password setup email to new business user:', email);
        emailSent = await EmailService.sendPasswordSetupEmail(
          email,
          firstName,
          token,
          false // Not admin
        );
        console.log('Email sending result:', emailSent);
      } catch (emailError) {
        console.error('Error in email sending process:', emailError);
        emailSent = false;
      }

      if (!emailSent) {
        console.log('Email was not sent successfully, but continuing with user creation...');
        if (process.env.NODE_ENV === 'production') {
          await session.abortTransaction();
          return res.status(500).json({ message: 'Failed to send invitation email' });
        }
      }

      await session.commitTransaction();

      // Return created user with populated data
      const createdUser = await UserModel.findById(newUser[0]._id)
        .populate('roles', 'name description')
        .populate('businessId', 'name')
        .select('-password -passwordResetToken -passwordResetExpires');

      res.status(201).json({
        message: 'User created successfully',
        user: createdUser,
        emailSent: emailSent
      });

    } catch (error: any) {
      await session.abortTransaction();
      console.error('Create business user error:', error);
      res.status(500).json({
        error: 'Failed to create user',
        details: error.message
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Update business user (System Admin or Restaurant Admin)
   * PUT /api/admin/businesses/:businessId/users/:userId
   */
  static async updateBusinessUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { businessId, userId } = req.params;
      const user = req.user;
      const updates = req.body;

      if (!mongoose.Types.ObjectId.isValid(businessId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid business ID or user ID' });
      }

      // Check access permissions
      if (user?.role !== 'system_admin' && user?.businessId !== businessId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const UserModel = getUserModel();
      
      // Find the user to update
      const userToUpdate = await UserModel.findOne({
        _id: userId,
        businessId: businessId,
        role: { $ne: 'customer' } // Cannot update customers
      });

      if (!userToUpdate) {
        return res.status(404).json({ error: 'User not found or not a business user' });
      }

      // Validate role updates if provided
      if (updates.roleIds && Array.isArray(updates.roleIds)) {
        const Role = require('../../../auth-service/src/models/role.model').Role;
        const roles = await Role.find({
          _id: { $in: updates.roleIds },
          businessId: businessId
        });

        if (roles.length !== updates.roleIds.length) {
          return res.status(400).json({
            error: 'Some roles do not exist or do not belong to this business'
          });
        }

        updates.roles = updates.roleIds.map((id: string) => new mongoose.Types.ObjectId(id));
        delete updates.roleIds;
      }

      // Prevent changing certain fields
      delete updates.businessId;
      delete updates.password;
      delete updates.passwordResetToken;

      Object.assign(userToUpdate, updates);
      await userToUpdate.save();

      // Return updated user with populated data
      const updatedUser = await UserModel.findById(userId)
        .populate('roles', 'name description')
        .populate('businessId', 'name')
        .select('-password -passwordResetToken -passwordResetExpires');

      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });

    } catch (error: any) {
      console.error('Update business user error:', error);
      res.status(500).json({
        error: 'Failed to update user',
        details: error.message
      });
    }
  }

  /**
   * Delete business user (System Admin or Restaurant Admin)
   * DELETE /api/admin/businesses/:businessId/users/:userId
   */
  static async deleteBusinessUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { businessId, userId } = req.params;
      const user = req.user;

      if (!mongoose.Types.ObjectId.isValid(businessId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid business ID or user ID' });
      }

      // Check access permissions
      if (user?.role !== 'system_admin' && user?.businessId !== businessId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const UserModel = getUserModel();
      
      // Find the user to delete
      const userToDelete = await UserModel.findOne({
        _id: userId,
        businessId: businessId,
        role: { $ne: 'customer' } // Cannot delete customers
      });

      if (!userToDelete) {
        return res.status(404).json({ error: 'User not found or not a business user' });
      }

      // Prevent deletion of business owner
      const business = await Business.findById(businessId);
      if (business && business.ownerId.toString() === userId) {
        return res.status(403).json({ 
          error: 'Cannot delete business owner. Transfer ownership first.' 
        });
      }

      // Soft delete by deactivating the user
      userToDelete.isActive = false;
      userToDelete.deletedAt = new Date();
      await userToDelete.save();

      res.json({
        message: 'User deleted successfully',
        userId: userId
      });

    } catch (error: any) {
      console.error('Delete business user error:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        details: error.message
      });
    }
  }

  /**
   * Register a new business with user details (Public endpoint)
   * POST /api/businesses/register
   */
  static async registerBusiness(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { email, name: userName, phone, businessName } = req.body;

      // Validate required fields
      if (!email || !userName || !businessName) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Missing required fields: email, name, businessName'
        });
      }

      // Validate email
      if (!EmailService.isValidEmail(email)) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Invalid email address'
        });
      }

      const UserModel = getUserModel();

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        await session.abortTransaction();
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }

      // Check if business name is already taken
      const existingBusiness = await Business.findOne({ name: businessName });
      if (existingBusiness) {
        await session.abortTransaction();
        return res.status(409).json({
          error: 'Business name already exists'
        });
      }

      // Generate temporary password and reset token for new owner
      const tempPassword = Math.random().toString(36).slice(-8);
      const { token, hashedToken } = TokenUtils.generatePasswordResetToken();

      // Create new owner user
      const owner = new UserModel({
        email,
        password: tempPassword,
        firstName: userName.split(' ')[0] || userName,
        lastName: userName.split(' ').slice(1).join(' ') || '',
        role: UserRole.RESTAURANT_ADMIN,
        isPasswordSet: false,
        passwordResetToken: hashedToken,
        passwordResetExpires: TokenUtils.getTokenExpirationDate()
      });
      await owner.save({ session });

      // Create the business
      const business = new Business({
        name: businessName,
        contactInfo: {
          email,
          phone: phone || undefined
        },
        ownerId: owner._id,
        isActive: true
      });

      await business.save({ session });

      // Update the owner's businessId
      owner.businessId = business._id as mongoose.Types.ObjectId;
      
      // Get or create the restaurant_admin role
      const Role = require('../../../auth-service/src/models/role.model').Role;
      let restaurantAdminRole = await Role.findOne({ 
        name: 'restaurant_admin', 
        businessId: null // System-level role
      });
      
      // If no system-level restaurant_admin role exists, create it
      if (!restaurantAdminRole) {
        restaurantAdminRole = await Role.create({
          name: 'restaurant_admin',
          description: 'Restaurant Administrator with full business access',
          scope: 'business',
          businessId: null, // System-level role
          isSystemRole: true
        });
      }
      
      // Assign the role to the owner
      owner.roles = [restaurantAdminRole._id];
      await owner.save({ session });

      // Send password setup email to owner
      let emailSent = false;
      try {
        console.log('Attempting to send business registration email to:', email);
        
        emailSent = await EmailService.sendPasswordSetupEmail(
          email,
          owner.firstName,
          token,
          true
        );
        console.log('Email sending result:', emailSent);
      } catch (emailError) {
        console.error('Error in email sending process:', emailError);
        emailSent = false;
      }

      if (!emailSent) {
        console.log('Email was not sent successfully, but continuing with business registration...');
        // In development, we'll still create the business even if email fails
        if (process.env.NODE_ENV === 'production') {
          await session.abortTransaction();
          return res.status(500).json({ message: 'Failed to send registration email' });
        }
      }

      await session.commitTransaction();

      res.status(201).json({
        message: 'Business registered successfully',
        business: {
          id: business._id,
          name: business.name,
          contactInfo: business.contactInfo,
          isActive: business.isActive
        },
        owner: {
          id: owner._id,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName
        },
        emailSent: emailSent
      });

    } catch (error: any) {
      await session.abortTransaction();
      console.error('Register business error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Business name or email already exists'
        });
      }

      res.status(500).json({
        error: 'Failed to register business',
        details: error.message
      });
    } finally {
      session.endSession();
    }
  }
}

export default BusinessController; 