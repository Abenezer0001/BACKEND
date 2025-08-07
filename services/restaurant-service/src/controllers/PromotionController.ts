import { Request, Response } from 'express';
import Promotion, { IPromotion } from '../models/Promotion'; // Adjust path if necessary
import mongoose from 'mongoose';

export class PromotionController {
  /**
   * @swagger
   * /promotions/splash:
   *   get:
   *     summary: Get active splash screen promotions for a restaurant or specific venue
   *     tags: [Promotions]
   *     parameters:
   *       - in: query
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the restaurant
   *       - in: query
   *         name: venueId
   *         schema:
   *           type: string
   *         description: The ID of the venue
   *     responses:
   *       200:
   *         description: A list of active splash promotions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Promotion' // Assuming Promotion schema is defined in Swagger
   *       400:
   *         description: Bad request (e.g., missing restaurantId or venueId)
   *       500:
   *         description: Server error
   */
  public async getActiveSplashPromotions(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId } = req.query;

      if (!restaurantId) {
        res.status(400).json({ error: 'Restaurant ID is required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
        res.status(400).json({ error: 'Invalid restaurantId format' });
        return;
      }

      // If venueId is provided, validate it
      if (venueId && !mongoose.Types.ObjectId.isValid(venueId as string)) {
        res.status(400).json({ error: 'Invalid venueId format' });
        return;
      }

      const currentDate = new Date();
      let filter: any = {
        restaurantId: restaurantId as string,
        isActive: true,
        displayOnSplash: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
      };

      // If venue is specified, filter by venue
      if (venueId) {
        filter.enabledVenues = { $in: [venueId as string] };
      }

      const promotions = await Promotion.find(filter)
        .populate('enabledVenues', 'name description')
        .populate('combos.menuItems', 'name price image')
        .sort({ createdAt: -1 })
      .limit(5); // Limit to 5 promotions for the carousel

      res.status(200).json(promotions);
    } catch (error) {
      console.error('Error fetching active splash promotions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching active splash promotions: ${errorMessage}` });
    }
  }

  /**
   * @swagger
   * /promotions/all:
   *   get:
   *     summary: Get all active promotions for a restaurant or specific venue (for menu page display)
   *     tags: [Promotions]
   *     parameters:
   *       - in: query
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the restaurant
   *       - in: query
   *         name: venueId
   *         schema:
   *           type: string
   *         description: The ID of the venue
   *     responses:
   *       200:
   *         description: A list of active promotions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Promotion' // Assuming Promotion schema is defined in Swagger
   *       400:
   *         description: Bad request (e.g., missing restaurantId or venueId)
   *       500:
   *         description: Server error
   */
  public async getActivePromotions(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId } = req.query;

      if (!restaurantId) {
        res.status(400).json({ error: 'Restaurant ID is required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
        res.status(400).json({ error: 'Invalid restaurantId format' });
        return;
      }

      // If venueId is provided, validate it
      if (venueId && !mongoose.Types.ObjectId.isValid(venueId as string)) {
        res.status(400).json({ error: 'Invalid venueId format' });
        return;
      }

      const currentDate = new Date();
      let filter: any = {
        restaurantId: restaurantId as string,
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
      };

      // If venue is specified, filter by venue
      if (venueId) {
        filter.enabledVenues = { $in: [venueId as string] };
      }

      const promotions = await Promotion.find(filter)
        .populate('enabledVenues', 'name description')
        .populate('combos.menuItems', 'name price image description')
        .sort({ createdAt: -1 });

      res.status(200).json(promotions);
    } catch (error) {
      console.error('Error fetching active promotions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching active promotions: ${errorMessage}` });
    }
  }

  /**
   * @swagger
   * /promotions/{promotionId}:
   *   get:
   *     summary: Get a specific promotion by ID with full details
   *     tags: [Promotions]
   *     parameters:
   *       - in: path
   *         name: promotionId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the promotion
   *     responses:
   *       200:
   *         description: The details of the promotion
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Promotion' // Assuming Promotion schema is defined in Swagger
   *       400:
   *         description: Bad request (e.g., invalid promotionId format)
   *       404:
   *         description: Promotion not found or not active
   *       500:
   *         description: Server error
   */
  public async getPromotionById(req: Request, res: Response): Promise<void> {
    try {
      const { promotionId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(promotionId)) {
        res.status(400).json({ error: 'Invalid promotionId format' });
        return;
      }

      const currentDate = new Date();
      const promotion = await Promotion.findOne({
        _id: promotionId,
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
      })
      .populate('enabledVenues', 'name description capacity')
      .populate('combos.menuItems', 'name price image description preparationTime');

      if (!promotion) {
        res.status(404).json({ error: 'Promotion not found or not active' });
        return;
      }

      res.status(200).json(promotion);
    } catch (error) {
      console.error('Error fetching promotion by ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching promotion: ${errorMessage}` });
    }
  }
}
