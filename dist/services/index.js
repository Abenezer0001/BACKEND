"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const restaurant_routes_1 = __importDefault(require("./restaurant-service/src/routes/restaurant.routes"));
const table_routes_1 = __importDefault(require("./restaurant-service/src/routes/table.routes"));
const venue_routes_1 = __importDefault(require("./restaurant-service/src/routes/venue.routes"));
const menu_routes_1 = __importDefault(require("./restaurant-service/src/routes/menu.routes"));
const zone_routes_1 = __importDefault(require("./restaurant-service/src/routes/zone.routes"));
const category_routes_1 = __importDefault(require("./restaurant-service/src/routes/category.routes"));
const modifier_routes_1 = __importDefault(require("./restaurant-service/src/routes/modifier.routes"));
const orderRoutes_1 = __importDefault(require("./order-service/src/routes/orderRoutes"));
const authRoutes_1 = __importDefault(require("./auth-service/src/routes/authRoutes"));
const roleRoutes_1 = __importDefault(require("./auth-service/src/routes/roleRoutes"));
const permissionRoutes_1 = __importDefault(require("./auth-service/src/routes/permissionRoutes"));
const tableType_routes_1 = __importDefault(require("./restaurant-service/src/routes/tableType.routes"));
const TableController_1 = require("./restaurant-service/src/controllers/TableController");
const router = (0, express_1.Router)();
const tableController = new TableController_1.TableController();
// Debug middleware for restaurants/:restaurantId/tables route
const debugMiddleware = (req, res, next) => {
    console.log('Restaurant Tables Route:', {
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
router.use('/restaurants', restaurant_routes_1.default);
router.use('/table-types', tableType_routes_1.default);
router.use('/tables', table_routes_1.default);
router.use('/venues', venue_routes_1.default);
router.use('/menus', menu_routes_1.default);
router.use('/zones', zone_routes_1.default);
router.use('/categories', category_routes_1.default);
router.use('/modifiers', modifier_routes_1.default);
router.use('/orders', orderRoutes_1.default);
router.use('/auth', authRoutes_1.default);
router.use('/auth/roles', roleRoutes_1.default);
router.use('/auth/permissions', permissionRoutes_1.default);
// Special route to handle getting all tables for a restaurant
router.get('/restaurants/:restaurantId/tables', debugMiddleware, (req, res) => {
    console.log('Restaurant tables route accessed, restaurantId:', req.params.restaurantId);
    tableController.getAllForRestaurant(req, res);
});
exports.default = router;
