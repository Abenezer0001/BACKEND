import { Request, Response } from 'express';
import Modifier, { IModifier } from '../models/Modifier';
import mongoose from 'mongoose';

export class ModifierController {
  // Create a new modifier
  public async create(req: Request, res: Response): Promise<void> {
    try {
      console.log('Creating new modifier with data:', req.body);
      const modifierData = req.body;
      
      // Validate required fields
      if (!modifierData.name) {
        res.status(400).json({ error: 'Modifier name is required' });
        return;
      }

      // Validate price is a number
      if (isNaN(Number(modifierData.price))) {
        res.status(400).json({ error: 'Price must be a valid number' });
        return;
      }

      const modifier = new Modifier(modifierData);
      console.log('Saving modifier to database...');
      const savedModifier = await modifier.save();
      console.log('Modifier saved successfully:', savedModifier);
      
      res.status(201).json(savedModifier);
    } catch (error) {
      console.error('Error creating modifier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating modifier: ${errorMessage}` });
    }
  }

  // Get all modifiers
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const modifiers = await Modifier.find();
      res.status(200).json(modifiers);
    } catch (error) {
      console.error('Error fetching modifiers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching modifiers: ${errorMessage}` });
    }
  }

  // Get modifier by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier ID format' });
        return;
      }
      
      const modifier = await Modifier.findById(id);
      if (!modifier) {
        res.status(404).json({ error: 'Modifier not found' });
        return;
      }
      
      res.status(200).json(modifier);
    } catch (error) {
      console.error('Error fetching modifier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching modifier: ${errorMessage}` });
    }
  }

  // Update modifier
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier ID format' });
        return;
      }

      // Validate price is a number if provided
      if (updateData.price !== undefined && isNaN(Number(updateData.price))) {
        res.status(400).json({ error: 'Price must be a valid number' });
        return;
      }
      
      const modifier = await Modifier.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!modifier) {
        res.status(404).json({ error: 'Modifier not found' });
        return;
      }
      
      res.status(200).json(modifier);
    } catch (error) {
      console.error('Error updating modifier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating modifier: ${errorMessage}` });
    }
  }

  // Delete modifier
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier ID format' });
        return;
      }
      
      const modifier = await Modifier.findByIdAndDelete(id);
      if (!modifier) {
        res.status(404).json({ error: 'Modifier not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting modifier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting modifier: ${errorMessage}` });
    }
  }

  // Toggle modifier availability
  public async toggleAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier ID format' });
        return;
      }
      
      const modifier = await Modifier.findById(id);
      if (!modifier) {
        res.status(404).json({ error: 'Modifier not found' });
        return;
      }
      
      modifier.isAvailable = !modifier.isAvailable;
      await modifier.save();
      
      res.status(200).json(modifier);
    } catch (error) {
      console.error('Error toggling modifier availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error toggling modifier availability: ${errorMessage}` });
    }
  }
} 