"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ZoneController_1 = require("../controllers/ZoneController");
const router = (0, express_1.Router)();
const controller = new ZoneController_1.ZoneController();
// Create a new zone
router.post('/', (req, res) => controller.create(req, res));
// Get all zones
router.get('/', (req, res) => controller.getAll(req, res));
// Get zone by ID
router.get('/:id', (req, res) => controller.getById(req, res));
// Update zone
router.put('/:id', (req, res) => controller.update(req, res));
// Delete zone
router.delete('/:id', (req, res) => controller.delete(req, res));
// Get zones by venue
router.get('/venue/:venueId', (req, res) => controller.getByVenue(req, res));
exports.default = router;
