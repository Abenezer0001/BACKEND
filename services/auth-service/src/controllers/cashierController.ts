import { Request, Response } from 'express';
import { getUserModel, IUser, UserRole } from '../models/user.model';
import { AuthenticatedRequest } from '../types/auth.types';
import mongoose from 'mongoose';

export class CashierController {
  
  /**
   * Get all cashiers for a restaurant
   * GET /api/cashiers
   */
  async getCashiers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId, isActive } = req.query;
      const currentUser = req.user;

      // Build query for cashiers
      let query: any = { 
        role: UserRole.CASHIER 
      };
      
      // Restaurant admin can only see their own restaurant's cashiers
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN && currentUser.restaurantId) {
        query.restaurantId = currentUser.restaurantId;
      } else if (restaurantId) {
        query.restaurantId = restaurantId;
      }

      if (venueId) {
        query.assignedVenues = venueId;
      }

      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const UserModel = getUserModel();
      const cashiers = await UserModel.find(query)
        .populate('restaurantId', 'name')
        .populate('assignedVenues', 'name description')
        .select('-password -passwordResetToken')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        cashiers,
        total: cashiers.length
      });
    } catch (error: any) {
      console.error('Error fetching cashiers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cashiers',
        error: error.message
      });
    }
  }

  /**
   * Get a specific cashier by ID
   * GET /api/cashiers/:id
   */
  async getCashier(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cashier ID'
        });
        return;
      }

      const UserModel = getUserModel();
      const cashier = await UserModel.findOne({ 
        _id: id, 
        role: UserRole.CASHIER 
      })
        .populate('restaurantId', 'name')
        .populate('assignedVenues', 'name description capacity')
        .select('-password -passwordResetToken');

      if (!cashier) {
        res.status(404).json({
          success: false,
          message: 'Cashier not found'
        });
        return;
      }

      // Check if user has permission to view this cashier
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN && 
          currentUser.restaurantId?.toString() !== cashier.restaurantId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      res.json({
        success: true,
        cashier
      });
    } catch (error: any) {
      console.error('Error fetching cashier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cashier',
        error: error.message
      });
    }
  }

  /**
   * Create a new cashier
   * POST /api/cashiers
   */
  async createCashier(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;
      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        restaurantId,
        assignedVenues,
        workSchedule
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !restaurantId) {
        res.status(400).json({
          success: false,
          message: 'Email, password, first name, and restaurant ID are required'
        });
        return;
      }

      // Check if user has permission to create cashier for this restaurant
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        // For restaurant admins, check if the restaurant belongs to their business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      const UserModel = getUserModel();

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }

      // Create cashier user
      const cashier = new UserModel({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        role: UserRole.CASHIER,
        restaurantId,
        assignedVenues: assignedVenues || [],
        workSchedule,
        isActive: true,
        isPasswordSet: true
      });

      const savedCashier = await cashier.save();

      // Populate the created cashier for response
      const populatedCashier = await UserModel.findById(savedCashier._id)
        .populate('restaurantId', 'name')
        .populate('assignedVenues', 'name description')
        .select('-password -passwordResetToken');

      res.status(201).json({
        success: true,
        message: 'Cashier created successfully',
        cashier: populatedCashier
      });
    } catch (error: any) {
      console.error('Error creating cashier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create cashier',
        error: error.message
      });
    }
  }

  /**
   * Update a cashier
   * PUT /api/cashiers/:id
   */
  async updateCashier(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cashier ID'
        });
        return;
      }

      const UserModel = getUserModel();
      const cashier = await UserModel.findOne({ 
        _id: id, 
        role: UserRole.CASHIER 
      });

      if (!cashier) {
        res.status(404).json({
          success: false,
          message: 'Cashier not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(cashier.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Remove sensitive fields from update data
      delete updateData.password;
      delete updateData.role;
      delete updateData.email; // Don't allow email changes

      // Update cashier
      const updatedCashier = await UserModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('restaurantId', 'name')
        .populate('assignedVenues', 'name description')
        .select('-password -passwordResetToken');

      res.json({
        success: true,
        message: 'Cashier updated successfully',
        cashier: updatedCashier
      });
    } catch (error: any) {
      console.error('Error updating cashier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cashier',
        error: error.message
      });
    }
  }

  /**
   * Delete/Deactivate a cashier
   * DELETE /api/cashiers/:id
   */
  async deleteCashier(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permanent } = req.query;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cashier ID'
        });
        return;
      }

      const UserModel = getUserModel();
      const cashier = await UserModel.findOne({ 
        _id: id, 
        role: UserRole.CASHIER 
      });

      if (!cashier) {
        res.status(404).json({
          success: false,
          message: 'Cashier not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(cashier.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      if (permanent === 'true') {
        // Permanent deletion
        await UserModel.findByIdAndDelete(id);
        res.json({
          success: true,
          message: 'Cashier deleted permanently'
        });
      } else {
        // Soft delete (deactivate)
        cashier.isActive = false;
        cashier.deletedAt = new Date();
        await cashier.save();

        res.json({
          success: true,
          message: 'Cashier deactivated successfully'
        });
      }
    } catch (error: any) {
      console.error('Error deleting cashier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete cashier',
        error: error.message
      });
    }
  }

  /**
   * Assign venues to cashier
   * PUT /api/cashiers/:id/venues
   */
  async assignVenuesToCashier(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { venueIds } = req.body;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cashier ID'
        });
        return;
      }

      if (!Array.isArray(venueIds)) {
        res.status(400).json({
          success: false,
          message: 'Venue IDs must be an array'
        });
        return;
      }

      const UserModel = getUserModel();
      const cashier = await UserModel.findOne({ 
        _id: id, 
        role: UserRole.CASHIER 
      });

      if (!cashier) {
        res.status(404).json({
          success: false,
          message: 'Cashier not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(cashier.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Validate venue IDs
      const validVenueIds = venueIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      
      cashier.assignedVenues = validVenueIds;
      await cashier.save();

      const updatedCashier = await UserModel.findById(id)
        .populate('assignedVenues', 'name description')
        .select('-password -passwordResetToken');

      res.json({
        success: true,
        message: 'Venues assigned to cashier successfully',
        cashier: updatedCashier
      });
    } catch (error: any) {
      console.error('Error assigning venues to cashier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign venues to cashier',
        error: error.message
      });
    }
  }

  /**
   * Update cashier work schedule
   * PUT /api/cashiers/:id/schedule
   */
  async updateCashierSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workSchedule } = req.body;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cashier ID'
        });
        return;
      }

      const UserModel = getUserModel();
      const cashier = await UserModel.findOne({ 
        _id: id, 
        role: UserRole.CASHIER 
      });

      if (!cashier) {
        res.status(404).json({
          success: false,
          message: 'Cashier not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(cashier.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      cashier.workSchedule = workSchedule;
      await cashier.save();

      res.json({
        success: true,
        message: 'Cashier work schedule updated successfully',
        schedule: cashier.workSchedule
      });
    } catch (error: any) {
      console.error('Error updating cashier schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cashier schedule',
        error: error.message
      });
    }
  }

  /**
   * Get cashier performance metrics
   * GET /api/cashiers/:id/performance
   */
  async getCashierPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cashier ID'
        });
        return;
      }

      const UserModel = getUserModel();
      const cashier = await UserModel.findOne({ 
        _id: id, 
        role: UserRole.CASHIER 
      });

      if (!cashier) {
        res.status(404).json({
          success: false,
          message: 'Cashier not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(cashier.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // TODO: Implement performance metrics calculation
      // This would involve querying orders, transactions, etc.
      const performanceMetrics = {
        totalTransactions: 0,
        totalAmount: 0,
        averageTransactionValue: 0,
        transactionsPerHour: 0,
        errorRate: 0,
        customerSatisfaction: 0,
        period: {
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: endDate || new Date()
        }
      };

      res.json({
        success: true,
        performance: performanceMetrics
      });
    } catch (error: any) {
      console.error('Error fetching cashier performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cashier performance',
        error: error.message
      });
    }
  }

  /**
   * Reset cashier password
   * PUT /api/cashiers/:id/reset-password
   */
  async resetCashierPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cashier ID'
        });
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
        return;
      }

      const UserModel = getUserModel();
      const cashier = await UserModel.findOne({ 
        _id: id, 
        role: UserRole.CASHIER 
      });

      if (!cashier) {
        res.status(404).json({
          success: false,
          message: 'Cashier not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(cashier.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      cashier.password = newPassword;
      cashier.isPasswordSet = true;
      cashier.passwordResetToken = undefined;
      cashier.passwordResetExpires = undefined;
      await cashier.save();

      res.json({
        success: true,
        message: 'Cashier password reset successfully'
      });
    } catch (error: any) {
      console.error('Error resetting cashier password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset cashier password',
        error: error.message
      });
    }
  }

  /**
   * Get overall cashier statistics
   * GET /api/cashiers/stats
   */
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;

      // Build query based on user role
      let query: any = { role: UserRole.CASHIER };
      
      // Restaurant admin can only see stats for their own business
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        if (!(currentUser as any).businessId) {
          res.status(403).json({
            success: false,
            message: 'Access denied - business ID not found'
          });
          return;
        }
        
        // Get restaurants for this business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurants = await Restaurant.find({ businessId: (currentUser as any).businessId });
        const restaurantIds = restaurants.map((r: any) => r._id);
        
        query.restaurantId = { $in: restaurantIds };
      }

      const UserModel = getUserModel();
      
      // Get cashier counts
      const totalCashiers = await UserModel.countDocuments(query);
      const activeCashiers = await UserModel.countDocuments({ ...query, isActive: true });
      const inactiveCashiers = totalCashiers - activeCashiers;
      
      // Get recent cashiers (created in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCashiers = await UserModel.countDocuments({
        ...query,
        createdAt: { $gte: thirtyDaysAgo }
      });

      res.json({
        success: true,
        stats: {
          total: totalCashiers,
          active: activeCashiers,
          inactive: inactiveCashiers,
          recentlyAdded: recentCashiers,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Error fetching cashier stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cashier statistics',
        error: error.message
      });
    }
  }
} 