"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifierController = void 0;
const Modifier_1 = __importDefault(require("../models/Modifier"));
const mongoose_1 = __importDefault(require("mongoose"));
class ModifierController {
    // Create a new modifier
    async create(req, res) {
        try {
            console.log('Creating new modifier with data:', req.body);
            const modifierData = req.body;
            // Validate required fields
            if (!modifierData.name) {
                res.status(400).json({ error: 'Modifier name is required' });
                return;
            }
            // Validate price is a number
            if (isNaN(Number(modifierData.price))) {
                res.status(400).json({ error: 'Price must be a valid number' });
                return;
            }
            const modifier = new Modifier_1.default(modifierData);
            console.log('Saving modifier to database...');
            const savedModifier = await modifier.save();
            console.log('Modifier saved successfully:', savedModifier);
            res.status(201).json(savedModifier);
        }
        catch (error) {
            console.error('Error creating modifier:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error creating modifier: ${errorMessage}` });
        }
    }
    // Get all modifiers
    async getAll(req, res) {
        try {
            const modifiers = await Modifier_1.default.find();
            res.status(200).json(modifiers);
        }
        catch (error) {
            console.error('Error fetching modifiers:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching modifiers: ${errorMessage}` });
        }
    }
    // Get modifier by ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            // Validate ID is a valid ObjectId
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ error: 'Invalid modifier ID format' });
                return;
            }
            const modifier = await Modifier_1.default.findById(id);
            if (!modifier) {
                res.status(404).json({ error: 'Modifier not found' });
                return;
            }
            res.status(200).json(modifier);
        }
        catch (error) {
            console.error('Error fetching modifier:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching modifier: ${errorMessage}` });
        }
    }
    // Update modifier
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            // Validate ID is a valid ObjectId
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ error: 'Invalid modifier ID format' });
                return;
            }
            // Validate price is a number if provided
            if (updateData.price !== undefined && isNaN(Number(updateData.price))) {
                res.status(400).json({ error: 'Price must be a valid number' });
                return;
            }
            const modifier = await Modifier_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
            if (!modifier) {
                res.status(404).json({ error: 'Modifier not found' });
                return;
            }
            res.status(200).json(modifier);
        }
        catch (error) {
            console.error('Error updating modifier:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error updating modifier: ${errorMessage}` });
        }
    }
    // Delete modifier
    async delete(req, res) {
        try {
            const { id } = req.params;
            // Validate ID is a valid ObjectId
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ error: 'Invalid modifier ID format' });
                return;
            }
            const modifier = await Modifier_1.default.findByIdAndDelete(id);
            if (!modifier) {
                res.status(404).json({ error: 'Modifier not found' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting modifier:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error deleting modifier: ${errorMessage}` });
        }
    }
    // Toggle modifier availability
    async toggleAvailability(req, res) {
        try {
            const { id } = req.params;
            // Validate ID is a valid ObjectId
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ error: 'Invalid modifier ID format' });
                return;
            }
            const modifier = await Modifier_1.default.findById(id);
            if (!modifier) {
                res.status(404).json({ error: 'Modifier not found' });
                return;
            }
            modifier.isAvailable = !modifier.isAvailable;
            await modifier.save();
            res.status(200).json(modifier);
        }
        catch (error) {
            console.error('Error toggling modifier availability:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error toggling modifier availability: ${errorMessage}` });
        }
    }
}
exports.ModifierController = ModifierController;
