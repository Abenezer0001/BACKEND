import { Request, Response } from 'express';
import Restaurant from '../models/Restaurant';
import Table, { ITable } from '../models/Table';
import Menu, { IMenuItem, IMenuCategory, IMenu } from '../../models/menu.model';
import mongoose from 'mongoose';

// Extended interface for tables with menu assignment
interface ITableWithMenu extends ITable {
  menuId?: mongoose.Types.ObjectId;
}

export class MenuController {
  // Create a new menu
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const menuData = req.body;

      const restaurant = await Restaurant.findById(restaurantId).exec();
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      const menu = new Menu({
        ...menuData,
        restaurantId
      });

      const savedMenu = await menu.save();
      res.status(201).json(savedMenu);
    } catch (error) {
      console.error('Error creating menu:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating menu: ${errorMessage}` });
    }
  }

  // Get all menus
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const menus = await Menu.find({ restaurantId }).exec();
      res.status(200).json(menus);
    } catch (error) {
      console.error('Error fetching menus:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menus: ${errorMessage}` });
    }
  }

  // Get menu by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;
      const menu = await Menu.findById(menuId).exec();
      
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      res.status(200).json(menu);
    } catch (error) {
      console.error('Error fetching menu:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menu: ${errorMessage}` });
    }
  }

  // Update menu
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;
      const updateData = req.body;

      const menu = await Menu.findByIdAndUpdate(
        menuId,
        updateData,
        { new: true }
      ).exec();

      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      res.status(200).json(menu);
    } catch (error) {
      console.error('Error updating menu:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating menu: ${errorMessage}` });
    }
  }

  // Delete menu
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;
      const menu = await Menu.findByIdAndDelete(menuId).exec();
      
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      res.status(200).json({ message: 'Menu deleted successfully' });
    } catch (error) {
      console.error('Error deleting menu:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting menu: ${errorMessage}` });
    }
  }

  // Add category to menu
  public async addCategory(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;
      const categoryData = req.body;

      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      // Create category as a mongoose subdocument
      const categorySchema = (Menu.schema.path('categories') as any).schema;
      const CategoryModel = mongoose.model('MenuCategory', categorySchema);
      
      const category = new CategoryModel({
        _id: new mongoose.Types.ObjectId(),
        name: categoryData.name,
        description: categoryData.description,
        categories: categoryData.categories || [],
        items: [],
        isAvailable: true,
        availabilitySchedule: categoryData.availabilitySchedule
      });

      // Add to categories array
      menu.categories.push(category as any);
      await menu.save();

      res.status(201).json(category.toObject());
    } catch (error) {
      console.error('Error adding category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error adding category: ${errorMessage}` });
    }
  }

  // Add menu item to category
  public async addMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { menuId, categoryId } = req.params;
      const itemData = req.body;

      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      const category = menu.categories.find((cat: IMenuCategory) => cat._id?.toString() === categoryId);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const newItem: Partial<IMenuItem> = {
        _id: new mongoose.Types.ObjectId(),
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

      category.items.push(newItem as IMenuItem);
      await menu.save();

      res.status(201).json(newItem);
    } catch (error) {
      console.error('Error adding menu item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error adding menu item: ${errorMessage}` });
    }
  }

  // Update menu item availability
  public async updateItemAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { menuId, categoryId, itemId } = req.params;
      const { isAvailable } = req.body;

      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      const category = menu.categories.find((cat: IMenuCategory) => cat._id?.toString() === categoryId);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const item = category.items.find((item: IMenuItem) => item._id?.toString() === itemId);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      item.isAvailable = isAvailable;
      await menu.save();

      res.status(200).json(item);
    } catch (error) {
      console.error('Error updating item availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating item availability: ${errorMessage}` });
    }
  }

  // Assign menu to table
  public async assignMenuToTable(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId, menuId } = req.params;

      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });
      
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found' });
        return;
      }

      // Find the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      // Update the table with the menu ID and save
      const updatedTable = await Table.findByIdAndUpdate(
        tableId,
        { menuId: menu._id },
        { new: true }
      );

      res.status(200).json(updatedTable);
    } catch (error) {
      console.error('Error assigning menu to table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error assigning menu to table: ${errorMessage}` });
    }
  }

  // Remove menu from table
  public async removeMenuFromTable(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;

      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });
      
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found' });
        return;
      }

      // Find the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      // Update the table to remove the menu ID and save
      const updatedTable = await Table.findByIdAndUpdate(
        tableId,
        { $unset: { menuId: 1 } },
        { new: true }
      );

      res.status(200).json(updatedTable);
    } catch (error) {
      console.error('Error removing menu from table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error removing menu from table: ${errorMessage}` });
    }
  }

  // Get all menu categories
  public async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;

      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      res.status(200).json(menu.categories);
    } catch (error) {
      console.error('Error fetching menu categories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menu categories: ${errorMessage}` });
    }
  }

  // Update menu category
  public async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { menuId, categoryId } = req.params;
      const updateData = req.body;

      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      const category = menu.categories.find((cat: IMenuCategory) => cat._id?.toString() === categoryId);
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
    } catch (error) {
      console.error('Error updating menu category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating menu category: ${errorMessage}` });
    }
  }

  // Delete menu category
  public async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { menuId, categoryId } = req.params;
      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      const categoryIndex = menu.categories.findIndex((cat: IMenuCategory) => cat._id?.toString() === categoryId);
      if (categoryIndex === -1) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      menu.categories.splice(categoryIndex, 1);
      await menu.save();

      res.status(200).json({ message: 'Menu category deleted successfully' });
    } catch (error) {
      console.error('Error deleting menu category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting menu category: ${errorMessage}` });
    }
  }

  // Update menu item
  public async updateMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { menuId, categoryId, itemId } = req.params;
      const updateData = req.body;

      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      const category = menu.categories.find((cat: IMenuCategory) => cat._id?.toString() === categoryId);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const item = category.items.find((item: IMenuItem) => item._id?.toString() === itemId);
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
    } catch (error) {
      console.error('Error updating menu item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating menu item: ${errorMessage}` });
    }
  }

  // Delete menu item
  public async deleteMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { menuId, categoryId, itemId } = req.params;
      const menu = await Menu.findById(menuId).exec();
      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      const category = menu.categories.find((cat: IMenuCategory) => cat._id?.toString() === categoryId);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const itemIndex = category.items.findIndex((item: IMenuItem) => item._id?.toString() === itemId);
      if (itemIndex === -1) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      category.items.splice(itemIndex, 1);
      await menu.save();

      res.status(200).json({ message: 'Menu item deleted successfully' });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting menu item: ${errorMessage}` });
    }
  }
}
