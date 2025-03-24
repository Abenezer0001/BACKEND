import { Request, Response } from 'express';
import Category, { ICategory } from '../models/Category';
import mongoose from 'mongoose';

export class CategoryController {
  // Create a new category
  public async create(req: Request, res: Response): Promise<void> {
    try {
      console.log('Creating new category with data:', req.body);
      const { name, description, isActive, order } = req.body;

      // Validate required fields
      if (!name) {
        res.status(400).json({ error: 'Category name is required' });
        return;
      }

      // Create a new category
      const category = new Category({
        name,
        description: description || '',
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0
      });

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
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const categories = await Category.find().sort({ order: 1 });
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching categories: ${errorMessage}` });
    }
  }

  // Get category by ID
  public async getById(req: Request, res: Response): Promise<void> {
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

      res.status(200).json(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching category: ${errorMessage}` });
    }
  }

  // Update category
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID format' });
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
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID format' });
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
  public async toggleAvailability(req: Request, res: Response): Promise<void> {
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