"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableController = void 0;
var Restaurant_1 = require("../models/Restaurant");
var Table_1 = require("../models/Table");
var QRCode = require("qrcode");
var uuid_1 = require("uuid");
var mongoose_1 = require("mongoose");
var TableController = /** @class */ (function () {
    function TableController() {
    }
    // Create a new table
    TableController.prototype.create = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, restaurantId, venueId_1, tableData, restaurant, venueExists, existingTable, newTable, savedTable, error_1, errorMessage;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 5, , 6]);
                        console.log('Creating table with params:', req.params);
                        console.log('Table data:', req.body);
                        _a = req.params, restaurantId = _a.restaurantId, venueId_1 = _a.venueId;
                        tableData = req.body;
                        if (!mongoose_1.default.Types.ObjectId.isValid(restaurantId)) {
                            res.status(400).json({ error: 'Invalid restaurant ID format' });
                            return [2 /*return*/];
                        }
                        if (!mongoose_1.default.Types.ObjectId.isValid(venueId_1)) {
                            res.status(400).json({ error: 'Invalid venue ID format' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Restaurant_1.default.findById(restaurantId)];
                    case 1:
                        restaurant = _c.sent();
                        if (!restaurant) {
                            res.status(404).json({ error: 'Restaurant not found' });
                            return [2 /*return*/];
                        }
                        venueExists = restaurant.venues.some(function (venue) { return venue.toString() === venueId_1; });
                        if (!venueExists) {
                            res.status(404).json({ error: 'Venue not found in this restaurant' });
                            return [2 /*return*/];
                        }
                        // Validate required fields
                        if (!tableData.number || !tableData.capacity || !tableData.type) {
                            res.status(400).json({ error: 'Missing required fields: number, capacity, or type' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.findOne({
                                venueId: new mongoose_1.default.Types.ObjectId(venueId_1),
                                number: tableData.number
                            })];
                    case 2:
                        existingTable = _c.sent();
                        if (existingTable) {
                            res.status(400).json({ error: 'Table number already exists in this venue' });
                            return [2 /*return*/];
                        }
                        newTable = new Table_1.default({
                            number: tableData.number,
                            capacity: parseInt(tableData.capacity, 10),
                            type: tableData.type,
                            venueId: new mongoose_1.default.Types.ObjectId(venueId_1),
                            qrCode: '',
                            isOccupied: false,
                            isActive: (_b = tableData.isActive) !== null && _b !== void 0 ? _b : true
                        });
                        console.log('Attempting to save new table:', newTable);
                        return [4 /*yield*/, newTable.save()];
                    case 3:
                        savedTable = _c.sent();
                        console.log('Table saved successfully:', savedTable);
                        // Add the table's ID to the restaurant's tables array
                        return [4 /*yield*/, Restaurant_1.default.findByIdAndUpdate(restaurantId, { $push: { tables: savedTable._id } }, { new: true })];
                    case 4:
                        // Add the table's ID to the restaurant's tables array
                        _c.sent();
                        console.log('Restaurant updated with new table');
                        res.status(201).json(savedTable);
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _c.sent();
                        console.error('Error creating table:', error_1);
                        errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error occurred';
                        res.status(500).json({ error: "Error creating table: ".concat(errorMessage) });
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Get all tables
    TableController.prototype.getAll = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, restaurantId, venueId_2, restaurant, venueExists, tables, error_2, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        _a = req.params, restaurantId = _a.restaurantId, venueId_2 = _a.venueId;
                        return [4 /*yield*/, Restaurant_1.default.findById(restaurantId)];
                    case 1:
                        restaurant = _b.sent();
                        if (!restaurant) {
                            res.status(404).json({ error: 'Restaurant not found' });
                            return [2 /*return*/];
                        }
                        venueExists = restaurant.venues.some(function (venue) { return venue.toString() === venueId_2; });
                        if (!venueExists) {
                            res.status(404).json({ error: 'Venue not found in this restaurant' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.find({ venueId: new mongoose_1.default.Types.ObjectId(venueId_2) })];
                    case 2:
                        tables = _b.sent();
                        res.json(tables);
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _b.sent();
                        console.error('Error getting tables:', error_2);
                        errorMessage = error_2 instanceof Error ? error_2.message : 'Unknown error occurred';
                        res.status(500).json({ error: "Error getting tables: ".concat(errorMessage) });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Get table by ID
    TableController.prototype.getById = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, restaurantId, tableId, restaurant, table, error_3, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        _a = req.params, restaurantId = _a.restaurantId, tableId = _a.tableId;
                        return [4 /*yield*/, Restaurant_1.default.findOne({
                                _id: restaurantId,
                                tables: { $in: [tableId] }
                            })];
                    case 1:
                        restaurant = _b.sent();
                        if (!restaurant) {
                            res.status(404).json({ error: 'Restaurant or table not found' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.findById(tableId)];
                    case 2:
                        table = _b.sent();
                        if (!table) {
                            res.status(404).json({ error: 'Table not found' });
                            return [2 /*return*/];
                        }
                        res.json(table);
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _b.sent();
                        console.error('Error getting table:', error_3);
                        errorMessage = error_3 instanceof Error ? error_3.message : 'Unknown error occurred';
                        res.status(500).json({ error: "Error getting table: ".concat(errorMessage) });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Update table
    TableController.prototype.update = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, restaurantId, tableId, updateData, restaurant, table, updatedTable, error_4, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        _a = req.params, restaurantId = _a.restaurantId, tableId = _a.tableId;
                        updateData = req.body;
                        return [4 /*yield*/, Restaurant_1.default.findOne({
                                _id: restaurantId,
                                tables: { $in: [tableId] }
                            })];
                    case 1:
                        restaurant = _b.sent();
                        if (!restaurant) {
                            res.status(404).json({ error: 'Restaurant or table not found' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.findById(tableId)];
                    case 2:
                        table = _b.sent();
                        if (!table) {
                            res.status(404).json({ error: 'Table not found' });
                            return [2 /*return*/];
                        }
                        // Ensure venueId is always present
                        if (!updateData.venueId && !table.venueId) {
                            res.status(400).json({ error: 'venueId is required' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.findByIdAndUpdate(tableId, __assign({}, updateData), { new: true, runValidators: true })];
                    case 3:
                        updatedTable = _b.sent();
                        res.json(updatedTable);
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _b.sent();
                        console.error('Error updating table:', error_4);
                        errorMessage = error_4 instanceof Error ? error_4.message : 'Unknown error occurred';
                        res.status(500).json({ error: "Error updating table: ".concat(errorMessage) });
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // Delete table
    TableController.prototype.delete = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, restaurantId, tableId, restaurant, table, error_5, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        _a = req.params, restaurantId = _a.restaurantId, tableId = _a.tableId;
                        return [4 /*yield*/, Restaurant_1.default.findById(restaurantId)];
                    case 1:
                        restaurant = _b.sent();
                        if (!restaurant) {
                            res.status(404).json({ error: 'Restaurant not found' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.findById(tableId)];
                    case 2:
                        table = _b.sent();
                        if (!table) {
                            res.status(404).json({ error: 'Table not found' });
                            return [2 /*return*/];
                        }
                        // Remove the table ID from the restaurant's tables array
                        return [4 /*yield*/, Restaurant_1.default.updateOne({ _id: restaurantId }, { $pull: { tables: tableId } })];
                    case 3:
                        // Remove the table ID from the restaurant's tables array
                        _b.sent();
                        // Delete the table document from the Table collection
                        return [4 /*yield*/, Table_1.default.findByIdAndDelete(tableId)];
                    case 4:
                        // Delete the table document from the Table collection
                        _b.sent();
                        res.status(204).send();
                        return [3 /*break*/, 6];
                    case 5:
                        error_5 = _b.sent();
                        console.error('Error deleting table:', error_5);
                        errorMessage = error_5 instanceof Error ? error_5.message : 'Unknown error occurred';
                        res.status(500).json({ error: "Error deleting table: ".concat(errorMessage) });
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Generate QR code for a table
    TableController.prototype.generateQRCode = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, restaurantId, tableId, restaurant, table, qrData, qrCode, error_6, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        _a = req.params, restaurantId = _a.restaurantId, tableId = _a.tableId;
                        return [4 /*yield*/, Restaurant_1.default.findOne({
                                _id: restaurantId,
                                tables: { $in: [tableId] }
                            })];
                    case 1:
                        restaurant = _b.sent();
                        if (!restaurant) {
                            res.status(404).json({ error: 'Restaurant or table not found' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.findById(tableId)];
                    case 2:
                        table = _b.sent();
                        if (!table) {
                            res.status(404).json({ error: 'Table not found' });
                            return [2 /*return*/];
                        }
                        qrData = {
                            restaurantId: restaurantId,
                            tableId: tableId,
                            uniqueId: (0, uuid_1.v4)()
                        };
                        return [4 /*yield*/, QRCode.toDataURL(JSON.stringify(qrData))];
                    case 3:
                        qrCode = _b.sent();
                        // Update the table with the QR code
                        table.qrCode = qrCode;
                        return [4 /*yield*/, table.save()];
                    case 4:
                        _b.sent();
                        res.json({ qrCode: qrCode });
                        return [3 /*break*/, 6];
                    case 5:
                        error_6 = _b.sent();
                        console.error('Error generating QR code:', error_6);
                        errorMessage = error_6 instanceof Error ? error_6.message : 'Unknown error occurred';
                        res.status(500).json({ error: "Error generating QR code: ".concat(errorMessage) });
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Get QR code for a table
    TableController.prototype.getQRCode = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, restaurantId, tableId, restaurant, table, error_7, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        _a = req.params, restaurantId = _a.restaurantId, tableId = _a.tableId;
                        return [4 /*yield*/, Restaurant_1.default.findOne({
                                _id: restaurantId,
                                tables: { $in: [tableId] }
                            })];
                    case 1:
                        restaurant = _b.sent();
                        if (!restaurant) {
                            res.status(404).json({ error: 'Restaurant or table not found' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.findById(tableId)];
                    case 2:
                        table = _b.sent();
                        if (!table) {
                            res.status(404).json({ error: 'Table not found' });
                            return [2 /*return*/];
                        }
                        if (!table.qrCode) {
                            res.status(404).json({ error: 'QR code not found for this table' });
                            return [2 /*return*/];
                        }
                        res.json({ qrCode: table.qrCode });
                        return [3 /*break*/, 4];
                    case 3:
                        error_7 = _b.sent();
                        console.error('Error getting QR code:', error_7);
                        errorMessage = error_7 instanceof Error ? error_7.message : 'Unknown error occurred';
                        res.status(500).json({ error: "Error getting QR code: ".concat(errorMessage) });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Delete QR code for a table
    TableController.prototype.deleteQRCode = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, restaurantId, tableId, restaurant, table, error_8, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        _a = req.params, restaurantId = _a.restaurantId, tableId = _a.tableId;
                        return [4 /*yield*/, Restaurant_1.default.findOne({
                                _id: restaurantId,
                                tables: { $in: [tableId] }
                            })];
                    case 1:
                        restaurant = _b.sent();
                        if (!restaurant) {
                            res.status(404).json({ error: 'Restaurant or table not found' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Table_1.default.findById(tableId)];
                    case 2:
                        table = _b.sent();
                        if (!table) {
                            res.status(404).json({ error: 'Table not found' });
                            return [2 /*return*/];
                        }
                        // Remove the QR code
                        table.qrCode = '';
                        return [4 /*yield*/, table.save()];
                    case 3:
                        _b.sent();
                        res.status(204).send();
                        return [3 /*break*/, 5];
                    case 4:
                        error_8 = _b.sent();
                        console.error('Error deleting QR code:', error_8);
                        errorMessage = error_8 instanceof Error ? error_8.message : 'Unknown error occurred';
                        res.status(500).json({ error: "Error deleting QR code: ".concat(errorMessage) });
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return TableController;
}());
exports.TableController = TableController;
