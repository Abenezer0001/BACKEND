"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTableType = exports.updateTableType = exports.getTableTypeById = exports.getTableTypesByRestaurant = exports.createTableType = void 0;
const TableType_1 = __importDefault(require("../models/TableType"));
const mongoose_1 = __importDefault(require("mongoose"));
const createTableType = async (req, res) => {
    try {
        const { name, description, restaurantId } = req.body;
        if (!name || !restaurantId) {
            res.status(400).json({ message: 'Name and restaurantId are required.' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(restaurantId)) {
            res.status(400).json({ message: 'Invalid Restaurant ID format.' });
            return;
        }
        const newTableType = new TableType_1.default({ name, description, restaurantId });
        await newTableType.save();
        res.status(201).json(newTableType);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating table type', error: error.message });
    }
};
exports.createTableType = createTableType;
const getTableTypesByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(restaurantId)) {
            res.status(400).json({ message: 'Invalid Restaurant ID format.' });
            return;
        }
        const tableTypes = await TableType_1.default.find({ restaurantId });
        if (!tableTypes) {
            res.status(404).json({ message: 'No table types found for this restaurant.' });
            return;
        }
        res.status(200).json(tableTypes);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching table types', error: error.message });
    }
};
exports.getTableTypesByRestaurant = getTableTypesByRestaurant;
const getTableTypeById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid TableType ID format.' });
            return;
        }
        const tableType = await TableType_1.default.findById(id);
        if (!tableType) {
            res.status(404).json({ message: 'TableType not found.' });
            return;
        }
        res.status(200).json(tableType);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching table type', error: error.message });
    }
};
exports.getTableTypeById = getTableTypeById;
const updateTableType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid TableType ID format.' });
            return;
        }
        const updatedTableType = await TableType_1.default.findByIdAndUpdate(id, { name, description }, { new: true, runValidators: true } // Return the updated object and run schema validators
        );
        if (!updatedTableType) {
            res.status(404).json({ message: 'TableType not found.' });
            return;
        }
        res.status(200).json(updatedTableType);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating table type', error: error.message });
    }
};
exports.updateTableType = updateTableType;
const deleteTableType = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid TableType ID format.' });
            return;
        }
        // Optional: Check if any Table uses this TableType before deleting
        // const tablesUsingType = await Table.countDocuments({ tableTypeId: id });
        // if (tablesUsingType > 0) {
        //   return res.status(400).json({ message: 'Cannot delete TableType as it is currently assigned to tables.' });
        // }
        const deletedTableType = await TableType_1.default.findByIdAndDelete(id);
        if (!deletedTableType) {
            res.status(404).json({ message: 'TableType not found.' });
            return;
        }
        res.status(200).json({ message: 'TableType deleted successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting table type', error: error.message });
    }
};
exports.deleteTableType = deleteTableType;
