"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ModifierController_1 = require("../controllers/ModifierController");
const router = (0, express_1.Router)();
const modifierController = new ModifierController_1.ModifierController();
// Get all modifiers
router.get('/', modifierController.getAll);
// Get a single modifier by ID
router.get('/:id', modifierController.getById);
// Create a new modifier
router.post('/', modifierController.create);
// Update a modifier
router.put('/:id', modifierController.update);
// Delete a modifier
router.delete('/:id', modifierController.delete);
// Toggle modifier availability
router.patch('/:id/toggle-availability', modifierController.toggleAvailability);
exports.default = router;
