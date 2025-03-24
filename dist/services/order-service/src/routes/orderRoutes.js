"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderRoutes = void 0;
const express_1 = require("express");
const OrderController_1 = require("../controllers/OrderController");
const createOrderRoutes = (wsService) => {
    const router = (0, express_1.Router)();
    const controller = new OrderController_1.OrderController(wsService);
    // Order CRUD routes
    router.post('/orders', controller.create.bind(controller));
    router.get('/orders', controller.getAll.bind(controller));
    router.get('/orders/:id', controller.getById.bind(controller));
    router.put('/orders/:id/status', controller.updateStatus.bind(controller));
    router.put('/orders/:id/payment', controller.updatePaymentStatus.bind(controller));
    router.post('/orders/:id/cancel', controller.cancel.bind(controller));
    // Table specific routes
    router.get('/restaurants/:restaurantId/tables/:tableNumber/orders', controller.getByTable.bind(controller));
    return router;
};
exports.createOrderRoutes = createOrderRoutes;
exports.default = (0, exports.createOrderRoutes)();
