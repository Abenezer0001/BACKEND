import { Request, Response } from 'express';
import Category, { ICategory } from '../models/Category';
import mongoose from 'mongoose';

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

export class CategoryController {
  // Create a new category
  public async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('Creating new category with data:', req.body);
      console.log('Request body type:', typeof req.body);
      console.log('Request body keys:', Object.keys(req.body));
      
      const { name, description, isActive, order, restaurantId } = req.body;
      
      // Validate user has access to this restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only manage categories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== restaurantId && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only manage categories for your restaurant' });
        return;
      }
      
      console.log('Extracted values:');
      console.log('- name:', name, typeof name);
      console.log('- description:', description, typeof description);
      console.log('- isActive:', isActive, typeof isActive);
      console.log('- order:', order, typeof order);
      console.log('- restaurantId:', restaurantId, typeof restaurantId);

      // Validate required fields
      if (!name) {
        res.status(400).json({ error: 'Category name is required' });
        return;
      }

      if (!restaurantId) {
        console.error('RestaurantId validation failed:', {
          restaurantId,
          type: typeof restaurantId,
          isUndefined: restaurantId === undefined,
          isNull: restaurantId === null,
          isEmpty: restaurantId === ''
        });
        res.status(400).json({ error: 'Restaurant ID is required' });
        return;
      }

      // Create a new category with all fields including restaurantId
      const categoryData = {
        name,
        description: description || '',
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
        restaurantId // Make sure this is included
      };
      
      console.log('Category data to save:', categoryData);
      const category = new Category(categoryData);
      console.log('Category object before save:', category.toObject());

      console.log('Saving category to database...');
      const savedCategory = await category.save();
      console.log('Category saved successfully:', savedCategory);

      res.status(201).json(savedCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating category: ${errorMessage}` });
    }
  }

  // Get all categories
  public async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.query;
      
      // Build filter based on user role and permissions
      let filter: any = {};
      
      // Allow public access when no user authentication is present OR for guest users
      if (!req.user || req.user.role === 'guest') {
        // Public access: If restaurantId is specified, filter by it, otherwise return all active categories
        if (restaurantId) {
          filter.restaurantId = restaurantId;
        }
        // Only show active categories for public access
        filter.isActive = true;
      } else {
        // Authenticated user access - apply role-based filtering
        if (req.user.role === 'restaurant_admin') {
          // For restaurant admins, only show categories for restaurants in their business
          if (req.user.businessId) {
            const Restaurant = require('../models/Restaurant').default;
            const restaurants = await Restaurant.find({ businessId: req.user.businessId });
            const restaurantIds = restaurants.map(r => r._id.toString());
            filter.restaurantId = { $in: restaurantIds };
          } else {
            res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
            return;
          }
        } else if (req.user.role !== 'system_admin') {
          // For other roles, filter by their assigned restaurant
          if (req.user.restaurantId) {
            filter.restaurantId = req.user.restaurantId;
          } else {
            res.status(403).json({ error: 'Access denied: You must be assigned to a restaurant' });
            return;
          }
        }
        
        // If specific restaurantId is requested, add it to filter (if user has permission)
        if (restaurantId) {
          if (req.user.role === 'restaurant_admin') {
            // Verify the requested restaurant belongs to admin's business
            const Restaurant = require('../models/Restaurant').default;
            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
              res.status(403).json({ error: 'Access denied: You can only view categories for restaurants in your business' });
              return;
            }
          } else if (req.user.restaurantId !== restaurantId && req.user.role !== 'system_admin') {
            res.status(403).json({ error: 'Access denied: You can only view categories for your restaurant' });
            return;
          }
          filter.restaurantId = restaurantId;
        }
      }
      
      const categories = await Category.find(filter).sort({ order: 1 });
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching categories: ${errorMessage}` });
    }
  }

  // Get category by ID
  public async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID format' });
        return;
      }

      const category = await Category.findById(id);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      
      // Allow public access to active categories
      if (!req.user) {
        // Public access: only allow access to active categories
        if (!category.isActive) {
          res.status(404).json({ error: 'Category not found' });
          return;
        }
      } else {
        // Authenticated user access - validate user has access to this category's restaurant
        if (req.user.role === 'restaurant_admin') {
          // For restaurant admins, check if the category's restaurant belongs to their business
          if (req.user.businessId) {
            const Restaurant = require('../models/Restaurant').default;
            const restaurant = await Restaurant.findById(category.restaurantId);
            
            if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
              res.status(403).json({ error: 'Access denied: You can only view categories for restaurants in your business' });
              return;
            }
          } else {
            res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
            return;
          }
        } else if (req.user.restaurantId !== category.restaurantId?.toString() && req.user.role !== 'system_admin') {
          res.status(403).json({ error: 'Access denied: You can only view categories for your restaurant' });
          return;
        }
      }

      res.status(200).json(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching category: ${errorMessage}` });
    }
  }

  // Update category
  public async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID format' });
        return;
      }

      // First get the existing category to check permissions
      const existingCategory = await Category.findById(id);
      if (!existingCategory) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      
      // Validate user has access to this category's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the category's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(existingCategory.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only update categories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== existingCategory.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only update categories for your restaurant' });
        return;
      }
      
      const category = await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.status(200).json(category);
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating category: ${errorMessage}` });
    }
  }

  // Delete category
  public async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID format' });
        return;
      }

      // First get the existing category to check permissions
      const existingCategory = await Category.findById(id);
      if (!existingCategory) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      
      // Validate user has access to this category's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the category's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(existingCategory.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only delete categories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== existingCategory.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only delete categories for your restaurant' });
        return;
      }
      
      const category = await Category.findByIdAndDelete(id);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting category: ${errorMessage}` });
    }
  }

  // Toggle category availability
  public async toggleAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID format' });
        return;
      }

      const category = await Category.findById(id);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      
      // Validate user has access to this category's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the category's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(category.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only toggle categories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== category.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only toggle categories for your restaurant' });
        return;
      }

      // Toggle the isActive field
      category.isActive = !category.isActive;
      await category.save();

      res.status(200).json(category);
    } catch (error) {
      console.error('Error toggling category availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error toggling category availability: ${errorMessage}` });
    }
  }
} 