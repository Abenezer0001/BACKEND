import { Request, Response } from 'express';
import SubCategory, { ISubCategory } from '../models/SubCategory';
import Category from '../models/Category'; // Import Category model for validation
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

export class SubCategoryController {
  // Create a new subcategory
  public async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('Creating new subcategory with data:', req.body);
      const { name, description, image, isActive, order, category } = req.body;

      // Validate required fields
      if (!name) {
        res.status(400).json({ error: 'SubCategory name is required' });
        return;
      }
      if (!category) {
        res.status(400).json({ error: 'Parent Category ID is required' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(category)) {
        res.status(400).json({ error: 'Invalid parent Category ID format' });
        return;
      }

      // Check if parent category exists and validate permissions
      const parentCategory = await Category.findById(category);
      if (!parentCategory) {
        res.status(404).json({ error: 'Parent Category not found' });
        return;
      }
      
      // Validate user has access to this category's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the category's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(parentCategory.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only create subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== parentCategory.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only create subcategories for your restaurant' });
        return;
      }

      // Create a new subcategory
      const subCategory = new SubCategory({
        name,
        description: description || '',
        image: image || '', // Handle optional image
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
        category // Assign parent category ID
      });

      console.log('Saving subcategory to database...');
      const savedSubCategory = await subCategory.save();
      console.log('SubCategory saved successfully:', savedSubCategory);

      res.status(201).json(savedSubCategory);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating subcategory: ${errorMessage}` });
    }
  }

  // Get all subcategories (optionally filter by category)
  public async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { categoryId } = req.query; // Optional query parameter to filter by category
      const filter: any = {};

      if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId as string)) {
          res.status(400).json({ error: 'Invalid parent Category ID format' });
          return;
        }
        filter.category = categoryId;
      }

      let subcategories;
      
      // Allow public access when no user authentication is present
      if (!req.user) {
        // Public access: Show only active subcategories
        filter.isActive = true;
        subcategories = await SubCategory.find(filter).populate('category', 'name').sort({ order: 1 });
      } else {
        // Authenticated user access - apply role-based filtering
        if (req.user.role === 'restaurant_admin') {
          // For restaurant admins, only show subcategories for categories from restaurants in their business
          if (req.user.businessId) {
            const Restaurant = require('../models/Restaurant').default;
            const restaurants = await Restaurant.find({ businessId: req.user.businessId });
            const restaurantIds = restaurants.map(r => r._id.toString());
            
            // Get categories that belong to restaurants in this business
            const categories = await Category.find({ restaurantId: { $in: restaurantIds } });
            const categoryIds = categories.map(c => c._id.toString());
            
            // Filter subcategories by these categories
            if (filter.category) {
              // If specific category requested, verify it belongs to admin's business
              const requestedCategory = await Category.findById(filter.category);
              if (!requestedCategory || !categoryIds.includes(requestedCategory._id.toString())) {
                res.status(403).json({ error: 'Access denied: You can only view subcategories for categories in your business' });
                return;
              }
            } else {
              // Otherwise, filter by all categories in business
              filter.category = { $in: categoryIds };
            }
            
            subcategories = await SubCategory.find(filter).populate('category', 'name').sort({ order: 1 });
          } else {
            res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
            return;
          }
        } else if (req.user.role !== 'system_admin') {
          // For other roles, filter by their assigned restaurant
          if (req.user.restaurantId) {
            const categories = await Category.find({ restaurantId: req.user.restaurantId });
            const categoryIds = categories.map(c => c._id.toString());
            
            if (filter.category) {
              // If specific category requested, verify it belongs to user's restaurant
              if (!categoryIds.includes(filter.category.toString())) {
                res.status(403).json({ error: 'Access denied: You can only view subcategories for your restaurant' });
                return;
              }
            } else {
              filter.category = { $in: categoryIds };
            }
            
            subcategories = await SubCategory.find(filter).populate('category', 'name').sort({ order: 1 });
          } else {
            res.status(403).json({ error: 'Access denied: You must be assigned to a restaurant' });
            return;
          }
        } else {
          // System admin can see all
          subcategories = await SubCategory.find(filter).populate('category', 'name').sort({ order: 1 });
        }
      }
      
      res.status(200).json(subcategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching subcategories: ${errorMessage}` });
    }
  }

  // Get subcategory by ID
  public async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid subcategory ID format' });
        return;
      }

      const subCategory = await SubCategory.findById(id).populate('category', 'name'); // Populate parent category name
      if (!subCategory) {
        res.status(404).json({ error: 'SubCategory not found' });
        return;
      }
      
      // Validate user has access to this subcategory's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the subcategory's category's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const category = await Category.findById(subCategory.category);
          if (!category) {
            res.status(404).json({ error: 'Parent category not found' });
            return;
          }
          
          const restaurant = await Restaurant.findById(category.restaurantId);
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only view subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.role !== 'system_admin') {
        // For other roles, check if subcategory belongs to their restaurant
        const category = await Category.findById(subCategory.category);
        if (!category || (req.user?.restaurantId !== category.restaurantId?.toString())) {
          res.status(403).json({ error: 'Access denied: You can only view subcategories for your restaurant' });
          return;
        }
      }

      res.status(200).json(subCategory);
    } catch (error) {
      console.error('Error fetching subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching subcategory: ${errorMessage}` });
    }
  }

  // Update subcategory
  public async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid subcategory ID format' });
        return;
      }

      // Prevent changing the parent category directly if needed, or validate if allowed
      if (updateData.category) {
         if (!mongoose.Types.ObjectId.isValid(updateData.category)) {
            res.status(400).json({ error: 'Invalid parent Category ID format' });
            return;
         }
         const parentCategory = await Category.findById(updateData.category);
         if (!parentCategory) {
            res.status(404).json({ error: 'Parent Category not found' });
            return;
         }
      }


      // First get the existing subcategory to check permissions
      const existingSubCategory = await SubCategory.findById(id);
      if (!existingSubCategory) {
        res.status(404).json({ error: 'SubCategory not found' });
        return;
      }
      
      // Validate user has access to this subcategory's restaurant
      const category = await Category.findById(existingSubCategory.category);
      if (!category) {
        res.status(404).json({ error: 'Parent category not found' });
        return;
      }
      
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the subcategory's category's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(category.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only update subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== category.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only update subcategories for your restaurant' });
        return;
      }
      
      const subCategory = await SubCategory.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('category', 'name');

      if (!subCategory) {
        res.status(404).json({ error: 'SubCategory not found' });
        return;
      }

      res.status(200).json(subCategory);
    } catch (error) {
      console.error('Error updating subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating subcategory: ${errorMessage}` });
    }
  }

  // Delete subcategory
  public async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid subcategory ID format' });
        return;
      }

      // Optional: Add logic here to handle related SubSubCategories if necessary (e.g., delete them or reassign)

      // First get the existing subcategory to check permissions
      const existingSubCategory = await SubCategory.findById(id);
      if (!existingSubCategory) {
        res.status(404).json({ error: 'SubCategory not found' });
        return;
      }
      
      // Validate user has access to this subcategory's restaurant
      const category = await Category.findById(existingSubCategory.category);
      if (!category) {
        res.status(404).json({ error: 'Parent category not found' });
        return;
      }
      
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the subcategory's category's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(category.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only delete subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== category.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only delete subcategories for your restaurant' });
        return;
      }
      
      const subCategory = await SubCategory.findByIdAndDelete(id);
      if (!subCategory) {
        res.status(404).json({ error: 'SubCategory not found' });
        return;
      }

      res.status(200).json({ message: 'SubCategory deleted successfully' });
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting subcategory: ${errorMessage}` });
    }
  }

  // Toggle subcategory availability
  public async toggleAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid subcategory ID format' });
        return;
      }

      const subCategory = await SubCategory.findById(id);
      if (!subCategory) {
        res.status(404).json({ error: 'SubCategory not found' });
        return;
      }
      
      // Validate user has access to this subcategory's restaurant
      const category = await Category.findById(subCategory.category);
      if (!category) {
        res.status(404).json({ error: 'Parent category not found' });
        return;
      }
      
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the subcategory's category's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(category.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only toggle subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== category.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only toggle subcategories for your restaurant' });
        return;
      }

      // Toggle the isActive field
      subCategory.isActive = !subCategory.isActive;
      await subCategory.save();

      res.status(200).json(subCategory);
    } catch (error) {
      console.error('Error toggling subcategory availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error toggling subcategory availability: ${errorMessage}` });
    }
  }
}
