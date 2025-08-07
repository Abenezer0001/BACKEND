import { Router, Request, Response } from 'express';
import Promotion from '../models/Promotion';
import mongoose from 'mongoose';

/**
 * Debug routes for promotions - WITHOUT authentication middleware
 * For testing and troubleshooting only
 */
const debugRouter = Router();

// Debug endpoint to get all promotions
debugRouter.get('/all', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] Getting all promotions');
    
    const allPromotions = await Promotion.find({});
    res.status(200).json({
      success: true,
      count: allPromotions.length,
      promotions: allPromotions
    });
  } catch (error: any) {
    console.error('[DEBUG] Error getting all promotions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
});

// Debug endpoint to get promotion by ID
debugRouter.get('/:promotionId', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] Getting promotion by ID:', req.params.promotionId);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.promotionId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid promotion ID format' 
      });
    }
    
    const promotion = await Promotion.findById(req.params.promotionId);
    
    if (!promotion) {
      return res.status(404).json({ 
        success: false, 
        error: 'Promotion not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      promotion
    });
  } catch (error: any) {
    console.error('[DEBUG] Error getting promotion by ID:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
});

// Debug endpoint to create a promotion
debugRouter.post('/', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] Creating promotion with data:', req.body);
    
    const promotion = new Promotion(req.body);
    const savedPromotion = await promotion.save();
    
    res.status(201).json({
      success: true,
      promotion: savedPromotion
    });
  } catch (error: any) {
    console.error('[DEBUG] Error creating promotion:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
});

export default debugRouter;
