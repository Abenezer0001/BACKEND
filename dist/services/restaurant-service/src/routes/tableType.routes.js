"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TableTypeController_1 = require("../controllers/TableTypeController");
// Add any necessary middleware (e.g., authentication)
// import { protect, admin } from '../middleware/authMiddleware';
const router = (0, express_1.Router)();
// Debug middleware
const debugMiddleware = (req, res, next) => {
    console.log('TableType Route:', {
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
// Apply debug middleware to all routes
router.use(debugMiddleware);
// GET /api/table-types/:restaurantId - Get all table types for a restaurant
router.get('/:restaurantId', (req, res) => {
    console.log('Restaurant table types route accessed, restaurantId:', req.params.restaurantId);
    (0, TableTypeController_1.getTableTypesByRestaurant)(req, res);
});
// POST /api/table-types/:restaurantId - Create a new table type
router.post('/:restaurantId', (req, res) => {
    (0, TableTypeController_1.createTableType)(req, res);
});
// GET /api/table-types/:restaurantId/:id - Get a single table type
router.get('/:restaurantId/:id', (req, res) => {
    (0, TableTypeController_1.getTableTypeById)(req, res);
});
// PUT /api/table-types/:restaurantId/:id - Update a table type
router.put('/:restaurantId/:id', (req, res) => {
    (0, TableTypeController_1.updateTableType)(req, res);
});
// DELETE /api/table-types/:restaurantId/:id - Delete a table type
router.delete('/:restaurantId/:id', (req, res) => {
    (0, TableTypeController_1.deleteTableType)(req, res);
});
exports.default = router;
