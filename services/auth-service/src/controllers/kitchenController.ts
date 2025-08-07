import { Request, Response } from 'express';
import Kitchen, { IKitchen } from '../models/Kitchen';
import { getUserModel, IUser, UserRole } from '../models/user.model';
import { AuthenticatedRequest } from '../types/auth.types';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export class KitchenController {
  
  /**
   * Get all kitchens for a restaurant
   * GET /api/kitchens
   */
  async getKitchens(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId, status } = req.query;
      const currentUser = req.user;

      // Build query based on user role and permissions
      let query: any = {};
      
      // Restaurant admin can only see kitchens from restaurants in their business
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN && (currentUser as any).businessId) {
        // Get all restaurants in this business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const businessRestaurants = await Restaurant.find({ businessId: (currentUser as any).businessId });
        const restaurantIds = businessRestaurants.map(r => r._id);
        query.restaurantId = { $in: restaurantIds };
      } else if (restaurantId) {
        query.restaurantId = restaurantId;
      }

      if (venueId) {
        query.venueId = venueId;
      }

      if (status) {
        query.status = status;
      }

      const kitchens = await Kitchen.find(query)
        .populate('restaurantId', 'name')
        .populate('venueId', 'name')
        .populate('assignedStaff', 'firstName lastName email')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        kitchens,
        total: kitchens.length
      });
    } catch (error: any) {
      console.error('Error fetching kitchens:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch kitchens',
        error: error.message
      });
    }
  }

  /**
   * Get a specific kitchen by ID
   * GET /api/kitchens/:id
   */
  async getKitchen(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid kitchen ID'
        });
        return;
      }

      const kitchen = await Kitchen.findById(id)
        .populate('restaurantId', 'name')
        .populate('venueId', 'name description')
        .populate('assignedStaff', 'firstName lastName email role isActive');

      if (!kitchen) {
        res.status(404).json({
          success: false,
          message: 'Kitchen not found'
        });
        return;
      }

      // Check if user has permission to view this kitchen
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        // For restaurant admins, check if the kitchen's restaurant belongs to their business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(kitchen.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      res.json({
        success: true,
        kitchen
      });
    } catch (error: any) {
      console.error('Error fetching kitchen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch kitchen',
        error: error.message
      });
    }
  }

  /**
   * Create a new kitchen
   * POST /api/kitchens
   */
  async createKitchen(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;
      const {
        name,
        description,
        venueId,
        venueIds,
        venue,
        restaurantId,
        restaurant,
        kitchenType,
        capabilities,
        equipment,
        printers,
        workingHours,
        accessPin,
        staffEmails // Array of staff emails with passwords
      } = req.body;

      // Handle frontend field mapping - extract single values from arrays or alternative field names
      const finalVenueId = venue || venueId || (venueIds && venueIds[0]);
      const finalRestaurantId = restaurant || restaurantId;

      // Validate required fields
      if (!name || !finalVenueId || !finalRestaurantId) {
        res.status(400).json({
          success: false,
          message: 'Name, venue ID, and restaurant ID are required'
        });
        return;
      }

      // Check if user has permission to create kitchen for this restaurant
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        // For restaurant admins, check if the restaurant belongs to their business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(finalRestaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Create kitchen
      const kitchen = new Kitchen({
        name,
        description,
        venueId: finalVenueId,
        restaurantId: finalRestaurantId,
        kitchenType,
        capabilities,
        equipment,
        printers,
        workingHours,
        accessPin,
        assignedStaff: [] // Will be populated after creating staff
      });

      const savedKitchen = await kitchen.save();

      // Create kitchen staff if emails provided
      const UserModel = getUserModel();
      const createdStaff: mongoose.Types.ObjectId[] = [];
      
      // Handle both array and single object formats from frontend
      let staffEmailsArray: any[] = [];
      if (staffEmails) {
        if (Array.isArray(staffEmails)) {
          staffEmailsArray = staffEmails;
        } else if (typeof staffEmails === 'object') {
          // Single object from frontend - convert to array
          staffEmailsArray = [staffEmails];
        }
      }
      
      if (staffEmailsArray.length > 0) {
        for (const staffData of staffEmailsArray) {
          const { email, password, firstName, lastName } = staffData;
          
          if (!email || !password) {
            console.warn('Skipping staff creation - email or password missing');
            continue;
          }

          try {
            // Check if user already exists
            const existingUser = await UserModel.findOne({ email });
            if (existingUser) {
              console.warn(`User with email ${email} already exists`);
              continue;
            }

            // Create kitchen staff user
            const staffUser = new UserModel({
              email,
              password,
              firstName: firstName || email.split('@')[0],
              lastName: lastName || '',
              role: UserRole.KITCHEN_STAFF,
              restaurantId: finalRestaurantId,
              assignedKitchens: [savedKitchen._id],
              isActive: true,
              isPasswordSet: true
            });

            const savedStaff = await staffUser.save();
            createdStaff.push(savedStaff._id);
            
            console.log(`Created kitchen staff user: ${email}`);
          } catch (staffError: any) {
            console.error(`Failed to create staff user ${email}:`, staffError.message);
          }
        }

        // Update kitchen with assigned staff
        if (createdStaff.length > 0) {
          savedKitchen.assignedStaff = createdStaff;
          await savedKitchen.save();
        }
      }

      // Populate the created kitchen for response
      const populatedKitchen = await Kitchen.findById(savedKitchen._id)
        .populate('restaurantId', 'name')
        .populate('venueId', 'name')
        .populate('assignedStaff', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Kitchen created successfully',
        kitchen: populatedKitchen,
        createdStaffCount: createdStaff.length
      });
    } catch (error: any) {
      console.error('Error creating kitchen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create kitchen',
        error: error.message
      });
    }
  }

  /**
   * Update a kitchen
   * PUT /api/kitchens/:id
   */
  async updateKitchen(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid kitchen ID'
        });
        return;
      }

      const kitchen = await Kitchen.findById(id);
      if (!kitchen) {
        res.status(404).json({
          success: false,
          message: 'Kitchen not found'
        });
        return;
      }

      // Check permissions
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        // For restaurant admins, check if the kitchen's restaurant belongs to their business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(kitchen.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Update kitchen
      const updatedKitchen = await Kitchen.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('restaurantId', 'name')
        .populate('venueId', 'name')
        .populate('assignedStaff', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Kitchen updated successfully',
        kitchen: updatedKitchen
      });
    } catch (error: any) {
      console.error('Error updating kitchen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update kitchen',
        error: error.message
      });
    }
  }

  /**
   * Delete a kitchen
   * DELETE /api/kitchens/:id
   */
  async deleteKitchen(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid kitchen ID'
        });
        return;
      }

      const kitchen = await Kitchen.findById(id);
      if (!kitchen) {
        res.status(404).json({
          success: false,
          message: 'Kitchen not found'
        });
        return;
      }

      // Check permissions
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        // For restaurant admins, check if the kitchen's restaurant belongs to their business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(kitchen.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      await Kitchen.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Kitchen deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting kitchen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete kitchen',
        error: error.message
      });
    }
  }

  /**
   * Add staff to kitchen
   * POST /api/kitchens/:id/staff
   */
  async addStaffToKitchen(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { staffEmails } = req.body;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid kitchen ID'
        });
        return;
      }

      const kitchen = await Kitchen.findById(id);
      if (!kitchen) {
        res.status(404).json({
          success: false,
          message: 'Kitchen not found'
        });
        return;
      }

      // Check permissions
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        // For restaurant admins, check if the kitchen's restaurant belongs to their business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(kitchen.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      const UserModel = getUserModel();
      const createdStaff: mongoose.Types.ObjectId[] = [];

      // Handle both array and single object formats from frontend
      let staffEmailsArray: any[] = [];
      if (staffEmails) {
        if (Array.isArray(staffEmails)) {
          staffEmailsArray = staffEmails;
        } else if (typeof staffEmails === 'object') {
          // Single object from frontend - convert to array
          staffEmailsArray = [staffEmails];
        }
      }

      for (const staffData of staffEmailsArray) {
        const { email, password, firstName, lastName } = staffData;
        
        if (!email || !password) {
          continue;
        }

        try {
          // Check if user already exists
          const existingUser = await UserModel.findOne({ email });
          if (existingUser) {
            // Add kitchen to existing user's assigned kitchens
            if (!existingUser.assignedKitchens?.includes(kitchen._id)) {
              existingUser.assignedKitchens = existingUser.assignedKitchens || [];
              existingUser.assignedKitchens.push(kitchen._id);
              await existingUser.save();
              createdStaff.push(existingUser._id);
            }
            continue;
          }

          // Create new kitchen staff user
          const staffUser = new UserModel({
            email,
            password,
            firstName: firstName || email.split('@')[0],
            lastName: lastName || '',
            role: UserRole.KITCHEN_STAFF,
            restaurantId: kitchen.restaurantId,
            assignedKitchens: [kitchen._id],
            isActive: true,
            isPasswordSet: true
          });

          const savedStaff = await staffUser.save();
          createdStaff.push(savedStaff._id);
        } catch (staffError: any) {
          console.error(`Failed to create/update staff user ${email}:`, staffError.message);
        }
      }

      // Update kitchen with new staff
      if (createdStaff.length > 0) {
        kitchen.assignedStaff = [...kitchen.assignedStaff, ...createdStaff];
        await kitchen.save();
      }

      const updatedKitchen = await Kitchen.findById(id)
        .populate('assignedStaff', 'firstName lastName email');

      res.json({
        success: true,
        message: `Added ${createdStaff.length} staff members to kitchen`,
        kitchen: updatedKitchen
      });
    } catch (error: any) {
      console.error('Error adding staff to kitchen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add staff to kitchen',
        error: error.message
      });
    }
  }

  /**
   * Remove staff from kitchen
   * DELETE /api/kitchens/:id/staff/:staffId
   */
  async removeStaffFromKitchen(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, staffId } = req.params;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(staffId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid kitchen ID or staff ID'
        });
        return;
      }

      const kitchen = await Kitchen.findById(id);
      if (!kitchen) {
        res.status(404).json({
          success: false,
          message: 'Kitchen not found'
        });
        return;
      }

      // Check permissions
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        // For restaurant admins, check if the kitchen's restaurant belongs to their business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(kitchen.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Remove staff from kitchen
      kitchen.assignedStaff = kitchen.assignedStaff.filter(
        staff => staff.toString() !== staffId
      );
      await kitchen.save();

      // Update user's assigned kitchens
      const UserModel = getUserModel();
      const staffUser = await UserModel.findById(staffId);
      if (staffUser && staffUser.assignedKitchens) {
        staffUser.assignedKitchens = staffUser.assignedKitchens.filter(
          kitchenId => kitchenId.toString() !== id
        );
        await staffUser.save();
      }

      res.json({
        success: true,
        message: 'Staff removed from kitchen successfully'
      });
    } catch (error: any) {
      console.error('Error removing staff from kitchen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove staff from kitchen',
        error: error.message
      });
    }
  }

  /**
   * Update kitchen status
   * PUT /api/kitchens/:id/status
   */
  async updateKitchenStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid kitchen ID'
        });
        return;
      }

      const validStatuses = ['OPEN', 'CLOSED', 'BUSY', 'MAINTENANCE'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
        return;
      }

      const kitchen = await Kitchen.findById(id);
      if (!kitchen) {
        res.status(404).json({
          success: false,
          message: 'Kitchen not found'
        });
        return;
      }

      // Check permissions
      if (currentUser?.role === UserRole.RESTAURANT_ADMIN) {
        // For restaurant admins, check if the kitchen's restaurant belongs to their business
        const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
        const restaurant = await Restaurant.findById(kitchen.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== (currentUser as any).businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      kitchen.status = status;
      await kitchen.save();

      res.json({
        success: true,
        message: 'Kitchen status updated successfully',
        kitchen
      });
    } catch (error: any) {
      console.error('Error updating kitchen status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update kitchen status',
        error: error.message
      });
    }
  }
} 