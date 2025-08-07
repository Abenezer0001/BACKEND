import { Request, Response } from 'express';
import Modifier, { IModifier, IModifierOption } from '../models/Modifier';
import MenuItem from '../models/MenuItem';
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

export class ModifierController {
  // Create a new modifier group
  public async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('Creating new modifier group with data:', req.body);
      const modifierData = req.body;
      const { restaurantId } = req.params;
      
      // Validate user has access to this restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only manage modifiers for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== restaurantId && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only manage modifiers for your restaurant' });
        return;
      }
      
      // Validate required fields
      if (!modifierData.name) {
        res.status(400).json({ error: 'Modifier group name is required' });
        return;
      }

      if (!modifierData.options || !Array.isArray(modifierData.options) || modifierData.options.length === 0) {
        res.status(400).json({ error: 'At least one modifier option is required' });
        return;
      }

      // Validate modifier options
      for (const option of modifierData.options) {
        if (!option.name) {
          res.status(400).json({ error: 'Option name is required for all options' });
          return;
        }
        if (typeof option.price !== 'number' || option.price < 0) {
          res.status(400).json({ error: 'Option price must be a valid non-negative number' });
          return;
        }
      }

      // Validate selection type and limits
      if (modifierData.selectionType && !['SINGLE', 'MULTIPLE'].includes(modifierData.selectionType)) {
        res.status(400).json({ error: 'Selection type must be either SINGLE or MULTIPLE' });
        return;
      }

      // Set restaurantId from params
      modifierData.restaurantId = restaurantId;

      const modifier = new Modifier(modifierData);
      console.log('Saving modifier group to database...');
      const savedModifier = await modifier.save();
      console.log('Modifier group saved successfully:', savedModifier);
      
      res.status(201).json(savedModifier);
    } catch (error) {
      console.error('Error creating modifier group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating modifier group: ${errorMessage}` });
    }
  }

  // Get all modifier groups for a restaurant
  public async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      
      // Validate user has access to this restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only view modifiers for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== restaurantId && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only view modifiers for your restaurant' });
        return;
      }

      const modifiers = await Modifier.find({ restaurantId }).sort({ displayOrder: 1, name: 1 });
      res.status(200).json(modifiers);
    } catch (error) {
      console.error('Error fetching modifier groups:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching modifier groups: ${errorMessage}` });
    }
  }

  // Get modifier group by ID
  public async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier group ID format' });
        return;
      }
      
      const modifier = await Modifier.findById(id);
      if (!modifier) {
        res.status(404).json({ error: 'Modifier group not found' });
        return;
      }

      // Validate user has access to this restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(modifier.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only view modifiers for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== modifier.restaurantId.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only view modifiers for your restaurant' });
        return;
      }
      
      res.status(200).json(modifier);
    } catch (error) {
      console.error('Error fetching modifier group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching modifier group: ${errorMessage}` });
    }
  }

  // Update modifier group
  public async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier group ID format' });
        return;
      }

      // Find existing modifier to check restaurant access
      const existingModifier = await Modifier.findById(id);
      if (!existingModifier) {
        res.status(404).json({ error: 'Modifier group not found' });
        return;
      }

      // Validate user has access to this restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(existingModifier.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only update modifiers for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== existingModifier.restaurantId.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only update modifiers for your restaurant' });
        return;
      }

      // Validate options if being updated
      if (updateData.options) {
        if (!Array.isArray(updateData.options) || updateData.options.length === 0) {
          res.status(400).json({ error: 'At least one modifier option is required' });
          return;
        }

        for (const option of updateData.options) {
          if (!option.name) {
            res.status(400).json({ error: 'Option name is required for all options' });
            return;
          }
          if (typeof option.price !== 'number' || option.price < 0) {
            res.status(400).json({ error: 'Option price must be a valid non-negative number' });
            return;
          }
        }
      }

      // Validate selection type if being updated
      if (updateData.selectionType && !['SINGLE', 'MULTIPLE'].includes(updateData.selectionType)) {
        res.status(400).json({ error: 'Selection type must be either SINGLE or MULTIPLE' });
        return;
      }

      // Don't allow changing restaurantId
      delete updateData.restaurantId;
      
      const modifier = await Modifier.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      res.status(200).json(modifier);
    } catch (error) {
      console.error('Error updating modifier group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating modifier group: ${errorMessage}` });
    }
  }

  // Delete modifier group
  public async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier group ID format' });
        return;
      }
      
      // Find existing modifier to check restaurant access
      const existingModifier = await Modifier.findById(id);
      if (!existingModifier) {
        res.status(404).json({ error: 'Modifier group not found' });
        return;
      }

      // Validate user has access to this restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(existingModifier.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only delete modifiers for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== existingModifier.restaurantId.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only delete modifiers for your restaurant' });
        return;
      }

      // Check if modifier group is being used by any menu items
      const menuItemsUsingModifier = await MenuItem.find({ 
        modifierGroups: id,
        restaurantId: existingModifier.restaurantId 
      });

      if (menuItemsUsingModifier.length > 0) {
        res.status(400).json({ 
          error: 'Cannot delete modifier group: it is being used by menu items',
          usedBy: menuItemsUsingModifier.map(item => ({ id: item._id, name: item.name }))
        });
        return;
      }
      
      await Modifier.findByIdAndDelete(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting modifier group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting modifier group: ${errorMessage}` });
    }
  }

  // Toggle modifier group availability
  public async toggleAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier group ID format' });
        return;
      }
      
      const modifier = await Modifier.findById(id);
      if (!modifier) {
        res.status(404).json({ error: 'Modifier group not found' });
        return;
      }

      // Validate user has access to this restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(modifier.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only modify modifiers for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== modifier.restaurantId.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only modify modifiers for your restaurant' });
        return;
      }
      
      modifier.isActive = !modifier.isActive;
      await modifier.save();
      
      res.status(200).json(modifier);
    } catch (error) {
      console.error('Error toggling modifier group availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error toggling modifier group availability: ${errorMessage}` });
    }
  }

  // Update modifier option availability
  public async toggleOptionAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, optionId } = req.params;
      
      // Validate IDs are valid ObjectIds
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid modifier group ID format' });
        return;
      }
      
      const modifier = await Modifier.findById(id);
      if (!modifier) {
        res.status(404).json({ error: 'Modifier group not found' });
        return;
      }

      // Validate user has access to this restaurant
      if (req.user?.role === 'restaurant_admin') {
        // For restaurant admins, check if the restaurant belongs to their business
        if (req.user?.businessId) {
          const Restaurant = require('../models/Restaurant').default;
          const restaurant = await Restaurant.findById(modifier.restaurantId);
          
          if (!restaurant || restaurant.businessId?.toString() !== req.user.businessId?.toString()) {
            res.status(403).json({ error: 'Access denied: You can only modify modifiers for restaurants in your business' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Access denied: Restaurant admin must have businessId' });
          return;
        }
      } else if (req.user?.restaurantId !== modifier.restaurantId.toString() && req.user?.role !== 'system_admin') {
        res.status(403).json({ error: 'Access denied: You can only modify modifiers for your restaurant' });
        return;
      }

      // Find the option to toggle
      const option = modifier.options.find(opt => opt._id?.toString() === optionId);
      if (!option) {
        res.status(404).json({ error: 'Modifier option not found' });
        return;
      }
      
      option.isAvailable = !option.isAvailable;
      await modifier.save();
      
      res.status(200).json(modifier);
    } catch (error) {
      console.error('Error toggling modifier option availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error toggling modifier option availability: ${errorMessage}` });
    }
  }
} 