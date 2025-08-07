import { Request, Response } from 'express';
import { getUserModel, IUser, UserRole } from '../models/user.model';
import { Role, IRole } from '../models/role.model';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types/auth.types';

export class UserRoleAssignmentController {
  /**
   * Assign a role to a user (Owner can assign business roles to users in their business)
   * POST /api/users/:userId/assign-role
   */
  async assignRoleToUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      const currentUser = req.user;

      // Validate inputs
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(roleId)) {
        res.status(400).json({ error: 'Invalid user ID or role ID' });
        return;
      }

      // Check authorization
      if (currentUser?.role !== 'system_admin' && !currentUser?.businessId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const UserModel = getUserModel();
      
      // Find the target user
      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Find the role
      const role = await Role.findById(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Business-level access control
      if (currentUser?.role !== 'system_admin') {
        // Business Owner can only assign roles to users in their business
        if (targetUser.businessId?.toString() !== currentUser.businessId) {
          res.status(403).json({ error: 'Cannot assign roles to users outside your business' });
          return;
        }

        // Business Owner can only assign business-scoped roles from their business
        if (role.scope !== 'business' || role.businessId?.toString() !== currentUser.businessId) {
          res.status(403).json({ error: 'Can only assign business roles from your business' });
          return;
        }
      }

      // Check if user already has this role
      const hasRole = targetUser.roles.some(existingRoleId => 
        existingRoleId.toString() === roleId
      );

      if (hasRole) {
        res.status(400).json({ error: 'User already has this role' });
        return;
      }

      // Assign the role
      targetUser.roles.push(roleId as any);
      
      // If assigning to a user not yet associated with business, associate them
      if (!targetUser.businessId && currentUser?.businessId && currentUser.role !== 'system_admin') {
        targetUser.businessId = new mongoose.Types.ObjectId(currentUser.businessId);
      }

      await targetUser.save();

      // Return updated user with populated roles
      const updatedUser = await UserModel.findById(userId)
        .populate('roles', 'name description scope businessId')
        .select('-password');

      res.status(200).json({
        message: 'Role assigned successfully',
        user: updatedUser
      });

    } catch (error: any) {
      console.error('Assign role error:', error);
      res.status(500).json({
        error: 'Failed to assign role',
        details: error.message
      });
    }
  }

  /**
   * Revoke a role from a user
   * POST /api/users/:userId/revoke-role
   */
  async revokeRoleFromUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      const currentUser = req.user;

      // Validate inputs
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(roleId)) {
        res.status(400).json({ error: 'Invalid user ID or role ID' });
        return;
      }

      // Check authorization
      if (currentUser?.role !== 'system_admin' && !currentUser?.businessId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const UserModel = getUserModel();
      
      // Find the target user
      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Find the role
      const role = await Role.findById(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Business-level access control
      if (currentUser?.role !== 'system_admin') {
        // Business Owner can only revoke roles from users in their business
        if (targetUser.businessId?.toString() !== currentUser.businessId) {
          res.status(403).json({ error: 'Cannot revoke roles from users outside your business' });
          return;
        }

        // Business Owner can only revoke business-scoped roles from their business
        if (role.scope !== 'business' || role.businessId?.toString() !== currentUser.businessId) {
          res.status(403).json({ error: 'Can only revoke business roles from your business' });
          return;
        }
      }

      // Check if user has this role
      const roleIndex = targetUser.roles.findIndex(existingRoleId => 
        existingRoleId.toString() === roleId
      );

      if (roleIndex === -1) {
        res.status(400).json({ error: 'User does not have this role' });
        return;
      }

      // Revoke the role
      targetUser.roles.splice(roleIndex, 1);
      await targetUser.save();

      // Return updated user with populated roles
      const updatedUser = await UserModel.findById(userId)
        .populate('roles', 'name description scope businessId')
        .select('-password');

      res.status(200).json({
        message: 'Role revoked successfully',
        user: updatedUser
      });

    } catch (error: any) {
      console.error('Revoke role error:', error);
      res.status(500).json({
        error: 'Failed to revoke role',
        details: error.message
      });
    }
  }

  /**
   * Get users in the current business (Owner only)
   * GET /api/users/business-users
   */
  async getBusinessUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;

      // Check authorization - allow system_admin, restaurant_admin, or users with admin-like roles
      const hasAdminRole = currentUser?.role === 'system_admin' || 
                          currentUser?.role === 'restaurant_admin' ||
                          currentUser?.role === 'admin';
      
      if (!hasAdminRole && !currentUser?.businessId) {
        console.log('Access denied for getBusinessUsers:', {
          userRole: currentUser?.role,
          businessId: currentUser?.businessId,
          userId: currentUser?.userId,
          hasAdminRole
        });
        res.status(403).json({ 
          error: 'Access denied. You don\'t have permission to read user resources.',
          details: `Your role: ${currentUser?.role}, Business ID: ${currentUser?.businessId || 'none'}`,
          requiredRole: 'system_admin, restaurant_admin, or admin role'
        });
        return;
      }

      const UserModel = getUserModel();
      let users: IUser[];

      if (currentUser?.role === 'system_admin' || currentUser?.role === 'admin') {
        // SuperAdmin and admin can see all users except customers
        users = await UserModel.find({ role: { $ne: 'customer' } })
          .populate('roles', 'name description scope businessId')
          .populate('businessId', 'name')
          .select('-password');
      } else {
        // Business Owner/restaurant_admin can only see users in their business (excluding customers)
        users = await UserModel.find({ 
          businessId: currentUser.businessId,
          role: { $ne: 'customer' }
        })
          .populate('roles', 'name description scope businessId')
          .populate('businessId', 'name')
          .select('-password');
      }

      // Categorize users by their roles
      const usersByRole: Record<string, IUser[]> = {};
      
      users.forEach(user => {
        // Use the primary role field first, then check roles array
        let primaryRole: string = user.role;
        
        // If user has roles array and it's populated, use the first role name
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          const firstRole = user.roles[0];
          // Check if it's populated (object) or just an ID
          if (typeof firstRole === 'object' && firstRole !== null && 'name' in firstRole) {
            primaryRole = (firstRole as IRole).name;
          }
        }
        
        // Normalize role names
        const roleKey = primaryRole || 'unassigned';
        
        if (!usersByRole[roleKey]) {
          usersByRole[roleKey] = [];
        }
        usersByRole[roleKey].push(user);
      });

      res.status(200).json({
        users,
        usersByRole,
        count: users.length,
        rolesSummary: Object.keys(usersByRole).map(role => ({
          role,
          count: usersByRole[role].length
        }))
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
   * POST /api/users/create-business-user
   */
  async createBusinessUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, firstName, lastName, roleIds } = req.body;
      const currentUser = req.user;

      // Check authorization
      if (currentUser?.role !== 'system_admin' && !currentUser?.businessId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Validate required fields
      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const UserModel = getUserModel();

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      // Validate roles if provided
      if (roleIds && roleIds.length > 0) {
        const roles = await Role.find({ _id: { $in: roleIds } });
        
        // Business Owner can only assign business roles from their business
        if (currentUser?.role !== 'system_admin') {
          const invalidRoles = roles.filter(role => 
            role.scope !== 'business' || role.businessId?.toString() !== currentUser.businessId
          );
          
          if (invalidRoles.length > 0) {
            res.status(403).json({ error: 'Can only assign business roles from your business' });
            return;
          }
        }
      }

      // Create the user
      const userData: Partial<IUser> = {
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        password: 'temp-password', // User will need to set password via reset
        role: UserRole.CUSTOMER, // Default role
        roles: roleIds ? roleIds.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
        isPasswordSet: false
      };

      // Set business association
      if (currentUser?.businessId && currentUser.role !== 'system_admin') {
        userData.businessId = new mongoose.Types.ObjectId(currentUser.businessId);
      }

      const user = new UserModel(userData);
      await user.save();

      // Return user without password
      const createdUser = await UserModel.findById(user._id)
        .populate('roles', 'name description scope businessId')
        .populate('businessId', 'name')
        .select('-password');

      res.status(201).json({
        message: 'User created successfully',
        user: createdUser
      });

    } catch (error: any) {
      console.error('Create business user error:', error);
      res.status(500).json({
        error: 'Failed to create user',
        details: error.message
      });
    }
  }

  /**
   * Get roles for a specific user
   * GET /api/rbac/users/:userId/roles
   */
  async getUserRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      // Validate user ID
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Users can access their own roles, or admin can access any
      if (currentUser?.userId !== userId && currentUser?.role !== 'system_admin' && !currentUser?.businessId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const UserModel = getUserModel();
      
      // Find the user and populate roles
      const user = await UserModel.findById(userId)
        .populate('roles', 'name description scope businessId permissions')
        .select('roles');

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // For business users, ensure they can only see roles within their business context
      if (currentUser?.role !== 'system_admin' && currentUser?.userId !== userId) {
        // Find the target user's business context
        const targetUser = await UserModel.findById(userId).select('businessId');
        
        if (targetUser?.businessId?.toString() !== currentUser.businessId) {
          res.status(403).json({ error: 'Cannot access roles for users outside your business' });
          return;
        }
      }

      res.status(200).json(user.roles || []);

    } catch (error: any) {
      console.error('Get user roles error:', error);
      res.status(500).json({
        error: 'Failed to get user roles',
        details: error.message
      });
    }
  }

  /**
   * Remove role from user - alias for revokeRoleFromUser for DELETE endpoint
   * DELETE /api/rbac/users/:userId/remove-role/:roleId
   */
  async removeRoleFromUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Use the roleId from URL params and put it in body for revokeRoleFromUser
    req.body.roleId = req.params.roleId;
    return this.revokeRoleFromUser(req, res);
  }
}

export default UserRoleAssignmentController; 