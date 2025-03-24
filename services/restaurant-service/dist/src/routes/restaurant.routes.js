"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RestaurantController_1 = require("../controllers/RestaurantController");
/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management endpoints
 */
const router = (0, express_1.Router)();
const controller = new RestaurantController_1.RestaurantController();
/**
 * @swagger
 * /:
 *   post:
 *     tags: [Restaurants]
 *     summary: Create a new restaurant
 *   get:
 *     tags: [Restaurants]
 *     summary: Get all restaurants
 */
router.post('/', controller.create.bind(controller));
router.get('/', controller.getAll.bind(controller));
/**
 * @swagger
 * /{id}:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get a restaurant by ID
 *   put:
 *     tags: [Restaurants]
 *     summary: Update a restaurant
 *   delete:
 *     tags: [Restaurants]
 *     summary: Delete a restaurant
 */
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));
/**
 * @swagger
 * /{restaurantId}/venues:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get all venues for a restaurant
 */
router.get('/:restaurantId/venues', controller.getVenues.bind(controller));
/**
 * @swagger
 * /restaurants/{id}/menu-categories:
 *   post:
 *     tags: [Restaurants]
 *     summary: Add a menu category to a restaurant
 */
router.post('/:id/menu-categories', controller.addMenuCategory.bind(controller));
/**
 * @swagger
 * /restaurants/{id}/menu-items:
 *   post:
 *     tags: [Restaurants]
 *     summary: Add a menu item to a restaurant
 */
router.post('/:id/menu-items', controller.addMenuItem.bind(controller));
/**
 * @swagger
 * /restaurants/{id}/table-status:
 *   put:
 *     tags: [Restaurants]
 *     summary: Update table status for a restaurant
 */
router.put('/:id/table-status', controller.updateTableStatus.bind(controller));
exports.default = router;
