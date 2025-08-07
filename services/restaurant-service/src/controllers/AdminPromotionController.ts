import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../auth-service/src/types/auth.types';
import Promotion, { IPromotion } from '../models/Promotion'; // Adjust path if necessary
import MenuItem from '../models/MenuItem'; // For combo validation
import Venue from '../models/Venue'; // For venue validation
import mongoose from 'mongoose';
import { body, validationResult, ValidationChain } from 'express-validator';
import multer from 'multer';
import ImageService from '../services/ImageService'; // Import ImageService

// --- Multer Configuration for Promotions ---
// Use memoryStorage to handle files as buffers in memory for S3 upload
const storage = multer.memoryStorage();

// File filter (optional: restrict to image types)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.') as any, false); // Cast to any to satisfy callback type
  }
};

// Add limits for file size (e.g., 5MB)
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
// --- End Multer Configuration ---

// Validation rules for creating a promotion
export const promotionCreationValidationRules: ValidationChain[] = [
  body('title').notEmpty().withMessage('Title is required').isString().withMessage('Title must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('imageUrl').notEmpty().withMessage('Image URL is required').isURL().withMessage('Image URL must be a valid URL'),
  body('restaurantId').notEmpty().withMessage('Restaurant ID is required').isMongoId().withMessage('Restaurant ID must be a valid MongoDB ObjectId'),
  body('enabledVenues').optional().isArray().withMessage('enabledVenues must be an array'),
  body('enabledVenues.*').optional().isMongoId().withMessage('Each venue ID must be a valid MongoDB ObjectId'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('displayOnSplash').optional().isBoolean().withMessage('displayOnSplash must be a boolean'),
  body('startDate').notEmpty().withMessage('Start date is required').isISO8601().withMessage('Start date must be a valid ISO8601 date'),
  body('endDate').notEmpty().withMessage('End date is required').isISO8601().withMessage('End date must be a valid ISO8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('combos').optional().isArray().withMessage('combos must be an array'),
  body('combos.*.name').optional().isString().withMessage('Combo name must be a string'),
  body('combos.*.description').optional().isString().withMessage('Combo description must be a string'),
  body('combos.*.menuItems').optional().isArray().withMessage('Combo menuItems must be an array'),
  body('combos.*.menuItems.*').optional().isMongoId().withMessage('Each menu item ID must be a valid MongoDB ObjectId'),
  body('combos.*.discountRate').optional().isNumeric().withMessage('Discount rate must be a number')
    .custom((value) => {
      if (value < 0 || value > 100) {
        throw new Error('Discount rate must be between 0 and 100');
      }
      return true;
    }),
];

// Validation rules for updating a promotion
export const promotionUpdateValidationRules: ValidationChain[] = [
  body('title').optional().isString().withMessage('Title must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be a valid URL'),
  body('restaurantId').optional().isMongoId().withMessage('Restaurant ID must be a valid MongoDB ObjectId (if provided)'),
  body('enabledVenues').optional().isArray().withMessage('enabledVenues must be an array'),
  body('enabledVenues.*').optional().isMongoId().withMessage('Each venue ID must be a valid MongoDB ObjectId'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('displayOnSplash').optional().isBoolean().withMessage('displayOnSplash must be a boolean'),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO8601 date'),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO8601 date')
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        if (new Date(value) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  body('combos').optional().isArray().withMessage('combos must be an array'),
  body('combos.*.name').optional().isString().withMessage('Combo name must be a string'),
  body('combos.*.description').optional().isString().withMessage('Combo description must be a string'),
  body('combos.*.menuItems').optional().isArray().withMessage('Combo menuItems must be an array'),
  body('combos.*.menuItems.*').optional().isMongoId().withMessage('Each menu item ID must be a valid MongoDB ObjectId'),
  body('combos.*.discountRate').optional().isNumeric().withMessage('Discount rate must be a number')
    .custom((value) => {
      if (value < 0 || value > 100) {
        throw new Error('Discount rate must be between 0 and 100');
      }
      return true;
    }),
];

export class AdminPromotionController {
  /**
   * @swagger
   * /admin/promotions:
   *   post:
   *     summary: Create a new promotion
   *     tags: [AdminPromotions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PromotionCreation' // Define this schema in Swagger
   *     responses:
   *       201:
   *         description: Promotion created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Promotion'
   *       400:
   *         description: Bad request (e.g., validation error)
   *       500:
   *         description: Server error
   */
  public async createPromotion(req: AuthenticatedRequest, res: Response): Promise<void> {
    // First validate that user exists and has correct permissions
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      console.log('=== PROMOTION CREATION START ===');
      console.log('User role:', user.role);
      console.log('User businessId:', user.businessId);
      console.log('Request has file:', !!req.file);
      console.log('Request body keys:', Object.keys(req.body || {}));
      
      // Handle FormData - extract text fields and file
      let promotionData: any = {};
      let imageFile: Express.Multer.File | undefined;

      console.log('Step 1: Parsing form data...');
      // Check if this is FormData (has file) or JSON
      if (req.file) {
        // FormData - parse text fields
        Object.keys(req.body).forEach(key => {
          if (key === 'combos' || key === 'enabledVenues') {
            try {
              promotionData[key] = JSON.parse(req.body[key]);
            } catch (e) {
              // If JSON parsing fails, treat as empty array for these fields
              console.warn(`Failed to parse ${key} as JSON:`, e);
              promotionData[key] = [];
            }
          } else if (key === 'isActive' || key === 'displayOnSplash') {
            // Convert string booleans to actual booleans
            promotionData[key] = req.body[key] === 'true';
          } else {
            promotionData[key] = req.body[key];
          }
        });
        imageFile = req.file;
      } else {
        // Regular JSON request
        promotionData = req.body;
      }
      
      console.log('Step 2: Form data parsed successfully');
      console.log('Title:', promotionData.title);
      console.log('RestaurantId:', promotionData.restaurantId);
      console.log('BusinessId:', promotionData.businessId);

      // Business permission validation - user must be creating promotions for their own business
      console.log('Step 3: Checking business permissions...');
      if (user.role !== 'admin' && user.businessId !== promotionData.businessId) {
        console.log('Permission denied - business mismatch');
        res.status(403).json({ error: 'You do not have permission to create promotions for this business' });
        return;
      }

      // Basic required field validation
      console.log('Step 4: Validating required fields...');
      if (!promotionData.title || !promotionData.restaurantId) {
        res.status(400).json({ error: 'Title and restaurant are required' });
        return;
      }

      console.log('Step 5: Validating dates...');
      // Validate date format and logic
      const startDate = new Date(promotionData.startDate);
      const endDate = new Date(promotionData.endDate);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }
      if (endDate <= startDate) {
        res.status(400).json({ error: 'End date must be after start date' });
        return;
      }

      console.log('Step 6: Handling image upload...');
      // Upload image to S3 if provided
      let imageUrl = promotionData.imageUrl; // fallback to provided URL
      
      if (imageFile) {
        try {
          console.log('Uploading file to S3...');
          imageUrl = await ImageService.uploadImage(imageFile.buffer, imageFile.originalname);
          console.log('File uploaded successfully');
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          res.status(500).json({ error: 'Failed to upload image' });
          return;
        }
      }

      // Ensure image URL is provided (either uploaded or existing)
      console.log('Step 7: Checking final imageUrl...');
      if (!imageUrl) {
        console.log('No imageUrl provided - returning 400 error');
        res.status(400).json({ error: 'Image is required' });
        return;
      }

      console.log('Step 8: Creating promotion object...');
      // Create promotion with uploaded image URL
      const promotion = new Promotion({
        title: promotionData.title,
        description: promotionData.description || '',
        imageUrl: imageUrl,
        restaurantId: new mongoose.Types.ObjectId(promotionData.restaurantId),
        enabledVenues: Array.isArray(promotionData.enabledVenues) ? promotionData.enabledVenues.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
        isActive: promotionData.isActive !== undefined ? promotionData.isActive : true,
        displayOnSplash: promotionData.displayOnSplash !== undefined ? promotionData.displayOnSplash : false,
        startDate: new Date(promotionData.startDate),
        endDate: new Date(promotionData.endDate),
        combos: promotionData.combos || [],
      });

      console.log('Step 9: Saving promotion to database...');
      const savedPromotion = await promotion.save();
      console.log('Step 10: Promotion saved successfully with ID:', savedPromotion._id);

      res.status(201).json({
        success: true,
        data: savedPromotion,
        message: 'Promotion created successfully'
      });
      
    } catch (error: any) {
      console.error('=== PROMOTION CREATION ERROR ===');
      console.error('Error message:', error?.message || 'Unknown error');
      console.error('Error name:', error?.name || 'Unknown');
      
      // Handle validation errors gracefully  
      if (error.name === 'ValidationError') {
        console.error('Validation error occurred');
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: `Error creating promotion: ${error.message}` });
      }
    }
  }

  /**
   * @swagger
   * /admin/promotions:
   *   get:
   *     summary: Get all promotions for a restaurant (or all promotions for system admin)
   *     tags: [AdminPromotions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: restaurantId
   *         required: false
   *         schema:
   *           type: string
   *         description: The ID of the restaurant to fetch promotions for. Optional for system admin to get all promotions.
   *     responses:
   *       200:
   *         description: A list of promotions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Promotion'
   *       400:
   *         description: Bad request (e.g., missing restaurantId for restaurant admin)
   *       500:
   *         description: Server error
   */
  public async getAllPromotionsForRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
    // First validate that user exists and has correct permissions
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    try {
      const { restaurantId, venueId } = req.query;

      // For restaurant admin, restaurantId is required
      if (user.role === 'restaurant_admin' && !restaurantId) {
        res.status(400).json({ error: 'Restaurant ID is required for restaurant admin' });
        return;
      }

      // For system admin, restaurantId is optional
      if (restaurantId && !mongoose.Types.ObjectId.isValid(restaurantId as string)) {
        res.status(400).json({ error: 'Invalid restaurantId format' });
        return;
      }

      let filter: any = {};
      
      // Add restaurant filter if provided
      if (restaurantId) {
        filter.restaurantId = restaurantId as string;
      }
      
      // If venue filter is provided, add it to the query
      if (venueId && venueId !== 'all') {
        if (!mongoose.Types.ObjectId.isValid(venueId as string)) {
          res.status(400).json({ error: 'Invalid venueId format' });
          return;
        }
        filter.enabledVenues = { $in: [venueId as string] };
      }

      // For non-system admins, validate business ID access
      if (user.role !== 'system_admin' && user.businessId && restaurantId) {
        // In a real implementation, you would verify the restaurant belongs to the user's business
        // For now we'll trust the businessId in the JWT token
      }

      const promotions = await Promotion.find(filter)
        .populate('enabledVenues', 'name description')
        .populate('combos.menuItems', 'name price image')
        .sort({ createdAt: -1 });
      
      res.status(200).json(promotions);
    } catch (error) {
      console.error('Error fetching all promotions for restaurant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching promotions: ${errorMessage}` });
    }
  }

  /**
   * @swagger
   * /admin/promotions/{promotionId}:
   *   get:
   *     summary: Get a specific promotion by its ID
   *     tags: [AdminPromotions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: promotionId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the promotion
   *     responses:
   *       200:
   *         description: The requested promotion
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Promotion'
   *       404:
   *         description: Promotion not found
   *       500:
   *         description: Server error
   */
  public async getPromotionById(req: AuthenticatedRequest, res: Response): Promise<void> {
    // First validate that user exists and has correct permissions
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      const { promotionId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(promotionId)) {
        res.status(400).json({ error: 'Invalid promotionId format' });
        return;
      }

      const promotion = await Promotion.findById(promotionId)
        .populate('enabledVenues', 'name description capacity')
        .populate('combos.menuItems', 'name price image description');
      
      if (!promotion) {
        res.status(404).json({ error: 'Promotion not found' });
        return;
      }
      
      res.status(200).json(promotion);
    } catch (error) {
      console.error('Error fetching promotion by ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching promotion: ${errorMessage}` });
    }
  }

  /**
   * @swagger
   * /admin/promotions/{promotionId}:
   *   put:
   *     summary: Update an existing promotion
   *     tags: [AdminPromotions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: promotionId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the promotion to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PromotionUpdate' // Define this schema in Swagger
   *     responses:
   *       200:
   *         description: Promotion updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Promotion'
   *       400:
   *         description: Bad request (e.g., validation error)
   *       404:
   *         description: Promotion not found
   *       500:
   *         description: Server error
   */
  public async updatePromotion(req: AuthenticatedRequest, res: Response): Promise<void> {
    // First validate that user exists and has correct permissions
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Business scoping validation - ensure user has access to this promotion
    // This is already handled by the requireBusinessScope middleware in the routes

    try {
      const { promotionId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(promotionId)) {
        res.status(400).json({ error: 'Invalid promotionId format' });
        return;
      }

      // Get the existing promotion to check restaurant ownership
      const existingPromotion = await Promotion.findById(promotionId);
      if (!existingPromotion) {
        res.status(404).json({ error: 'Promotion not found' });
        return;
      }

      // Handle FormData - extract text fields and file
      let updateData: any = {};
      let imageFile: Express.Multer.File | undefined;

      // Check if this is FormData (has file) or JSON
      if (req.file) {
        // FormData - parse text fields
        Object.keys(req.body).forEach(key => {
          if (key === 'combos' || key === 'enabledVenues') {
            try {
              updateData[key] = JSON.parse(req.body[key]);
            } catch (e) {
              // If JSON parsing fails, treat as empty array for these fields
              console.warn(`Failed to parse ${key} as JSON:`, e);
              updateData[key] = [];
            }
          } else if (key === 'isActive' || key === 'displayOnSplash') {
            // Convert string booleans to actual booleans
            updateData[key] = req.body[key] === 'true';
          } else {
            updateData[key] = req.body[key];
          }
        });
        imageFile = req.file;
      } else {
        // Regular JSON request
        updateData = req.body;
      }

      // Validate date logic if dates are being updated
      if (updateData.startDate || updateData.endDate) {
        const startDate = new Date(updateData.startDate || existingPromotion.startDate);
        const endDate = new Date(updateData.endDate || existingPromotion.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          res.status(400).json({ error: 'Invalid date format' });
          return;
        }
        if (endDate <= startDate) {
          res.status(400).json({ error: 'End date must be after start date' });
          return;
        }
      }

      // Upload new image to S3 if provided
      if (imageFile) {
        try {
          const newImageUrl = await ImageService.uploadImage(imageFile.buffer, imageFile.originalname);
          updateData.imageUrl = newImageUrl;
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          res.status(500).json({ error: 'Failed to upload image' });
          return;
        }
      }

      // Validate venues exist and belong to the restaurant if provided
      if (updateData.enabledVenues && updateData.enabledVenues.length > 0) {
        const venues = await Venue.find({
          _id: { $in: updateData.enabledVenues },
          restaurantId: existingPromotion.restaurantId
        });
        
        if (venues.length !== updateData.enabledVenues.length) {
          res.status(400).json({ error: 'One or more venues do not exist or do not belong to the specified restaurant' });
          return;
        }
      }

      // Validate menu items in combos exist and belong to the restaurant if provided
      if (updateData.combos && updateData.combos.length > 0) {
        for (const combo of updateData.combos) {
          if (combo.menuItems && combo.menuItems.length > 0) {
            const menuItems = await MenuItem.find({
              _id: { $in: combo.menuItems },
              restaurantId: existingPromotion.restaurantId
            });
            
            if (menuItems.length !== combo.menuItems.length) {
              res.status(400).json({ error: `Menu items in combo "${combo.name}" do not exist or do not belong to the specified restaurant` });
              return;
            }
          }
        }
      }

      // Remove restaurantId from update data to prevent changes
      const { restaurantId, ...finalUpdateData } = updateData;
      if (restaurantId) {
        console.warn(`Attempt to update restaurantId for promotion ${promotionId} was ignored.`);
      }

      const updatedPromotion = await Promotion.findByIdAndUpdate(
        promotionId,
        finalUpdateData,
        { new: true, runValidators: true }
      )
      .populate('enabledVenues', 'name description')
      .populate('combos.menuItems', 'name price image');

      if (!updatedPromotion) {
        res.status(404).json({ error: 'Promotion not found' });
        return;
      }
      
      res.status(200).json(updatedPromotion);
    } catch (error: any) {
      console.error('Error updating promotion:', error);
      
      // Handle validation errors gracefully
      if (error.name === 'ValidationError') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: `Error updating promotion: ${error.message}` });
      }
    }
  }

  /**
   * @swagger
   * /admin/promotions/{promotionId}:
   *   delete:
   *     summary: Delete a promotion
   *     tags: [AdminPromotions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: promotionId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the promotion to delete
   *     responses:
   *       200:
   *         description: Promotion deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Promotion deleted successfully
   *       404:
   *         description: Promotion not found
   *       500:
   *         description: Server error
   */
  public async deletePromotion(req: AuthenticatedRequest, res: Response): Promise<void> {
    // First validate that user exists and has correct permissions
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // For non-system admins, validate business ownership
    if (user.role !== 'system_admin') {
      // In a real implementation, fetch the promotion and check businessId
      // For now we'll trust the authenticated user
    }
    try {
      const { promotionId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(promotionId)) {
        res.status(400).json({ error: 'Invalid promotionId format' });
        return;
      }

      const deletedPromotion = await Promotion.findByIdAndDelete(promotionId);

      if (!deletedPromotion) {
        res.status(404).json({ error: 'Promotion not found' });
        return;
      }
      res.status(200).json({ message: 'Promotion deleted successfully' });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting promotion: ${errorMessage}` });
    }
  }

  /**
   * Get all menu items for a restaurant to help with combo creation
   */
  public async getMenuItemsForRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
    // First validate that user exists and has correct permissions
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      const { restaurantId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurantId format' });
        return;
      }

      const menuItems = await MenuItem.find({ 
        restaurantId: restaurantId,
        isActive: true,
        isAvailable: true
      })
      .select('name price image description venueId')
      .populate('venueId', 'name')
      .sort({ name: 1 });

      res.status(200).json(menuItems);
    } catch (error) {
      console.error('Error fetching menu items for restaurant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menu items: ${errorMessage}` });
    }
  }

  /**
   * Get menu items filtered by venue for better combo creation
   */
  public async getMenuItemsForVenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    // First validate that user exists and has correct permissions
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      const { restaurantId, venueId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurantId format' });
        return;
      }
      
      if (!mongoose.Types.ObjectId.isValid(venueId)) {
        res.status(400).json({ error: 'Invalid venueId format' });
        return;
      }

      const menuItems = await MenuItem.find({ 
        restaurantId: restaurantId,
        venueId: venueId,
        isActive: true,
        isAvailable: true
      })
      .select('name price image description categories venueId')
      .populate('venueId', 'name')
      .populate('categories', 'name description')
      .sort({ name: 1 });

      res.status(200).json(menuItems);
    } catch (error) {
      console.error('Error fetching menu items for venue:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menu items: ${errorMessage}` });
    }
  }

  /**
   * Get all venues for a restaurant to help with venue enablement
   */
  public async getVenuesForRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
    // First validate that user exists and has correct permissions
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      const { restaurantId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurantId format' });
        return;
      }

      const venues = await Venue.find({ 
        restaurantId: restaurantId,
        isActive: true
      })
      .select('name description capacity')
      .sort({ name: 1 });

      res.status(200).json(venues);
    } catch (error) {
      console.error('Error fetching venues for restaurant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching venues: ${errorMessage}` });
    }
  }
}
