"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.TableController = void 0;
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
const Table_1 = __importDefault(require("../models/Table"));
const QRCode = __importStar(require("qrcode"));
const uuid_1 = require("uuid");
const mongoose_1 = __importDefault(require("mongoose"));
class TableController {
    // Create a new table
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log('Creating table with params:', req.params);
                console.log('Table data:', req.body);
                const { restaurantId, venueId } = req.params;
                const tableData = req.body;
                if (!mongoose_1.default.Types.ObjectId.isValid(restaurantId)) {
                    res.status(400).json({ error: 'Invalid restaurant ID format' });
                    return;
                }
                if (!mongoose_1.default.Types.ObjectId.isValid(venueId)) {
                    res.status(400).json({ error: 'Invalid venue ID format' });
                    return;
                }
                // Check if restaurant exists
                const restaurant = yield Restaurant_1.default.findById(restaurantId);
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant not found' });
                    return;
                }
                // Check if venue exists in restaurant
                const venueExists = restaurant.venues.some(venue => venue.toString() === venueId);
                if (!venueExists) {
                    res.status(404).json({ error: 'Venue not found in this restaurant' });
                    return;
                }
                // Validate required fields
                if (!tableData.number || !tableData.capacity || !tableData.type) {
                    res.status(400).json({ error: 'Missing required fields: number, capacity, or type' });
                    return;
                }
                // Check if table number already exists in this venue
                const existingTable = yield Table_1.default.findOne({
                    venueId: new mongoose_1.default.Types.ObjectId(venueId),
                    number: tableData.number
                });
                if (existingTable) {
                    res.status(400).json({ error: 'Table number already exists in this venue' });
                    return;
                }
                // Create a new table document
                const newTable = new Table_1.default({
                    number: tableData.number,
                    capacity: parseInt(tableData.capacity, 10),
                    type: tableData.type,
                    venueId: new mongoose_1.default.Types.ObjectId(venueId),
                    qrCode: '',
                    isOccupied: false,
                    isActive: (_a = tableData.isActive) !== null && _a !== void 0 ? _a : true
                });
                console.log('Attempting to save new table:', newTable);
                // Save the new table to the Table collection
                const savedTable = yield newTable.save();
                console.log('Table saved successfully:', savedTable);
                // Add the table's ID to the restaurant's tables array
                yield Restaurant_1.default.findByIdAndUpdate(restaurantId, { $push: { tables: savedTable._id } }, { new: true });
                console.log('Restaurant updated with new table');
                res.status(201).json(savedTable);
            }
            catch (error) {
                console.error('Error creating table:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error creating table: ${errorMessage}` });
            }
        });
    }
    // Get all tables
    getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId, venueId } = req.params;
                // First check if restaurant exists
                const restaurant = yield Restaurant_1.default.findById(restaurantId);
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant not found' });
                    return;
                }
                // Check if venue exists in restaurant
                const venueExists = restaurant.venues.some(venue => venue.toString() === venueId);
                if (!venueExists) {
                    res.status(404).json({ error: 'Venue not found in this restaurant' });
                    return;
                }
                // Query tables directly by venueId
                const tables = yield Table_1.default.find({ venueId: new mongoose_1.default.Types.ObjectId(venueId) });
                res.json(tables);
            }
            catch (error) {
                console.error('Error getting tables:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error getting tables: ${errorMessage}` });
            }
        });
    }
    // Get table by ID
    getById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId, tableId } = req.params;
                // Check if restaurant exists and contains this table ID
                const restaurant = yield Restaurant_1.default.findOne({
                    _id: restaurantId,
                    tables: { $in: [tableId] }
                });
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant or table not found' });
                    return;
                }
                // Get the table from the Table collection
                const table = yield Table_1.default.findById(tableId);
                if (!table) {
                    res.status(404).json({ error: 'Table not found' });
                    return;
                }
                res.json(table);
            }
            catch (error) {
                console.error('Error getting table:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error getting table: ${errorMessage}` });
            }
        });
    }
    // Update table
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId, tableId } = req.params;
                const updateData = req.body;
                // Check if restaurant exists and contains this table ID
                const restaurant = yield Restaurant_1.default.findOne({
                    _id: restaurantId,
                    tables: { $in: [tableId] }
                });
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant or table not found' });
                    return;
                }
                // Find and update the table in the Table collection
                const table = yield Table_1.default.findById(tableId);
                if (!table) {
                    res.status(404).json({ error: 'Table not found' });
                    return;
                }
                // Ensure venueId is always present
                if (!updateData.venueId && !table.venueId) {
                    res.status(400).json({ error: 'venueId is required' });
                    return;
                }
                // Update the table document
                const updatedTable = yield Table_1.default.findByIdAndUpdate(tableId, Object.assign({}, updateData), { new: true, runValidators: true });
                res.json(updatedTable);
            }
            catch (error) {
                console.error('Error updating table:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error updating table: ${errorMessage}` });
            }
        });
    }
    // Delete table
    delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId, tableId } = req.params;
                // Check if restaurant exists
                const restaurant = yield Restaurant_1.default.findById(restaurantId);
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant not found' });
                    return;
                }
                // Check if table exists
                const table = yield Table_1.default.findById(tableId);
                if (!table) {
                    res.status(404).json({ error: 'Table not found' });
                    return;
                }
                // Remove the table ID from the restaurant's tables array
                yield Restaurant_1.default.updateOne({ _id: restaurantId }, { $pull: { tables: tableId } });
                // Delete the table document from the Table collection
                yield Table_1.default.findByIdAndDelete(tableId);
                res.status(204).send();
            }
            catch (error) {
                console.error('Error deleting table:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error deleting table: ${errorMessage}` });
            }
        });
    }
    // Generate QR code for a table
    generateQRCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId, tableId } = req.params;
                // Check if restaurant exists and contains this table ID
                const restaurant = yield Restaurant_1.default.findOne({
                    _id: restaurantId,
                    tables: { $in: [tableId] }
                });
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant or table not found' });
                    return;
                }
                // Find the table in the Table collection
                const table = yield Table_1.default.findById(tableId);
                if (!table) {
                    res.status(404).json({ error: 'Table not found' });
                    return;
                }
                // Generate a unique identifier for the QR code
                const qrData = {
                    restaurantId,
                    tableId,
                    uniqueId: (0, uuid_1.v4)()
                };
                // Generate QR code
                const qrCode = yield QRCode.toDataURL(JSON.stringify(qrData));
                // Update the table with the QR code
                table.qrCode = qrCode;
                yield table.save();
                res.json({ qrCode });
            }
            catch (error) {
                console.error('Error generating QR code:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error generating QR code: ${errorMessage}` });
            }
        });
    }
    // Get QR code for a table
    getQRCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId, tableId } = req.params;
                // Check if restaurant exists and contains this table ID
                const restaurant = yield Restaurant_1.default.findOne({
                    _id: restaurantId,
                    tables: { $in: [tableId] }
                });
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant or table not found' });
                    return;
                }
                // Find the table in the Table collection
                const table = yield Table_1.default.findById(tableId);
                if (!table) {
                    res.status(404).json({ error: 'Table not found' });
                    return;
                }
                if (!table.qrCode) {
                    res.status(404).json({ error: 'QR code not found for this table' });
                    return;
                }
                res.json({ qrCode: table.qrCode });
            }
            catch (error) {
                console.error('Error getting QR code:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error getting QR code: ${errorMessage}` });
            }
        });
    }
    // Delete QR code for a table
    deleteQRCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { restaurantId, tableId } = req.params;
                // Check if restaurant exists and contains this table ID
                const restaurant = yield Restaurant_1.default.findOne({
                    _id: restaurantId,
                    tables: { $in: [tableId] }
                });
                if (!restaurant) {
                    res.status(404).json({ error: 'Restaurant or table not found' });
                    return;
                }
                // Find the table in the Table collection
                const table = yield Table_1.default.findById(tableId);
                if (!table) {
                    res.status(404).json({ error: 'Table not found' });
                    return;
                }
                // Remove the QR code
                table.qrCode = '';
                yield table.save();
                res.status(204).send();
            }
            catch (error) {
                console.error('Error deleting QR code:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                res.status(500).json({ error: `Error deleting QR code: ${errorMessage}` });
            }
        });
    }
}
exports.TableController = TableController;
