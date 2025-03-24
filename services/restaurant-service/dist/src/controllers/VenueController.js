"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueController = void 0;
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
const Venue_1 = __importDefault(require("../models/Venue"));
const Table_1 = __importDefault(require("../models/Table"));
const mongoose_1 = __importDefault(require("mongoose"));
class VenueController {
    // Create a new venue
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId } = req.params;
                const { name, description, capacity, isActive } = req.body;
                // Validate required fields
                if (!name || !description || !capacity) {
                    res.status(400).json({ error: 'Missing required fields: name, description, or capacity' });
                    return;
                }
                // Validate capacity is a positive number
                const capacityNum = parseInt(capacity);
                if (isNaN(capacityNum) || capacityNum <= 0) {
                    res.status(400).json({ error: 'Capacity must be a positive number' });
                    return;
                }
                // Validate restaurantId is a valid ObjectId
                if (!mongoose_1.default.Types.ObjectId.isValid(restaurantId)) {
                    res.status(400).json({ error: 'Invalid restaurant ID format' });
                    return;
                }
                // Find the restaurant by ID
                const restaurant = yield Restaurant_1.default.findById(restaurantId);
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant not found' });
                    return;
                }
                // Create a new venue document
                const venue = new Venue_1.default({
                    name,
                    description,
                    capacity: capacityNum,
                    restaurantId: new mongoose_1.default.Types.ObjectId(restaurantId),
                    isActive: isActive !== null && isActive !== void 0 ? isActive : true
                });
                // Save the venue as a separate document
                const savedVenue = yield venue.save();
                // Add the venue reference to the restaurant using $push
                yield Restaurant_1.default.findByIdAndUpdate(restaurantId, { $push: { venues: savedVenue._id } }, { new: true });
                res.status(201).json(savedVenue);
            }
            catch (error) {
                console.error('Error creating venue:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: 'Error creating venue', details: errorMessage, statusCode: 500 });
            }
        });
    }
    // Get all venues
    getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId } = req.params;
                // Validate restaurantId is a valid ObjectId
                if (!mongoose_1.default.Types.ObjectId.isValid(restaurantId)) {
                    res.status(400).json({ error: 'Invalid restaurant ID format' });
                    return;
                }
                // Find all venues for this restaurant
                const venues = yield Venue_1.default.find({ restaurantId });
                res.status(200).json(venues);
            }
            catch (error) {
                console.error('Error fetching venues:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: 'Error fetching venues', details: errorMessage });
            }
        });
    }
    // Get all venues
    getAllVenues(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const venues = yield Venue_1.default.find().populate('restaurantId');
                res.status(200).json(venues);
            }
            catch (error) {
                console.error('Error fetching all venues:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({
                    error: 'Error fetching venues',
                    details: errorMessage
                });
            }
        });
    }
    // Get venue by ID
    getById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                // Validate ID is a valid ObjectId
                if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                    res.status(400).json({ error: 'Invalid ID format' });
                    return;
                }
                const venue = yield Venue_1.default.findById(id);
                if (!venue) {
                    res.status(404).json({ error: 'Venue not found' });
                    return;
                }
                res.status(200).json(venue);
            }
            catch (error) {
                console.error('Error fetching venue:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: 'Error fetching venue', details: errorMessage });
            }
        });
    }
    // Update venue
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updateData = req.body;
                // Validate ID is a valid ObjectId
                if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                    res.status(400).json({ error: 'Invalid ID format' });
                    return;
                }
                const venue = yield Venue_1.default.findByIdAndUpdate(id, updateData, { new: true });
                if (!venue) {
                    res.status(404).json({ error: 'Venue not found' });
                    return;
                }
                res.status(200).json(venue);
            }
            catch (error) {
                console.error('Error updating venue:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: 'Error updating venue', details: errorMessage });
            }
        });
    }
    // Delete venue
    delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                // Validate ID is a valid ObjectId
                if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                    res.status(400).json({ error: 'Invalid ID format' });
                    return;
                }
                const venue = yield Venue_1.default.findByIdAndRemove(id);
                if (!venue) {
                    res.status(404).json({ error: 'Venue not found' });
                    return;
                }
                // Remove the venue reference from the restaurant
                const restaurant = yield Restaurant_1.default.findOneAndUpdate({ venues: id }, { $pull: { venues: id } });
                res.status(200).json({ message: 'Venue deleted successfully' });
            }
            catch (error) {
                console.error('Error deleting venue:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: 'Error deleting venue', details: errorMessage });
            }
        });
    }
    // Get tables of venue
    getTables(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { venueId } = req.params;
                // Validate ID is a valid ObjectId
                if (!mongoose_1.default.Types.ObjectId.isValid(venueId)) {
                    res.status(400).json({ error: 'Invalid ID format' });
                    return;
                }
                const venue = yield Venue_1.default.findById(venueId);
                if (!venue) {
                    res.status(404).json({ error: 'Venue not found' });
                    return;
                }
                // Get tables associated with this venue
                const tables = yield Table_1.default.find({ venueId });
                res.status(200).json(tables);
            }
            catch (error) {
                console.error('Error fetching tables:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: 'Error fetching tables', details: errorMessage });
            }
        });
    }
    // Create new table for venue
    createTable(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { venueId } = req.params;
                const tableData = req.body;
                // Validate ID is a valid ObjectId
                if (!mongoose_1.default.Types.ObjectId.isValid(venueId)) {
                    res.status(400).json({ error: 'Invalid ID format' });
                    return;
                }
                const venue = yield Venue_1.default.findById(venueId);
                if (!venue) {
                    res.status(404).json({ error: 'Venue not found' });
                    return;
                }
                // Set the venueId for the table
                tableData.venueId = venueId;
                // Create a new table document
                const table = new Table_1.default(tableData);
                // Save the table as a separate document
                const savedTable = yield table.save();
                res.status(201).json(savedTable);
            }
            catch (error) {
                console.error('Error creating table:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: 'Error creating table', details: errorMessage });
            }
        });
    }
}
exports.VenueController = VenueController;
