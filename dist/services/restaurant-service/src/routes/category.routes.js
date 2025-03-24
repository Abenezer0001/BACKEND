"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CategoryController_1 = require("../controllers/CategoryController");
const router = (0, express_1.Router)();
const categoryController = new CategoryController_1.CategoryController();
// Get all categories
router.get('/', categoryController.getAll);
// Get a single category by ID
router.get('/:id', categoryController.getById);
// Create a new category
router.post('/', categoryController.create);
// Update a category
router.put('/:id', categoryController.update);
// Delete a category
router.delete('/:id', categoryController.delete);
// Toggle category availability
router.patch('/:id/toggle-availability', categoryController.toggleAvailability);
exports.default = router;
