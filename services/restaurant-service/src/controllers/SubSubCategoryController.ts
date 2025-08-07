import { Request, Response } from 'express';
import SubSubCategory, { ISubSubCategory } from '../models/SubSubCategory';
import SubCategory from '../models/SubCategory'; // Import SubCategory model for validation
import Category from '../models/Category';
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

export class SubSubCategoryController {
  // Create a new sub-subcategory
  public async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('Creating new sub-subcategory with data:', req.body);
      const { name, description, image, isActive, order, subCategory } = req.body;

      // Validate required fields
      if (!name) {
        res.status(400).json({ error: 'SubSubCategory name is required' });
        return;
      }
      if (!subCategory) {
        res.status(400).json({ error: 'Parent SubCategory ID is required' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(subCategory)) {
        res.status(400).json({ error: 'Invalid parent SubCategory ID format' });
        return;
      }

      // Check if parent subcategory exists and validate permissions
      const parentSubCategory = await SubCategory.findById(subCategory);
      if (!parentSubCategory) {
        res.status(404).json({ error: 'Parent SubCategory not found' });
        return;
      }
      
      // Get the parent category to check restaurant permissions
      const parentCategory = await Category.findById(parentSubCategory.category);
      if (!parentCategory) {
        res.status(404).json({ error: 'Parent Category not found' });
        return;
      }
      
      // Validate user has access to this subcategory's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the subcategory's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(parentCategory.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only create sub-subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== parentCategory.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only create sub-subcategories for your restaurant' });
        return;
      }

      // Create a new sub-subcategory
      const subSubCategory = new SubSubCategory({
        name,
        description: description || '',
        image: image || '', // Handle optional image
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
        subCategory // Assign parent subcategory ID
      });

      console.log('Saving sub-subcategory to database...');
      const savedSubSubCategory = await subSubCategory.save();
      console.log('SubSubCategory saved successfully:', savedSubSubCategory);

      res.status(201).json(savedSubSubCategory);
    } catch (error) {
      console.error('Error creating sub-subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating sub-subcategory: ${errorMessage}` });
    }
  }

  // Get all sub-subcategories (optionally filter by subcategory)
  public async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { subCategoryId } = req.query; // Optional query parameter to filter by subcategory
      const filter: any = {};

      if (subCategoryId) {
        if (!mongoose.Types.ObjectId.isValid(subCategoryId as string)) {
          res.status(400).json({ error: 'Invalid parent SubCategory ID format' });
          return;
        }
        filter.subCategory = subCategoryId;
      }

      let subSubCategories;
      
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, only show sub-subcategories for subcategories from restaurants in their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurants = await Restaurant.find({ businessId: req.user.businessId });
          const restaurantIds = restaurants.map(r => r._id.toString());
          
          // Get categories that belong to restaurants in this business
          const categories = await Category.find({ restaurantId: { $in: restaurantIds } });
          const categoryIds = categories.map(c => c._id.toString());
          
          // Get subcategories that belong to these categories
          const subCategories = await SubCategory.find({ category: { $in: categoryIds } });
          const subCategoryIds = subCategories.map(sc => sc._id.toString());
          
          // Filter sub-subcategories by these subcategories
          if (filter.subCategory) {
            // If specific subcategory requested, verify it belongs to admin's business
            if (!subCategoryIds.includes(filter.subCategory.toString())) {
              res.status(403).json({ error: 'Access denied: You can only view sub-subcategories for subcategories in your business' });
              return;
            }
          } else {
            // Otherwise, filter by all subcategories in business
            filter.subCategory = { $in: subCategoryIds };
          }
          
          subSubCategories = await SubSubCategory.find(filter).populate('subCategory', 'name').sort({ order: 1 });
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.role !== 'system_admin') {
        // For other roles, filter by their assigned restaurant
        if (req.user?.restaurantId) {
          const categories = await Category.find({ restaurantId: req.user.restaurantId });
          const categoryIds = categories.map(c => c._id.toString());
          const subCategories = await SubCategory.find({ category: { $in: categoryIds } });
          const subCategoryIds = subCategories.map(sc => sc._id.toString());
          
          if (filter.subCategory) {
            // If specific subcategory requested, verify it belongs to user's restaurant
            if (!subCategoryIds.includes(filter.subCategory.toString())) {
              res.status(403).json({ error: 'Access denied: You can only view sub-subcategories for your restaurant' });
              return;
            }
          } else {
            filter.subCategory = { $in: subCategoryIds };
          }
          
          subSubCategories = await SubSubCategory.find(filter).populate('subCategory', 'name').sort({ order: 1 });
        } else {
          res.status(403).json({ error: 'Access denied: You must be assigned to a restaurant' });
          return;
        }
      } else {
        // System admin can see all
        subSubCategories = await SubSubCategory.find(filter).populate('subCategory', 'name').sort({ order: 1 });
      }
      
      res.status(200).json(subSubCategories);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching sub-subcategories: ${errorMessage}` });
    }
  }

  // Get sub-subcategory by ID
  public async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid sub-subcategory ID format' });
        return;
      }

      const subSubCategory = await SubSubCategory.findById(id).populate('subCategory', 'name'); // Populate parent subcategory name
      if (!subSubCategory) {
        res.status(404).json({ error: 'SubSubCategory not found' });
        return;
      }
      
      // Validate user has access to this sub-subcategory's restaurant
      const subCategory = await SubCategory.findById(subSubCategory.subCategory);
      if (!subCategory) {
        res.status(404).json({ error: 'Parent subcategory not found' });
        return;
      }
      
      const category = await Category.findById(subCategory.category);
      if (!category) {
        res.status(404).json({ error: 'Parent category not found' });
        return;
      }
      
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the sub-subcategory's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(category.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only view sub-subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== category.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only view sub-subcategories for your restaurant' });
        return;
      }

      res.status(200).json(subSubCategory);
    } catch (error) {
      console.error('Error fetching sub-subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching sub-subcategory: ${errorMessage}` });
    }
  }

  // Update sub-subcategory
  public async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid sub-subcategory ID format' });
        return;
      }

      // Prevent changing the parent subcategory directly if needed, or validate if allowed
      if (updateData.subCategory) {
         if (!mongoose.Types.ObjectId.isValid(updateData.subCategory)) {
            res.status(400).json({ error: 'Invalid parent SubCategory ID format' });
            return;
         }
         const parentSubCategory = await SubCategory.findById(updateData.subCategory);
         if (!parentSubCategory) {
            res.status(404).json({ error: 'Parent SubCategory not found' });
            return;
         }
      }

      // First get the existing sub-subcategory to check permissions
      const existingSubSubCategory = await SubSubCategory.findById(id);
      if (!existingSubSubCategory) {
        res.status(404).json({ error: 'SubSubCategory not found' });
        return;
      }
      
      // Get the parent subcategory and category to check restaurant permissions
      const subCategory = await SubCategory.findById(existingSubSubCategory.subCategory);
      if (!subCategory) {
        res.status(404).json({ error: 'Parent subcategory not found' });
        return;
      }
      
      const category = await Category.findById(subCategory.category);
      if (!category) {
        res.status(404).json({ error: 'Parent category not found' });
        return;
      }
      
      // Validate user has access to this sub-subcategory's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the sub-subcategory's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(category.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only update sub-subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== category.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only update sub-subcategories for your restaurant' });
        return;
      }
      
      const subSubCategory = await SubSubCategory.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('subCategory', 'name');

      if (!subSubCategory) {
        res.status(404).json({ error: 'SubSubCategory not found' });
        return;
      }

      res.status(200).json(subSubCategory);
    } catch (error) {
      console.error('Error updating sub-subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating sub-subcategory: ${errorMessage}` });
    }
  }

  // Delete sub-subcategory
  public async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid sub-subcategory ID format' });
        return;
      }

      // Optional: Add logic here to handle related MenuItems if necessary

      // First get the existing sub-subcategory to check permissions
      const existingSubSubCategory = await SubSubCategory.findById(id);
      if (!existingSubSubCategory) {
        res.status(404).json({ error: 'SubSubCategory not found' });
        return;
      }
      
      // Get the parent subcategory and category to check restaurant permissions
      const subCategory = await SubCategory.findById(existingSubSubCategory.subCategory);
      if (!subCategory) {
        res.status(404).json({ error: 'Parent subcategory not found' });
        return;
      }
      
      const category = await Category.findById(subCategory.category);
      if (!category) {
        res.status(404).json({ error: 'Parent category not found' });
        return;
      }
      
      // Validate user has access to this sub-subcategory's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the sub-subcategory's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(category.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only delete sub-subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== category.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only delete sub-subcategories for your restaurant' });
        return;
      }
      
      const subSubCategory = await SubSubCategory.findByIdAndDelete(id);
      if (!subSubCategory) {
        res.status(404).json({ error: 'SubSubCategory not found' });
        return;
      }

      res.status(200).json({ message: 'SubSubCategory deleted successfully' });
    } catch (error) {
      console.error('Error deleting sub-subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting sub-subcategory: ${errorMessage}` });
    }
  }

  // Toggle sub-subcategory availability
  public async toggleAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid sub-subcategory ID format' });
        return;
      }

      const subSubCategory = await SubSubCategory.findById(id);
      if (!subSubCategory) {
        res.status(404).json({ error: 'SubSubCategory not found' });
        return;
      }
      
      // Get the parent subcategory and category to check restaurant permissions
      const subCategory = await SubCategory.findById(subSubCategory.subCategory);
      if (!subCategory) {
        res.status(404).json({ error: 'Parent subcategory not found' });
        return;
      }
      
      const category = await Category.findById(subCategory.category);
      if (!category) {
        res.status(404).json({ error: 'Parent category not found' });
        return;
      }
      
      // Validate user has access to this sub-subcategory's restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the sub-subcategory's restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(category.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only toggle sub-subcategories for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== category.restaurantId?.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only toggle sub-subcategories for your restaurant' });
        return;
      }

      // Toggle the isActive field
      subSubCategory.isActive = !subSubCategory.isActive;
      await subSubCategory.save();

      res.status(200).json(subSubCategory);
    } catch (error) {
      console.error('Error toggling sub-subcategory availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error toggling sub-subcategory availability: ${errorMessage}` });
    }
  }
}
