import { Request, Response } from 'express';
import Restaurant, { IRestaurant } from '../models/Restaurant';
import Venue from '../models/Venue';
import QRCode from 'qrcode';
import { AuthenticatedRequest } from '../../../auth-service/src/types/auth.types';

export class RestaurantController {
  /**
   * @swagger
   * /restaurants:
   *   post:
   *     summary: Create a new restaurant
   *     tags: [Restaurants]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Restaurant'
   *     responses:
   *       201:
   *         description: Restaurant created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Restaurant'
   *       500:
   *         description: Server error
   */
  public async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('Creating restaurant with data:', req.body);
      const restaurantData = req.body;
      const user = req.user;

      // Get business ID from authenticated user
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // System admin can create restaurants for any business (must specify businessId)
      // Restaurant admin can only create restaurants for their own business
      let businessId: string;

      if (user.role === 'system_admin') {
        // System admin must provide businessId in request
        if (!restaurantData.businessId) {
          res.status(400).json({ 
            error: 'Business ID is required when creating restaurant as system admin' 
          });
          return;
        }
        businessId = restaurantData.businessId;
      } else {
        // Restaurant admin uses their own business ID
        if (!user.businessId) {
          res.status(403).json({ 
            error: 'User not associated with any business. Cannot create restaurant.' 
          });
          return;
        }
        businessId = user.businessId;
      }

      // Associate restaurant with business
      restaurantData.businessId = businessId;
      
      // Generate QR codes for tables
      if (restaurantData.tables) {
        console.log('Generating QR codes for tables:', restaurantData.tables);
        for (let table of restaurantData.tables) {
          table.qrCode = await QRCode.toDataURL(`table-${table.tableNumber}`);
        }  
      }

      console.log('Creating new Restaurant model with data:', restaurantData);
      const restaurant = new Restaurant(restaurantData);
      console.log('Saving restaurant to database...');
      const savedRestaurant = await restaurant.save();
      console.log('Restaurant saved successfully:', savedRestaurant);
      
      res.status(201).json(savedRestaurant);
    } catch (error) {
      console.error('Error creating restaurant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating restaurant: ${errorMessage}` });
    }
  }

  /**
   * @swagger
   * /restaurants:
   *   get:
   *     summary: Get all restaurants
   *     tags: [Restaurants]
   *     responses:
   *       200:
   *         description: List of restaurants
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Restaurant'
   *       500:
   *         description: Server error
   */
  public async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      // Allow system admin, kitchen staff, cashiers, and restaurant admins to access restaurants
      if (!user || !(['system_admin', 'kitchen_staff', 'cashier', 'restaurant_admin'].includes(user.role))) {
        res.status(403).json({ 
          error: 'Access denied. Only authenticated users with appropriate roles can view restaurants.' 
        });
        return;
      }

      let restaurants;
      
      // Filter restaurants based on user role
      if (user.role === 'restaurant_admin' && user.businessId) {
        // Restaurant admins can only see restaurants in their business
        restaurants = await Restaurant.find({ businessId: user.businessId })
          .populate('venues', 'name description capacity')
          .sort({ createdAt: -1 });
      } else if (user.role === 'system_admin') {
        // System admins can see all restaurants
        restaurants = await Restaurant.find()
          .populate('venues', 'name description capacity')
          .sort({ createdAt: -1 });
      } else {
        // Kitchen staff and cashiers see restaurants they're assigned to
        const filter = user.restaurantId ? { _id: user.restaurantId } : {};
        restaurants = await Restaurant.find(filter)
          .populate('venues', 'name description capacity')
          .sort({ createdAt: -1 });
      }

      res.status(200).json(restaurants);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching restaurants' });
    }
  }

  /**
   * @swagger
   * /restaurants/business/{businessId}:
   *   get:
   *     summary: Get restaurants for a specific business
   *     tags: [Restaurants]
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     responses:
   *       200:
   *         description: List of restaurants for the business
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Restaurant'
   *       400:
   *         description: Invalid business ID
   *       403:
   *         description: Access denied
   *       500:
   *         description: Server error
   */
  public async getRestaurantsByBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const currentUser = req.user;

      if (!businessId) {
        res.status(400).json({ error: 'Business ID is required' });
        return;
      }

      // Restaurant admin can only see restaurants from their own business
      if (currentUser?.role === 'restaurant_admin') {
        if (!currentUser.businessId || currentUser.businessId.toString() !== businessId) {
          res.status(403).json({ error: 'Access denied - you can only view restaurants from your own business' });
          return;
        }
      }

      const restaurants = await Restaurant.find({ businessId })
        .populate('venues', 'name description capacity')
        .sort({ createdAt: -1 });

      res.json(restaurants);
    } catch (error: any) {
      console.error('Error fetching restaurants by business:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * @swagger
   * /restaurants/{id}:
   *   get:
   *     summary: Get restaurant by ID
   *     tags: [Restaurants]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Restaurant found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Restaurant'
   *       404:
   *         description: Restaurant not found
   *       500:
   *         description: Server error
   */
  public async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }
      res.status(200).json(restaurant);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching restaurant' });
    }
  }

  /**
   * @swagger
   * /restaurants/{id}:
   *   put:
   *     summary: Update restaurant
   *     tags: [Restaurants]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Restaurant'
   *     responses:
   *       200:
   *         description: Restaurant updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Restaurant'
   *       404:
   *         description: Restaurant not found
   *       500:
   *         description: Server error
   */
  public async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const restaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }
      res.status(200).json(restaurant);
    } catch (error) {
      res.status(500).json({ error: 'Error updating restaurant' });
    }
  }

  /**
   * @swagger
   * /restaurants/{id}:
   *   delete:
   *     summary: Delete restaurant
   *     tags: [Restaurants]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Restaurant deleted successfully
   *       404:
   *         description: Restaurant not found
   *       500:
   *         description: Server error
   */
  public async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }
      res.status(200).json({ message: 'Restaurant deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting restaurant' });
    }
  }

  /**
   * @swagger
   * /restaurants/{id}/menu-categories:
   *   post:
   *     summary: Add menu category
   *     tags: [Menu]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - category
   *             properties:
   *               category:
   *                 type: string
   *               items:
   *                 type: array
   *                 items:
   *                   $ref: '#/components/schemas/MenuItem'
   *     responses:
   *       200:
   *         description: Menu category added successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Restaurant'
   *       404:
   *         description: Restaurant not found
   *       500:
   *         description: Server error
   */
  public async addMenuCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { category } = req.body;
      const restaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { $push: { menu: { category, items: [] } } },
        { new: true }
      );
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }
      res.status(200).json(restaurant);
    } catch (error) {
      res.status(500).json({ error: 'Error adding menu category' });
    }
  }

  /**
   * @swagger
   * /restaurants/{id}/menu-items:
   *   post:
   *     summary: Add menu item
   *     tags: [Menu]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/MenuItem'
   *     responses:
   *       200:
   *         description: Menu item added successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Restaurant'
   *       404:
   *         description: Restaurant or category not found
   *       500:
   *         description: Server error
   */
  public async addMenuItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { categoryId, item } = req.body;
      const restaurant = await Restaurant.findOneAndUpdate(
        { _id: req.params.id, 'menu._id': categoryId },
        { $push: { 'menu.$.items': item } },
        { new: true }
      );
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or category not found' });
        return;
      }
      res.status(200).json(restaurant);
    } catch (error) {
      res.status(500).json({ error: 'Error adding menu item' });
    }
  }

  /**
   * @swagger
   * /restaurants/{id}/table-status:
   *   put:
   *     summary: Update table status
   *     tags: [Tables]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableNumber
   *               - isOccupied
   *             properties:
   *               tableNumber:
   *                 type: string
   *               isOccupied:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Table status updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Restaurant'
   *       404:
   *         description: Restaurant or table not found
   *       500:
   *         description: Server error
   */
  public async updateTableStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tableNumber, isOccupied } = req.body;
      const restaurant = await Restaurant.findOneAndUpdate(
        { _id: req.params.id, 'tables.tableNumber': tableNumber },
        { $set: { 'tables.$.isOccupied': isOccupied } },
        { new: true }
      );
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found' });
        return;
      }
      res.status(200).json(restaurant);
    } catch (error) {
      res.status(500).json({ error: 'Error updating table status' });
    }
  }

  /**
   * @swagger
   * /restaurants/{restaurantId}/venues:
   *   get:
   *     summary: Get restaurant venues
   *     tags: [Venues]
   *     parameters:
   *       - in: path
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of venues
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Venue'
   *       404:
   *         description: Restaurant not found
   *       500:
   *         description: Server error
   */
  public async getVenues(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;

      // First check if restaurant exists
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      // Fetch venues from Venue model
      const venues = await Venue.find({ restaurantId });
      res.status(200).json(venues);
    } catch (error) {
      console.error('Error fetching venues:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching venues: ${errorMessage}` });
    }
  }

  /**
   * @swagger
   * /restaurants/{id}/service-charge:
   *   put:
   *     summary: Update restaurant service charge
   *     tags: [Restaurants]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Restaurant ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               enabled:
   *                 type: boolean
   *                 description: Whether service charge is enabled
   *               percentage:
   *                 type: number
   *                 minimum: 10
   *                 maximum: 20
   *                 description: Service charge percentage (10-20%)
   *             required:
   *               - enabled
   *               - percentage
   *           example:
   *             enabled: true
   *             percentage: 15
   *     responses:
   *       200:
   *         description: Service charge updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 service_charge:
   *                   type: object
   *                   properties:
   *                     enabled:
   *                       type: boolean
   *                     percentage:
   *                       type: number
   *       400:
   *         description: Invalid input
   *       404:
   *         description: Restaurant not found
   *       500:
   *         description: Server error
   */
  public async updateServiceCharge(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { enabled, percentage } = req.body;

      // Validate input
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled field must be a boolean' });
        return;
      }

      if (enabled && (typeof percentage !== 'number' || percentage < 10 || percentage > 20)) {
        res.status(400).json({ error: 'percentage must be a number between 10 and 20' });
        return;
      }

      const restaurant = await Restaurant.findByIdAndUpdate(
        id,
        {
          service_charge: {
            enabled,
            percentage: enabled ? percentage : 10
          }
        },
        { new: true }
      );

      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      res.status(200).json({
        message: 'Service charge updated successfully',
        service_charge: restaurant.service_charge
      });
    } catch (error) {
      console.error('Error updating service charge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating service charge: ${errorMessage}` });
    }
  }

  /**
   * @swagger
   * /restaurants/{id}/service-charge:
   *   get:
   *     summary: Get restaurant service charge settings
   *     tags: [Restaurants]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Restaurant ID
   *     responses:
   *       200:
   *         description: Service charge settings retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 service_charge:
   *                   type: object
   *                   properties:
   *                     enabled:
   *                       type: boolean
   *                     percentage:
   *                       type: number
   *       404:
   *         description: Restaurant not found
   *       500:
   *         description: Server error
   */
  public async getServiceCharge(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const restaurant = await Restaurant.findById(id).select('service_charge');

      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      res.status(200).json({
        service_charge: restaurant.service_charge || { enabled: false, percentage: 10 }
      });
    } catch (error) {
      console.error('Error getting service charge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting service charge: ${errorMessage}` });
    }
  }
}
