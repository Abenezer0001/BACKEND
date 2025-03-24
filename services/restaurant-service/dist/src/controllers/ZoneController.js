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
exports.ZoneController = void 0;
const Zone_1 = __importDefault(require("../models/Zone"));
class ZoneController {
    // Create a new zone
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Creating new zone with data:', req.body);
                const zoneData = req.body;
                const zone = new Zone_1.default(zoneData);
                console.log('Saving zone to database...');
                const savedZone = yield zone.save();
                console.log('Zone saved successfully:', savedZone);
                res.status(201).json(savedZone);
            }
            catch (error) {
                console.error('Error creating zone:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error creating zone: ${errorMessage}` });
            }
        });
    }
    // Get all zones
    getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const zones = yield Zone_1.default.find()
                    .populate('venueId')
                    .populate('tables');
                res.status(200).json(zones);
            }
            catch (error) {
                console.error('Error fetching zones:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error fetching zones: ${errorMessage}` });
            }
        });
    }
    // Get zone by ID
    getById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const zone = yield Zone_1.default.findById(req.params.id)
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
        });
    }
    // Update zone
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const zone = yield Zone_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
        });
    }
    // Delete zone
    delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const zone = yield Zone_1.default.findByIdAndDelete(req.params.id);
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
        });
    }
    // Get zones by venue
    getByVenue(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const zones = yield Zone_1.default.find({ venueId: req.params.venueId })
                    .populate('tables');
                res.status(200).json(zones);
            }
            catch (error) {
                console.error('Error fetching zones by venue:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error fetching zones by venue: ${errorMessage}` });
            }
        });
    }
}
exports.ZoneController = ZoneController;
