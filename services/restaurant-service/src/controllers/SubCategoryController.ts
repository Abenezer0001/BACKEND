import { Request, Response } from 'express';
import SubCategory, { ISubCategory } from '../models/SubCategory';
import Category from '../models/Category'; // Import Category model for validation
import mongoose from 'mongoose';

export class SubCategoryController {
  // Create a new subcategory
  public async create(req: Request, res: Response): Promise<void> {
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

      // Check if parent category exists
      const parentCategory = await Category.findById(category);
      if (!parentCategory) {
        res.status(404).json({ error: 'Parent Category not found' });
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
  public async getAll(req: Request, res: Response): Promise<void> {
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

      const subCategories = await SubCategory.find(filter).populate('category', 'name').sort({ order: 1 }); // Populate parent category name
      res.status(200).json(subCategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching subcategories: ${errorMessage}` });
    }
  }

  // Get subcategory by ID
  public async getById(req: Request, res: Response): Promise<void> {
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

      res.status(200).json(subCategory);
    } catch (error) {
      console.error('Error fetching subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching subcategory: ${errorMessage}` });
    }
  }

  // Update subcategory
  public async update(req: Request, res: Response): Promise<void> {
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
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid subcategory ID format' });
        return;
      }

      // Optional: Add logic here to handle related SubSubCategories if necessary (e.g., delete them or reassign)

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
  public async toggleAvailability(req: Request, res: Response): Promise<void> {
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
