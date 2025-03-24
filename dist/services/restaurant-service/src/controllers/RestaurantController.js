"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantController = void 0;
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
const Venue_1 = __importDefault(require("../models/Venue"));
const qrcode_1 = __importDefault(require("qrcode"));
class RestaurantController {
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
    async create(req, res) {
        try {
            console.log('Creating restaurant with data:', req.body);
            const restaurantData = req.body;
            // Generate QR codes for tables
            if (restaurantData.tables) {
                console.log('Generating QR codes for tables:', restaurantData.tables);
                for (let table of restaurantData.tables) {
                    table.qrCode = await qrcode_1.default.toDataURL(`table-${table.tableNumber}`);
                }
            }
            console.log('Creating new Restaurant model with data:', restaurantData);
            const restaurant = new Restaurant_1.default(restaurantData);
            console.log('Saving restaurant to database...');
            const savedRestaurant = await restaurant.save();
            console.log('Restaurant saved successfully:', savedRestaurant);
            res.status(201).json(savedRestaurant);
        }
        catch (error) {
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
    async getAll(req, res) {
        try {
            const restaurants = await Restaurant_1.default.find();
            res.status(200).json(restaurants);
        }
        catch (error) {
            res.status(500).json({ error: 'Error fetching restaurants' });
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
    async getById(req, res) {
        try {
            const restaurant = await Restaurant_1.default.findById(req.params.id);
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant not found' });
                return;
            }
            res.status(200).json(restaurant);
        }
        catch (error) {
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
    async update(req, res) {
        try {
            const restaurant = await Restaurant_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant not found' });
                return;
            }
            res.status(200).json(restaurant);
        }
        catch (error) {
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
    async delete(req, res) {
        try {
            const restaurant = await Restaurant_1.default.findByIdAndDelete(req.params.id);
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant not found' });
                return;
            }
            res.status(200).json({ message: 'Restaurant deleted successfully' });
        }
        catch (error) {
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
    async addMenuCategory(req, res) {
        try {
            const { category } = req.body;
            const restaurant = await Restaurant_1.default.findByIdAndUpdate(req.params.id, { $push: { menu: { category, items: [] } } }, { new: true });
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant not found' });
                return;
            }
            res.status(200).json(restaurant);
        }
        catch (error) {
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
    async addMenuItem(req, res) {
        try {
            const { categoryId, item } = req.body;
            const restaurant = await Restaurant_1.default.findOneAndUpdate({ _id: req.params.id, 'menu._id': categoryId }, { $push: { 'menu.$.items': item } }, { new: true });
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant or category not found' });
                return;
            }
            res.status(200).json(restaurant);
        }
        catch (error) {
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
    async updateTableStatus(req, res) {
        try {
            const { tableNumber, isOccupied } = req.body;
            const restaurant = await Restaurant_1.default.findOneAndUpdate({ _id: req.params.id, 'tables.tableNumber': tableNumber }, { $set: { 'tables.$.isOccupied': isOccupied } }, { new: true });
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant or table not found' });
                return;
            }
            res.status(200).json(restaurant);
        }
        catch (error) {
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
    async getVenues(req, res) {
        try {
            const { restaurantId } = req.params;
            // First check if restaurant exists
            const restaurant = await Restaurant_1.default.findById(restaurantId);
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant not found' });
                return;
            }
            // Fetch venues from Venue model
            const venues = await Venue_1.default.find({ restaurantId });
            res.status(200).json(venues);
        }
        catch (error) {
            console.error('Error fetching venues:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching venues: ${errorMessage}` });
        }
    }
}
exports.RestaurantController = RestaurantController;
