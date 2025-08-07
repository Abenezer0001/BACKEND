import { Request, Response } from 'express';
import * as ingredientService from '../services/ingredientService';
import mongoose from 'mongoose';

export const createIngredientHandler = async (req: Request, res: Response) => {
  try {
    // Assuming restaurantId is part of the request body during creation
    // or could be from auth middleware req.user.restaurantId
    if (!req.body.restaurantId) {
        return res.status(400).json({ message: 'restaurantId is required' });
    }
    const ingredient = await ingredientService.createIngredient(req.body);
    res.status(201).json(ingredient);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating ingredient', error: error.message });
  }
};

export const getAllIngredientsHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid restaurantId format' });
    }
    const ingredients = await ingredientService.getAllIngredients(restaurantId);
    res.status(200).json(ingredients);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching ingredients', error: error.message });
  }
};

export const getIngredientByIdHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const { id } = req.params;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }
    const ingredient = await ingredientService.getIngredientById(id, restaurantId);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found or not active' });
    }
    res.status(200).json(ingredient);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching ingredient', error: error.message });
  }
};

export const updateIngredientHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const { id } = req.params;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }
    const ingredient = await ingredientService.updateIngredient(id, req.body, restaurantId);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found or not active' });
    }
    res.status(200).json(ingredient);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating ingredient', error: error.message });
  }
};

export const deleteIngredientHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const { id } = req.params;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
     if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid id or restaurantId format' });
    }
    const ingredient = await ingredientService.deleteIngredient(id, restaurantId);
    if (!ingredient) {
      // This means it was already inactive or not found
      return res.status(404).json({ message: 'Ingredient not found or already inactive' });
    }
    res.status(200).json({ message: 'Ingredient deactivated successfully', ingredient });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting ingredient', error: error.message });
  }
};

export const deductStockForSaleHandler = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId query parameter is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId format' });
    }
    
    const { items, userId } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required and cannot be empty' });
    }
    
    const result = await ingredientService.deductStockForSale(items, restaurantId, userId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        details: result.details
      });
    } else {
      res.status(422).json({
        success: false,
        message: result.message,
        details: result.details
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error processing stock deduction', 
      error: error.message 
    });
  }
};
