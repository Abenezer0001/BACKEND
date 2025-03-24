"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneController = void 0;
const Zone_1 = __importDefault(require("../models/Zone"));
class ZoneController {
    // Create a new zone
    async create(req, res) {
        try {
            console.log('Creating new zone with data:', req.body);
            const zoneData = req.body;
            const zone = new Zone_1.default(zoneData);
            console.log('Saving zone to database...');
            const savedZone = await zone.save();
            console.log('Zone saved successfully:', savedZone);
            res.status(201).json(savedZone);
        }
        catch (error) {
            console.error('Error creating zone:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error creating zone: ${errorMessage}` });
        }
    }
    // Get all zones
    async getAll(req, res) {
        try {
            const zones = await Zone_1.default.find()
                .populate('venueId')
                .populate('tables');
            res.status(200).json(zones);
        }
        catch (error) {
            console.error('Error fetching zones:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching zones: ${errorMessage}` });
        }
    }
    // Get zone by ID
    async getById(req, res) {
        try {
            const zone = await Zone_1.default.findById(req.params.id)
                .populate('venueId')
                .populate('tables');
            if (!zone) {
                res.status(404).json({ error: 'Zone not found' });
                return;
            }
            res.status(200).json(zone);
        }
        catch (error) {
            console.error('Error fetching zone:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching zone: ${errorMessage}` });
        }
    }
    // Update zone
    async update(req, res) {
        try {
            const zone = await Zone_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!zone) {
                res.status(404).json({ error: 'Zone not found' });
                return;
            }
            res.status(200).json(zone);
        }
        catch (error) {
            console.error('Error updating zone:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error updating zone: ${errorMessage}` });
        }
    }
    // Delete zone
    async delete(req, res) {
        try {
            const zone = await Zone_1.default.findByIdAndDelete(req.params.id);
            if (!zone) {
                res.status(404).json({ error: 'Zone not found' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting zone:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error deleting zone: ${errorMessage}` });
        }
    }
    // Get zones by venue
    async getByVenue(req, res) {
        try {
            const zones = await Zone_1.default.find({ venueId: req.params.venueId })
                .populate('tables');
            res.status(200).json(zones);
        }
        catch (error) {
            console.error('Error fetching zones by venue:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching zones by venue: ${errorMessage}` });
        }
    }
}
exports.ZoneController = ZoneController;
