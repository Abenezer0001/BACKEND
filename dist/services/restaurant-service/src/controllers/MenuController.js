"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuController = void 0;
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
const Table_1 = __importDefault(require("../models/Table"));
const menu_model_1 = __importDefault(require("../../models/menu.model"));
const mongoose_1 = __importDefault(require("mongoose"));
class MenuController {
    // Create a new menu
    async create(req, res) {
        try {
            const { restaurantId } = req.params;
            const menuData = req.body;
            const restaurant = await Restaurant_1.default.findById(restaurantId).exec();
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant not found' });
                return;
            }
            const menu = new menu_model_1.default({
                ...menuData,
                restaurantId
            });
            const savedMenu = await menu.save();
            res.status(201).json(savedMenu);
        }
        catch (error) {
            console.error('Error creating menu:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error creating menu: ${errorMessage}` });
        }
    }
    // Get all menus
    async getAll(req, res) {
        try {
            const { restaurantId } = req.params;
            const menus = await menu_model_1.default.find({ restaurantId }).exec();
            res.status(200).json(menus);
        }
        catch (error) {
            console.error('Error fetching menus:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching menus: ${errorMessage}` });
        }
    }
    // Get menu by ID
    async getById(req, res) {
        try {
            const { menuId } = req.params;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            res.status(200).json(menu);
        }
        catch (error) {
            console.error('Error fetching menu:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching menu: ${errorMessage}` });
        }
    }
    // Update menu
    async update(req, res) {
        try {
            const { menuId } = req.params;
            const updateData = req.body;
            const menu = await menu_model_1.default.findByIdAndUpdate(menuId, updateData, { new: true }).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            res.status(200).json(menu);
        }
        catch (error) {
            console.error('Error updating menu:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error updating menu: ${errorMessage}` });
        }
    }
    // Delete menu
    async delete(req, res) {
        try {
            const { menuId } = req.params;
            const menu = await menu_model_1.default.findByIdAndDelete(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            res.status(200).json({ message: 'Menu deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting menu:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error deleting menu: ${errorMessage}` });
        }
    }
    // Add category to menu
    async addCategory(req, res) {
        try {
            const { menuId } = req.params;
            const categoryData = req.body;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            // Create category as a mongoose subdocument
            const categorySchema = menu_model_1.default.schema.path('categories').schema;
            const CategoryModel = mongoose_1.default.model('MenuCategory', categorySchema);
            const category = new CategoryModel({
                _id: new mongoose_1.default.Types.ObjectId(),
                name: categoryData.name,
                description: categoryData.description,
                categories: categoryData.categories || [],
                items: [],
                isAvailable: true,
                availabilitySchedule: categoryData.availabilitySchedule
            });
            // Add to categories array
            menu.categories.push(category);
            await menu.save();
            res.status(201).json(category.toObject());
        }
        catch (error) {
            console.error('Error adding category:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error adding category: ${errorMessage}` });
        }
    }
    // Add menu item to category
    async addMenuItem(req, res) {
        try {
            const { menuId, categoryId } = req.params;
            const itemData = req.body;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            const category = menu.categories.find((cat) => { var _a; return ((_a = cat._id) === null || _a === void 0 ? void 0 : _a.toString()) === categoryId; });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            const newItem = {
                _id: new mongoose_1.default.Types.ObjectId(),
                name: itemData.name,
                description: itemData.description,
                category: itemData.category,
                price: itemData.price,
                modifierGroups: itemData.modifierGroups || [],
                image: itemData.image,
                preparationTime: itemData.preparationTime,
                isAvailable: true,
                allergens: itemData.allergens || [],
                nutritionalInfo: itemData.nutritionalInfo
            };
            category.items.push(newItem);
            await menu.save();
            res.status(201).json(newItem);
        }
        catch (error) {
            console.error('Error adding menu item:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error adding menu item: ${errorMessage}` });
        }
    }
    // Update menu item availability
    async updateItemAvailability(req, res) {
        try {
            const { menuId, categoryId, itemId } = req.params;
            const { isAvailable } = req.body;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            const category = menu.categories.find((cat) => { var _a; return ((_a = cat._id) === null || _a === void 0 ? void 0 : _a.toString()) === categoryId; });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            const item = category.items.find((item) => { var _a; return ((_a = item._id) === null || _a === void 0 ? void 0 : _a.toString()) === itemId; });
            if (!item) {
                res.status(404).json({ error: 'Item not found' });
                return;
            }
            item.isAvailable = isAvailable;
            await menu.save();
            res.status(200).json(item);
        }
        catch (error) {
            console.error('Error updating item availability:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error updating item availability: ${errorMessage}` });
        }
    }
    // Assign menu to table
    async assignMenuToTable(req, res) {
        try {
            const { restaurantId, tableId, menuId } = req.params;
            // Check if restaurant exists and contains this table ID
            const restaurant = await Restaurant_1.default.findOne({
                _id: restaurantId,
                tables: { $in: [tableId] }
            });
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant or table not found' });
                return;
            }
            // Find the table in the Table collection
            const table = await Table_1.default.findById(tableId);
            if (!table) {
                res.status(404).json({ error: 'Table not found' });
                return;
            }
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            // Update the table with the menu ID and save
            const updatedTable = await Table_1.default.findByIdAndUpdate(tableId, { menuId: menu._id }, { new: true });
            res.status(200).json(updatedTable);
        }
        catch (error) {
            console.error('Error assigning menu to table:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error assigning menu to table: ${errorMessage}` });
        }
    }
    // Remove menu from table
    async removeMenuFromTable(req, res) {
        try {
            const { restaurantId, tableId } = req.params;
            // Check if restaurant exists and contains this table ID
            const restaurant = await Restaurant_1.default.findOne({
                _id: restaurantId,
                tables: { $in: [tableId] }
            });
            if (!restaurant) {
                res.status(404).json({ error: 'Restaurant or table not found' });
                return;
            }
            // Find the table in the Table collection
            const table = await Table_1.default.findById(tableId);
            if (!table) {
                res.status(404).json({ error: 'Table not found' });
                return;
            }
            // Update the table to remove the menu ID and save
            const updatedTable = await Table_1.default.findByIdAndUpdate(tableId, { $unset: { menuId: 1 } }, { new: true });
            res.status(200).json(updatedTable);
        }
        catch (error) {
            console.error('Error removing menu from table:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error removing menu from table: ${errorMessage}` });
        }
    }
    // Get all menu categories
    async getCategories(req, res) {
        try {
            const { menuId } = req.params;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            res.status(200).json(menu.categories);
        }
        catch (error) {
            console.error('Error fetching menu categories:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error fetching menu categories: ${errorMessage}` });
        }
    }
    // Update menu category
    async updateCategory(req, res) {
        try {
            const { menuId, categoryId } = req.params;
            const updateData = req.body;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            const category = menu.categories.find((cat) => { var _a; return ((_a = cat._id) === null || _a === void 0 ? void 0 : _a.toString()) === categoryId; });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            category.name = updateData.name;
            category.description = updateData.description;
            category.categories = updateData.categories || [];
            category.isAvailable = updateData.isAvailable;
            category.availabilitySchedule = updateData.availabilitySchedule;
            await menu.save();
            res.status(200).json(category);
        }
        catch (error) {
            console.error('Error updating menu category:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error updating menu category: ${errorMessage}` });
        }
    }
    // Delete menu category
    async deleteCategory(req, res) {
        try {
            const { menuId, categoryId } = req.params;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            const categoryIndex = menu.categories.findIndex((cat) => { var _a; return ((_a = cat._id) === null || _a === void 0 ? void 0 : _a.toString()) === categoryId; });
            if (categoryIndex === -1) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            menu.categories.splice(categoryIndex, 1);
            await menu.save();
            res.status(200).json({ message: 'Menu category deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting menu category:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error deleting menu category: ${errorMessage}` });
        }
    }
    // Update menu item
    async updateMenuItem(req, res) {
        try {
            const { menuId, categoryId, itemId } = req.params;
            const updateData = req.body;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            const category = menu.categories.find((cat) => { var _a; return ((_a = cat._id) === null || _a === void 0 ? void 0 : _a.toString()) === categoryId; });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            const item = category.items.find((item) => { var _a; return ((_a = item._id) === null || _a === void 0 ? void 0 : _a.toString()) === itemId; });
            if (!item) {
                res.status(404).json({ error: 'Item not found' });
                return;
            }
            item.name = updateData.name;
            item.description = updateData.description;
            item.price = updateData.price;
            item.modifierGroups = updateData.modifierGroups || [];
            item.image = updateData.image;
            item.preparationTime = updateData.preparationTime;
            item.isAvailable = updateData.isAvailable;
            item.allergens = updateData.allergens || [];
            item.nutritionalInfo = updateData.nutritionalInfo;
            await menu.save();
            res.status(200).json(item);
        }
        catch (error) {
            console.error('Error updating menu item:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error updating menu item: ${errorMessage}` });
        }
    }
    // Delete menu item
    async deleteMenuItem(req, res) {
        try {
            const { menuId, categoryId, itemId } = req.params;
            const menu = await menu_model_1.default.findById(menuId).exec();
            if (!menu) {
                res.status(404).json({ error: 'Menu not found' });
                return;
            }
            const category = menu.categories.find((cat) => { var _a; return ((_a = cat._id) === null || _a === void 0 ? void 0 : _a.toString()) === categoryId; });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            const itemIndex = category.items.findIndex((item) => { var _a; return ((_a = item._id) === null || _a === void 0 ? void 0 : _a.toString()) === itemId; });
            if (itemIndex === -1) {
                res.status(404).json({ error: 'Item not found' });
                return;
            }
            category.items.splice(itemIndex, 1);
            await menu.save();
            res.status(200).json({ message: 'Menu item deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting menu item:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({ error: `Error deleting menu item: ${errorMessage}` });
        }
    }
}
exports.MenuController = MenuController;
