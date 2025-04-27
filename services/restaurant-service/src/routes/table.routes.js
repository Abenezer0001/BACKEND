"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var TableController_1 = require("../controllers/TableController");
var router = (0, express_1.Router)();
var controller = new TableController_1.TableController();
// Debug middleware
var debugMiddleware = function (req, res, next) {
    console.log('Table Route:', {
        method: req.method,
        path: req.path,
        url: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        params: req.params,
        body: req.body
    });
    next();
};
// Validation middleware
var validateIds = function (req, res, next) {
    var _a = req.params, restaurantId = _a.restaurantId, venueId = _a.venueId, tableId = _a.tableId;
    if (restaurantId && !(/^[0-9a-fA-F]{24}$/).test(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurant ID format' });
        return;
    }
    if (venueId && !(/^[0-9a-fA-F]{24}$/).test(venueId)) {
        res.status(400).json({ error: 'Invalid venue ID format' });
        return;
    }
    if (tableId && !(/^[0-9a-fA-F]{24}$/).test(tableId)) {
        res.status(400).json({ error: 'Invalid table ID format' });
        return;
    }
    next();
};
// Body validation middleware
var validateTableBody = function (req, res, next) {
    var _a = req.body, number = _a.number, capacity = _a.capacity, tableTypeId = _a.tableTypeId;
    if (!number || typeof number !== 'string') {
        res.status(400).json({ error: 'Table number is required and must be a string' });
        return;
    }
    // Convert capacity to number if it's a string
    var capacityNum = typeof capacity === 'string' ? parseInt(capacity, 10) : capacity;
    if (!capacityNum || typeof capacityNum !== 'number' || capacityNum <= 0 || isNaN(capacityNum)) {
        res.status(400).json({ error: 'Capacity is required and must be a positive number' });
        return;
    }
    // Update the body with the converted capacity
    req.body.capacity = capacityNum;
    if (!tableTypeId || typeof tableTypeId !== 'string' || !(/^[0-9a-fA-F]{24}$/).test(tableTypeId)) {
        res.status(400).json({ error: 'Valid tableTypeId is required' });
        return;
    }
    next();
};
// Apply debug middleware to all routes
router.use(debugMiddleware);

// GET /api/tables - Get all tables across all restaurants (admin only)
router.get('/', function(req, res) {
    controller.getAll(req, res).catch(err => {
        console.error('Error fetching all tables:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    });
});

// GET tables for a specific restaurant
router.get('/restaurant/:restaurantId/tables', validateIds, function(req, res) {
    controller.getAllForRestaurant(req, res).catch(err => {
        console.error('Error fetching tables for restaurant:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    });
});

// GET tables for a specific venue within a restaurant
router.get('/restaurant/:restaurantId/venue/:venueId/tables', validateIds, function(req, res) {
    controller.getAllForVenue(req, res).catch(err => {
        console.error('Error fetching tables for venue:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    });
});

// Table CRUD routes
router.route('/restaurant/:restaurantId/venue/:venueId')
    .post(validateIds, validateTableBody, controller.create.bind(controller));

router.route('/restaurant/:restaurantId/venue/:venueId/tables')
    .get(validateIds, controller.getAll.bind(controller));

router.route('/restaurant/:restaurantId/venue/:venueId/tables/:tableId')
    .get(validateIds, controller.getById.bind(controller))
    .put(validateIds, validateTableBody, controller.update.bind(controller))
    .delete(validateIds, controller.delete.bind(controller));

// Table QR code routes
router.route('/restaurant/:restaurantId/venue/:venueId/tables/:tableId/qrcode')
    .post(validateIds, controller.generateQRCode.bind(controller))
    .get(validateIds, controller.getQRCode.bind(controller))
    .delete(validateIds, controller.deleteQRCode.bind(controller));

exports.default = router;
