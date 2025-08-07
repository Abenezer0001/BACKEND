import { Request, Response } from 'express';
import * as ingredientService from '../services/ingredientService'; // Assuming deductStockForSale is in ingredientService
import mongoose from 'mongoose';

export const deductStockForSaleHandler = async (req: Request, res: Response) => {
  try {
    const { items, restaurantId, userId } = req.body;

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Valid restaurantId is required in the request body' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required and cannot be empty' });
    }

    // Basic validation for items array contents
    for (const item of items) {
      if (!item.menuItemId || !mongoose.Types.ObjectId.isValid(item.menuItemId)) {
        return res.status(400).json({ message: `Invalid menuItemId found in items: ${item.menuItemId}` });
      }
      if (typeof item.quantitySold !== 'number' || item.quantitySold <= 0) {
        return res.status(400).json({ message: `Invalid quantitySold for menuItemId ${item.menuItemId}. Must be a positive number.` });
      }
    }

    // Optional: Validate userId if provided
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid userId format' });
    }

    const result = await ingredientService.deductStockForSale(items, restaurantId, userId);

    if (!result.success) {
      // Partial success or complete failure, return 422 or 500 based on the nature of errors
      // For simplicity, using 422 for client-side correctable errors or partial failures.
      return res.status(422).json({
        message: result.message,
        details: result.details,
      });
    }

    res.status(200).json({
      message: result.message,
      details: result.details,
    });

  } catch (error: any) {
    console.error('Error in deductStockForSaleHandler:', error);
    res.status(500).json({ message: 'Internal server error during stock deduction', error: error.message });
  }
};
