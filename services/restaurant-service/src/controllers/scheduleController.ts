import { Request, Response } from 'express';
import Schedule, { ISchedule } from '../models/Schedule';
import mongoose from 'mongoose';

// Define AuthenticatedRequest interface to match the JWT auth middleware
interface AuthenticatedRequest extends Request {
user?: {
    userId?: string;
    _id?: string;
    email?: string;
    role?: string;
    restaurantId?: mongoose.Types.ObjectId;
    businessId?: mongoose.Types.ObjectId;
  };
}

export class ScheduleController {
  
  /**
   * Get all schedules based on type and filters
   * GET /api/schedules
   */
  async getSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        scheduleType, 
        type, // Handle frontend field name
        restaurantId, 
        restaurant, // Handle frontend field name
        venueId, 
        venue, // Handle frontend field name
        menuItemId, 
        kitchenId, 
        kitchen, // Handle frontend field name
        categoryId,
        category, // Handle frontend field name
        businessId,
        business, // Handle frontend field name
        status, 
        isActive 
      } = req.query;
      const currentUser = req.user;

      console.log('Getting schedules for user:', currentUser);
      console.log('Query parameters:', req.query);

      // Build query based on filters
      let query: any = {};
      
      // Handle both frontend and backend field names
      const scheduleTypeValue = type || scheduleType;
      if (scheduleTypeValue) {
        query.scheduleType = scheduleTypeValue;
      }

      // Handle restaurant filtering differently for different user roles
      if (currentUser?.role === 'restaurant_admin') {
        // Restaurant admin should see schedules for their business restaurants
        if (currentUser.restaurantId) {
          // If they have a direct restaurant association
          query.restaurantId = currentUser.restaurantId;
        } else if (currentUser.businessId) {
          // If they're associated with a business, we need to find all restaurant schedules
          // for that business. For now, we'll get all schedules and let business scoping middleware handle it
          // Don't add restrictive restaurant filter here - let business scoping middleware handle it
        }
      } else {
        // System admin can filter by specific restaurant
        const restaurantIdValue = restaurant || restaurantId;
        if (restaurantIdValue) {
          query.restaurantId = restaurantIdValue;
        }
      }

      const venueIdValue = venue || venueId;
      if (venueIdValue) {
        query.venueId = venueIdValue;
      }

      if (menuItemId) {
        query.menuItemId = menuItemId;
      }

      const kitchenIdValue = kitchen || kitchenId;
      if (kitchenIdValue) {
        query.kitchenId = kitchenIdValue;
      }

      const categoryIdValue = category || categoryId;
      if (categoryIdValue) {
        query.categoryId = categoryIdValue;
      }

      const businessIdValue = business || businessId;
      if (businessIdValue) {
        query.businessId = businessIdValue;
      }

      if (status) {
        query.status = status;
      }

      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      console.log('Built query:', query);

      // Handle business scoping for restaurant_admin users
      if (currentUser?.role === 'restaurant_admin' && req.query.businessId) {
        // Remove the businessId from query since schedules don't have businessId directly
        delete query.businessId;
        
        // Instead, find all restaurants for this business and filter by those
        const Restaurant = require('../models/Restaurant').default;
        const businessRestaurants = await Restaurant.find({ 
          businessId: req.query.businessId 
        }).select('_id');
        
        const restaurantIds = businessRestaurants.map((r: any) => r._id);
        console.log('Business restaurants for scoping:', restaurantIds);
        
        if (restaurantIds.length > 0) {
          // Add restaurant filter to show only schedules for restaurants in this business
          query.restaurantId = { $in: restaurantIds };
        } else {
          // No restaurants found for this business, return empty result
          query._id = null; // This will ensure no results are returned
        }
      }

      console.log('Final query after business scoping:', query);

      // If no filters are provided, get all schedules (business scoping will limit as appropriate)
      const schedules = await Schedule.find(query)
        .populate('restaurantId', 'name')
        .populate('venueId', 'name description')
        .populate('menuItemId', 'name price')
        .populate('kitchenId', 'name kitchenType')
        .populate('categoryId', 'name description')
        .populate('businessId', 'name')
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      console.log('Found schedules:', schedules.length);
      
      // Add current status information to each schedule
      const schedulesWithStatus = schedules.map(schedule => {
        const scheduleObj = schedule.toObject() as any;
        
        // Add current status using the isCurrentlyActive method
        try {
          scheduleObj.currentStatus = {
            isCurrentlyOpen: schedule.isCurrentlyActive(),
            checkedAt: new Date(),
            timezone: schedule.timezone || 'UTC'
          };
        } catch (error) {
          console.error('Error checking schedule status:', error);
          scheduleObj.currentStatus = {
            isCurrentlyOpen: null,
            checkedAt: new Date(),
            timezone: schedule.timezone || 'UTC',
            error: 'Unable to determine current status'
          };
        }
        
        return scheduleObj;
      });

      console.log('Schedule data sample with status:', schedulesWithStatus.slice(0, 1).map(s => ({
        id: s._id,
        name: s.name,
        type: s.scheduleType,
        restaurantId: s.restaurantId,
        status: s.status,
        isActive: s.isActive,
        currentStatus: s.currentStatus
      })));

      res.json({
        success: true,
        message: 'Schedules retrieved successfully',
        data: schedulesWithStatus,
        total: schedulesWithStatus.length
      });
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch schedules',
        error: error.message
      });
    }
  }

  /**
   * Get a specific schedule by ID
   * GET /api/schedules/:id
   */
  async getSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid schedule ID'
        });
        return;
      }

      const schedule = await Schedule.findById(id)
        .populate('restaurantId', 'name')
        .populate('venueId', 'name description')
        .populate('menuItemId', 'name price description')
        .populate('kitchenId', 'name kitchenType')
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email');

      if (!schedule) {
        res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
        return;
      }

      // Check if user has permission to view this schedule with business scoping
      if (currentUser?.role === 'restaurant_admin') {
        const Restaurant = require('../models/Restaurant').default;
        const restaurant = await Restaurant.findById(schedule.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== currentUser.businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      res.json({
        success: true,
        schedule
      });
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch schedule',
        error: error.message
      });
    }
  }

  /**
   * Create a new schedule
   * POST /api/schedules
   */
  async createSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;
      const scheduleData = req.body;

      console.log('Creating schedule with data:', scheduleData);
      console.log('Current user:', currentUser);

      // Helper function to validate ObjectId and return null if invalid
      const validateObjectId = (value: any): mongoose.Types.ObjectId | undefined => {
        if (!value) return undefined;
        if (typeof value !== 'string') return undefined;
        if (!mongoose.Types.ObjectId.isValid(value)) return undefined;
        return new mongoose.Types.ObjectId(value);
      };

      // Map frontend field names to backend field names with validation
      const mappedData = {
        name: scheduleData.name,
        description: scheduleData.description,
        scheduleType: scheduleData.type || scheduleData.scheduleType, // Handle both formats
        restaurantId: validateObjectId(scheduleData.restaurant || scheduleData.restaurantId),
        venueId: validateObjectId(scheduleData.venue || scheduleData.venueId),
        kitchenId: validateObjectId(scheduleData.kitchen || scheduleData.kitchenId),
        menuItemId: validateObjectId(scheduleData.menuItem || scheduleData.menuItemId),
        categoryId: validateObjectId(scheduleData.category || scheduleData.categoryId),
        businessId: validateObjectId(scheduleData.business || scheduleData.businessId),
        menuItems: scheduleData.menuItems || [],
        dailySchedule: scheduleData.dailySchedule || scheduleData.dailySchedules || [],
        exceptions: scheduleData.exceptions || [],
        schedulePattern: scheduleData.schedulePattern || 'CUSTOM',
        timezone: scheduleData.timezone || 'UTC',
        startDate: scheduleData.startDate || scheduleData.effectiveFrom || new Date(),
        endDate: scheduleData.endDate,
        isActive: scheduleData.isActive !== undefined ? scheduleData.isActive : true,
        status: scheduleData.status || 'ACTIVE',
        createdBy: validateObjectId(currentUser?.userId || currentUser?._id)
      };

      // Validate required fields
      if (!mappedData.name || !mappedData.scheduleType) {
        res.status(400).json({
          success: false,
          message: 'Name and schedule type are required'
        });
        return;
      }

      // Validate schedule type
      const validTypes = ['RESTAURANT', 'MENU_ITEM', 'KITCHEN', 'VENUE', 'CATEGORY', 'BUSINESS'];
      if (!validTypes.includes(mappedData.scheduleType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid schedule type. Must be one of: ' + validTypes.join(', ')
        });
        return;
      }

      // Check required reference IDs based on schedule type
      if (mappedData.scheduleType === 'RESTAURANT' && !mappedData.restaurantId) {
        res.status(400).json({
          success: false,
          message: 'Restaurant ID is required for restaurant schedules'
        });
        return;
      }

      if (mappedData.scheduleType === 'MENU_ITEM' && !mappedData.menuItemId) {
        res.status(400).json({
          success: false,
          message: 'Menu item ID is required for menu item schedules'
        });
        return;
      }

      if (mappedData.scheduleType === 'KITCHEN' && !mappedData.kitchenId) {
        res.status(400).json({
          success: false,
          message: 'Kitchen ID is required for kitchen schedules'
        });
        return;
      }

      if (mappedData.scheduleType === 'VENUE' && !mappedData.venueId) {
        res.status(400).json({
          success: false,
          message: 'Venue ID is required for venue schedules'
        });
        return;
      }

      if (mappedData.scheduleType === 'CATEGORY' && !mappedData.categoryId) {
        res.status(400).json({
          success: false,
          message: 'Category ID is required for category schedules'
        });
        return;
      }

      if (mappedData.scheduleType === 'BUSINESS' && !mappedData.businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required for business schedules'
        });
        return;
      }

      // For restaurant admin users, ensure they can only create schedules for restaurants in their business
      if (currentUser?.role === 'restaurant_admin' && mappedData.restaurantId) {
        const Restaurant = require('../models/Restaurant').default;
        const restaurant = await Restaurant.findById(mappedData.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== currentUser.businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied: You can only create schedules for restaurants in your business'
          });
          return;
        }
      }

      // Create the schedule
      const schedule = new Schedule(mappedData);
      const savedSchedule = await schedule.save();

      // Populate the saved schedule for response
      const populatedSchedule = await Schedule.findById(savedSchedule._id)
        .populate('restaurantId', 'name')
        .populate('venueId', 'name description')
        .populate('menuItemId', 'name price')
        .populate('kitchenId', 'name kitchenType')
        .populate('createdBy', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Schedule created successfully',
        data: populatedSchedule
      });
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create schedule',
        error: error.message
      });
    }
  }

  /**
   * Update a schedule
   * PUT /api/schedules/:id
   */
  async updateSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid schedule ID'
        });
        return;
      }

      const schedule = await Schedule.findById(id);
      if (!schedule) {
        res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === 'restaurant_admin') {
        const Restaurant = require('../models/Restaurant').default;
        const restaurant = await Restaurant.findById(schedule.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== currentUser.businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Add last modified by
      updateData.lastModifiedBy = currentUser?.userId || currentUser?._id;

      // Update schedule
      const updatedSchedule = await Schedule.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('restaurantId', 'name')
        .populate('venueId', 'name')
        .populate('menuItemId', 'name price')
        .populate('kitchenId', 'name kitchenType')
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Schedule updated successfully',
        schedule: updatedSchedule
      });
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update schedule',
        error: error.message
      });
    }
  }

  /**
   * Delete a schedule
   * DELETE /api/schedules/:id
   */
  async deleteSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid schedule ID'
        });
        return;
      }

      const schedule = await Schedule.findById(id);
      if (!schedule) {
        res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === 'restaurant_admin') {
        const Restaurant = require('../models/Restaurant').default;
        const restaurant = await Restaurant.findById(schedule.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== currentUser.businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      await Schedule.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Schedule deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete schedule',
        error: error.message
      });
    }
  }

  /**
   * Approve a schedule
   * PUT /api/schedules/:id/approve
   */
  async approveSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid schedule ID'
        });
        return;
      }

      const schedule = await Schedule.findById(id);
      if (!schedule) {
        res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === 'restaurant_admin') {
        const Restaurant = require('../models/Restaurant').default;
        const restaurant = await Restaurant.findById(schedule.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== currentUser.businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Update schedule status to approved
      schedule.status = 'APPROVED';
      schedule.approvedBy = new mongoose.Types.ObjectId(currentUser?.userId || currentUser?._id);
      schedule.approvedAt = new Date();
      await schedule.save();

      const updatedSchedule = await Schedule.findById(id)
        .populate('approvedBy', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Schedule approved successfully',
        schedule: updatedSchedule
      });
    } catch (error: any) {
      console.error('Error approving schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve schedule',
        error: error.message
      });
    }
  }

  /**
   * Activate a schedule
   * PUT /api/schedules/:id/activate
   */
  async activateSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid schedule ID'
        });
        return;
      }

      const schedule = await Schedule.findById(id);
      if (!schedule) {
        res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === 'restaurant_admin') {
        const Restaurant = require('../models/Restaurant').default;
        const restaurant = await Restaurant.findById(schedule.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== currentUser.businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Schedule must be approved before activation
      if (schedule.status !== 'APPROVED') {
        res.status(400).json({
          success: false,
          message: 'Schedule must be approved before activation'
        });
        return;
      }

      // Deactivate other schedules of the same type for the same resource
      const deactivateQuery: any = {
        scheduleType: schedule.scheduleType,
        status: 'ACTIVE',
        _id: { $ne: id }
      };

      if (schedule.restaurantId) {
        deactivateQuery.restaurantId = schedule.restaurantId;
      }
      if (schedule.menuItemId) {
        deactivateQuery.menuItemId = schedule.menuItemId;
      }
      if (schedule.venueId) {
        deactivateQuery.venueId = schedule.venueId;
      }
      if (schedule.kitchenId) {
        deactivateQuery.kitchenId = schedule.kitchenId;
      }

      await Schedule.updateMany(deactivateQuery, { 
        status: 'INACTIVE',
        isActive: false 
      });

      // Activate current schedule
      schedule.status = 'ACTIVE';
      schedule.isActive = true;
      await schedule.save();

      res.json({
        success: true,
        message: 'Schedule activated successfully',
        schedule
      });
    } catch (error: any) {
      console.error('Error activating schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate schedule',
        error: error.message
      });
    }
  }

  /**
   * Check if something is currently available based on schedule
   * GET /api/schedules/check-availability
   */
  async checkAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        scheduleType, 
        restaurantId, 
        menuItemId, 
        venueId, 
        kitchenId,
        categoryId,
        businessId,
        checkTime 
      } = req.query;

      if (!scheduleType) {
        res.status(400).json({
          success: false,
          message: 'Schedule type is required'
        });
        return;
      }

      const query: any = {
        scheduleType,
        status: 'ACTIVE',
        isActive: true
      };

      if (restaurantId) query.restaurantId = restaurantId;
      if (menuItemId) query.menuItemId = menuItemId;
      if (venueId) query.venueId = venueId;
      if (kitchenId) query.kitchenId = kitchenId;
      if (categoryId) query.categoryId = categoryId;
      if (businessId) query.businessId = businessId;

      const schedule = await Schedule.findOne(query);

      if (!schedule) {
        res.json({
          success: true,
          isAvailable: false,
          message: 'No active schedule found'
        });
        return;
      }

      const isCurrentlyActive = schedule.isCurrentlyActive();
      let availability = {
        isAvailable: isCurrentlyActive,
        schedule: {
          id: schedule._id,
          name: schedule.name,
          type: schedule.scheduleType
        }
      };

      // For menu items, check additional availability constraints
      if (schedule.scheduleType === 'MENU_ITEM' && schedule.menuItemAvailability) {
        const menuAvailable = schedule.isMenuItemAvailable();
        availability.isAvailable = isCurrentlyActive && menuAvailable;
        (availability as any).menuItemAvailability = schedule.menuItemAvailability;
      }

      res.json({
        success: true,
        ...availability
      });
    } catch (error: any) {
      console.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check availability',
        error: error.message
      });
    }
  }

  /**
   * Update menu item availability (sold quantity, etc.)
   * PUT /api/schedules/:id/menu-availability
   */
  async updateMenuItemAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { soldQuantity, isAvailable, availabilityMessage } = req.body;
      const currentUser = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid schedule ID'
        });
        return;
      }

      const schedule = await Schedule.findById(id);
      if (!schedule) {
        res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
        return;
      }

      if (schedule.scheduleType !== 'MENU_ITEM') {
        res.status(400).json({
          success: false,
          message: 'This endpoint is only for menu item schedules'
        });
        return;
      }

      // Check permissions with business scoping
      if (currentUser?.role === 'restaurant_admin') {
        const Restaurant = require('../models/Restaurant').default;
        const restaurant = await Restaurant.findById(schedule.restaurantId);
        
        if (!restaurant || restaurant.businessId?.toString() !== currentUser.businessId?.toString()) {
          res.status(403).json({
            success: false,
            message: 'Access denied'
          });
          return;
        }
      }

      // Update menu item availability
      if (!schedule.menuItemAvailability) {
        schedule.menuItemAvailability = {
          isAvailable: true,
          soldQuantity: 0
        };
      }

      if (soldQuantity !== undefined) {
        schedule.menuItemAvailability.soldQuantity = soldQuantity;
      }
      if (isAvailable !== undefined) {
        schedule.menuItemAvailability.isAvailable = isAvailable;
      }
      if (availabilityMessage !== undefined) {
        schedule.menuItemAvailability.availabilityMessage = availabilityMessage;
      }

      await schedule.save();

      res.json({
        success: true,
        message: 'Menu item availability updated successfully',
        availability: schedule.menuItemAvailability
      });
    } catch (error: any) {
      console.error('Error updating menu item availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update menu item availability',
        error: error.message
      });
    }
  }
} 