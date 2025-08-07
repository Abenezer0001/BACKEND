import { Request, Response } from 'express';
import { LoyaltyService } from '../services/LoyaltyService';
import LoyaltyProgram from '../models/LoyaltyProgram';
import CustomerLoyalty from '../models/CustomerLoyalty';
import mongoose from 'mongoose';
const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    businessId?: string;
    restaurantId?: string;
    iat: number;
    exp: number;
  };
}

export class LoyaltyController {
  /**
   * Create or update loyalty program for a restaurant
   */
  static async createOrUpdateLoyaltyProgram(req: AuthRequest, res: Response) {
    try {
      const { restaurantId } = req.params;
      const { isEnabled, settings } = req.body;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid restaurant ID' 
        });
      }

      // Check permissions for restaurant admins
      if (req.user?.role === 'restaurant_admin') {
        if (!req.user?.businessId) {
          return res.status(403).json({ 
            success: false, 
            message: 'Restaurant admin must have businessId' 
          });
        }
        
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied: You can only manage loyalty programs for restaurants in your business' 
          });
        }
      }

      const loyaltyProgram = await LoyaltyProgram.findOneAndUpdate(
        { restaurantId: new mongoose.Types.ObjectId(restaurantId) },
        { isEnabled, settings },
        { upsert: true, new: true }
      );

      res.status(200).json({
        success: true,
        message: 'Loyalty program updated successfully',
        data: loyaltyProgram
      });

    } catch (error) {
      console.error('Error creating/updating loyalty program:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update loyalty program'
      });
    }
  }

  /**
   * Get loyalty program for a restaurant
   */
  static async getLoyaltyProgram(req: AuthRequest, res: Response) {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid restaurant ID' 
        });
      }

      // Check permissions for restaurant admins
      if (req.user?.role === 'restaurant_admin') {
        if (!req.user?.businessId) {
          return res.status(403).json({ 
            success: false, 
            message: 'Restaurant admin must have businessId' 
          });
        }
        
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied: You can only view loyalty programs for restaurants in your business' 
          });
        }
      }

      const loyaltyProgram = await LoyaltyProgram.findOne({
        restaurantId: new mongoose.Types.ObjectId(restaurantId)
      });

      if (!loyaltyProgram) {
        return res.status(404).json({
          success: false,
          message: 'Loyalty program not found for this restaurant'
        });
      }

      res.status(200).json({
        success: true,
        data: loyaltyProgram
      });

    } catch (error) {
      console.error('Error getting loyalty program:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get loyalty program'
      });
    }
  }

  /**
   * Calculate loyalty discount for a customer
   */
  static async calculateDiscount(req: AuthRequest, res: Response) {
    try {
      const { customerId, restaurantId, orderAmount } = req.body;

      if (!customerId || !restaurantId || !orderAmount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: customerId, restaurantId, orderAmount'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID or restaurant ID'
        });
      }

      if (orderAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Order amount must be greater than 0'
        });
      }

      const result = await LoyaltyService.calculateDiscount(
        customerId,
        restaurantId,
        orderAmount
      );

      if (!result.isEligible) {
        return res.status(200).json({
          success: false,
          message: result.error || 'Not eligible for loyalty discount',
          data: { isEligible: false }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Loyalty discount calculated successfully',
        data: {
          isEligible: true,
          discount: result.discount,
          customerLoyalty: result.customerLoyalty
        }
      });

    } catch (error) {
      console.error('Error calculating loyalty discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate loyalty discount'
      });
    }
  }

  /**
   * Apply loyalty discount and record visit
   */
  static async applyDiscount(req: AuthRequest, res: Response) {
    try {
      const { customerId, restaurantId, orderAmount, discountAmount, discountPercent } = req.body;

      if (!customerId || !restaurantId || orderAmount === undefined || discountAmount === undefined || discountPercent === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID or restaurant ID'
        });
      }

      const result = await LoyaltyService.applyDiscount(
        customerId,
        restaurantId,
        orderAmount,
        discountAmount,
        discountPercent
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to apply loyalty discount'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Loyalty discount applied successfully',
        data: result.customerLoyalty
      });

    } catch (error) {
      console.error('Error applying loyalty discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply loyalty discount'
      });
    }
  }

  /**
   * Get customer loyalty status
   */
  static async getCustomerLoyaltyStatus(req: AuthRequest, res: Response) {
    try {
      const { customerId, restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID or restaurant ID'
        });
      }

      const result = await LoyaltyService.getCustomerLoyaltyStatus(customerId, restaurantId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error || 'Customer loyalty status not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Customer loyalty status retrieved successfully',
        data: result.data
      });

    } catch (error) {
      console.error('Error getting customer loyalty status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get customer loyalty status'
      });
    }
  }

  /**
   * Get restaurant loyalty analytics
   */
  static async getRestaurantAnalytics(req: AuthRequest, res: Response) {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID'
        });
      }

      // Check permissions for restaurant admins
      if (req.user?.role === 'restaurant_admin') {
        if (!req.user?.businessId) {
          return res.status(403).json({ 
            success: false, 
            message: 'Restaurant admin must have businessId' 
          });
        }
        
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied: You can only view analytics for restaurants in your business' 
          });
        }
      }

      const analytics = await LoyaltyService.getRestaurantAnalytics(restaurantId);

      res.status(200).json({
        success: true,
        message: 'Restaurant loyalty analytics retrieved successfully',
        data: analytics
      });

    } catch (error) {
      console.error('Error getting restaurant analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get restaurant analytics'
      });
    }
  }

  /**
   * Get all customers for a restaurant with their loyalty status
   */
  static async getRestaurantCustomers(req: AuthRequest, res: Response) {
    try {
      const { restaurantId } = req.params;
      const { page = 1, limit = 10, tier, sortBy = 'totalVisits', sortOrder = 'desc' } = req.query;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID'
        });
      }

      // Check permissions for restaurant admins
      if (req.user?.role === 'restaurant_admin') {
        if (!req.user?.businessId) {
          return res.status(403).json({ 
            success: false, 
            message: 'Restaurant admin must have businessId' 
          });
        }
        
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied: You can only view customers for restaurants in your business' 
          });
        }
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = { restaurantId: new mongoose.Types.ObjectId(restaurantId) };
      if (tier) {
        query.currentTier = tier;
      }

      // Build sort
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      const customers = await CustomerLoyalty.find(query)
        .populate('customerId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum);

      const total = await CustomerLoyalty.countDocuments(query);

      res.status(200).json({
        success: true,
        message: 'Restaurant customers retrieved successfully',
        data: {
          customers,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasNext: pageNum < Math.ceil(total / limitNum),
            hasPrev: pageNum > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting restaurant customers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get restaurant customers'
      });
    }
  }

  /**
   * Delete loyalty program for a restaurant
   */
  static async deleteLoyaltyProgram(req: AuthRequest, res: Response) {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID'
        });
      }

      // Check permissions for restaurant admins
      if (req.user?.role === 'restaurant_admin') {
        if (!req.user?.businessId) {
          return res.status(403).json({ 
            success: false, 
            message: 'Restaurant admin must have businessId' 
          });
        }
        
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied: You can only delete loyalty programs for restaurants in your business' 
          });
        }
      }

      await LoyaltyProgram.findOneAndDelete({
        restaurantId: new mongoose.Types.ObjectId(restaurantId)
      });

      res.status(200).json({
        success: true,
        message: 'Loyalty program deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting loyalty program:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete loyalty program'
      });
    }
  }
}