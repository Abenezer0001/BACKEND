import { Request, Response } from 'express';
import SubSubCategory, { ISubSubCategory } from '../models/SubSubCategory';
import SubCategory from '../models/SubCategory'; // Import SubCategory model for validation
import mongoose from 'mongoose';

export class SubSubCategoryController {
  // Create a new sub-subcategory
  public async create(req: Request, res: Response): Promise<void> {
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

      // Check if parent subcategory exists
      const parentSubCategory = await SubCategory.findById(subCategory);
      if (!parentSubCategory) {
        res.status(404).json({ error: 'Parent SubCategory not found' });
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
  public async getAll(req: Request, res: Response): Promise<void> {
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

      const subSubCategories = await SubSubCategory.find(filter).populate('subCategory', 'name').sort({ order: 1 }); // Populate parent subcategory name
      res.status(200).json(subSubCategories);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching sub-subcategories: ${errorMessage}` });
    }
  }

  // Get sub-subcategory by ID
  public async getById(req: Request, res: Response): Promise<void> {
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

      res.status(200).json(subSubCategory);
    } catch (error) {
      console.error('Error fetching sub-subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching sub-subcategory: ${errorMessage}` });
    }
  }

  // Update sub-subcategory
  public async update(req: Request, res: Response): Promise<void> {
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
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid sub-subcategory ID format' });
        return;
      }

      // Optional: Add logic here to handle related MenuItems if necessary

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
  public async toggleAvailability(req: Request, res: Response): Promise<void> {
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
