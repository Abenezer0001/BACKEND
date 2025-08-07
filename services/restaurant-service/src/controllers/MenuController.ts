import { Request, Response } from 'express';
import Restaurant from '../models/Restaurant';
import Table, { ITable } from '../models/Table';
import Menu, { IMenu } from '../models/Menu'; // Added .js extension (TypeScript expects this for ESM compatibility)
import MenuItem from '../models/MenuItem'; // Import the standalone MenuItem model
import Schedule from '../models/Schedule';
import mongoose, { Types } from 'mongoose';

// Extended interface for tables with menu assignment
interface ITableWithMenu extends ITable {
  menuId?: mongoose.Types.ObjectId;
}

export class MenuController {
  // Create a new menu
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, venueId, categories, subCategories, restaurantId } = req.body;

      // Basic validation
      if (!name || !venueId) {
        res.status(400).json({ error: 'Missing required fields: name and venueId' });
        return;
      }
      if (!restaurantId) {
        res.status(400).json({ error: 'Missing required field: restaurantId' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(venueId)) {
          res.status(400).json({ error: 'Invalid venueId format' });
          return;
      }
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
          res.status(400).json({ error: 'Invalid restaurantId format' });
          return;
      }
      // Optional: Add validation for categories/subCategories if they are provided (check if they are arrays of valid ObjectIds)

      const restaurant = await Restaurant.findById(restaurantId).exec();
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }
      // Optional: Check if venueId exists and belongs to the restaurant

      const menu = new Menu({
        name,
        description,
        restaurantId,
        venueId,
        categories: categories || [], // Default to empty array if not provided
        subCategories: subCategories || [] // Default to empty array if not provided
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
      // Get venueId from query parameters if provided
      const { venueId, populate } = req.query;
      
      // Build query based on venueId if provided
      const query = venueId ? { venueId } : {};
      
      const menus = await Menu.find(query) // Find menus with query filter
        .populate('venueId', 'name') // Populate venue name
        .populate('categories', 'name description image isActive') // Populate category with image and other fields
        .populate('subCategories', 'name') // Populate subCategory names
        .exec();

      // Enhanced menu processing with schedule enforcement for categories
      const menusWithScheduleEnforcement = await Promise.all(
        menus.map(async (menu) => {
          const menuObj = menu.toObject();
          
          // Check category schedules and update isActive based on schedule enforcement
          if (menuObj.categories && menuObj.categories.length > 0) {
            menuObj.categories = await Promise.all(
              menuObj.categories.map(async (category: any) => {
                try {
                  // Find active schedule for this category
                  const schedule = await Schedule.findOne({
                    categoryId: category._id,
                    scheduleType: 'CATEGORY',
                    status: 'ACTIVE',
                    isActive: true
                  });

                  if (schedule) {
                    // Check if category is currently active based on schedule
                    const isCurrentlyActive = schedule.isCurrentlyActive();
                    console.log(`MenuController: Category "${category.name}" schedule check: ${isCurrentlyActive}`);
                    
                    // Override isActive based on schedule
                    category.isActive = isCurrentlyActive;
                  }
                  // If no schedule found, keep original isActive value
                  
                } catch (error) {
                  console.error(`MenuController: Error checking schedule for category ${category.name}:`, error);
                  // Keep original isActive value on error
                }
                
                return category;
              })
            );
          }
          
          return menuObj;
        })
      );

      res.status(200).json(menusWithScheduleEnforcement);
    } catch (error) {
      console.error('Error fetching menus:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menus: ${errorMessage}` });
    }
  }

  // Get menu by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid Menu ID format' });
        return; // <-- Add return here
      }

      // Populate the new fields
      const menu = await Menu.findById(id)
        .populate('venueId', 'name') // Populate venue name
        .populate('categories', 'name description image isActive') // Populate category with image and other fields
        .populate('subCategories', 'name') // Populate subCategory names
        .exec();

      if (!menu) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }

      // Enhanced menu processing with schedule enforcement for categories
      const menuObj = menu.toObject();
      
      // Check category schedules and update isActive based on schedule enforcement
      if (menuObj.categories && menuObj.categories.length > 0) {
        menuObj.categories = await Promise.all(
          menuObj.categories.map(async (category: any) => {
            try {
              // Find active schedule for this category
              const schedule = await Schedule.findOne({
                categoryId: category._id,
                scheduleType: 'CATEGORY',
                status: 'ACTIVE',
                isActive: true
              });

              if (schedule) {
                // Check if category is currently active based on schedule
                const isCurrentlyActive = schedule.isCurrentlyActive();
                console.log(`MenuController (getById): Category "${category.name}" schedule check: ${isCurrentlyActive}`);
                
                // Override isActive based on schedule
                category.isActive = isCurrentlyActive;
              }
              // If no schedule found, keep original isActive value
              
            } catch (error) {
              console.error(`MenuController (getById): Error checking schedule for category ${category.name}:`, error);
              // Keep original isActive value on error
            }
            
            return category;
          })
        );
      }

      res.status(200).json(menuObj);
    } catch (error) {
      console.error('Error fetching menu:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menu: ${errorMessage}` });
    }
  }

  // Update menu
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, venueId, categories, subCategories } = req.body;

       if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ error: 'Invalid Menu ID format' });
         return;
       }
       if (venueId && !mongoose.Types.ObjectId.isValid(venueId)) {
           res.status(400).json({ error: 'Invalid venueId format' });
           return;
       }
       // Optional: Add validation for categories/subCategories if they are provided

      // Construct update object carefully to avoid overwriting fields unintentionally
      const updateData: Partial<IMenu> = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description; // Allow setting empty description
      if (venueId) updateData.venueId = venueId;
      if (categories) updateData.categories = categories; // Replace the whole array
      if (subCategories) updateData.subCategories = subCategories; // Replace the whole array

      const menu = await Menu.findByIdAndUpdate(
        id,
        updateData, // Use the constructed update object
        { new: true, runValidators: true } // runValidators to ensure schema rules are met
      )
      .populate('venueId', 'name') // Populate fields in the response
      .populate('categories', 'name description image isActive') // Populate category with image and other fields
      .populate('subCategories', 'name')
      .exec();

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
      const { id } = req.params;
      const menu = await Menu.findByIdAndDelete(id).exec();
      
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

  // Removed methods: addCategory, addMenuItemReference, removeMenuItemReference, getCategories, updateCategory, deleteCategory
  // These methods were based on the old embedded category structure.
  // New logic for managing category/subcategory associations would need separate endpoints or modifications to the update method.

  // Assign menu to table (Kept as it might still be relevant)
  public async assignMenuToTable(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId, menuId } = req.params;

       if (!mongoose.Types.ObjectId.isValid(tableId) || !mongoose.Types.ObjectId.isValid(menuId)) {
         res.status(400).json({ error: 'Invalid Table or Menu ID format' });
         return;
       }

      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });

      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found within the restaurant' });
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
      ).populate('menuId', 'name'); // Populate menu name in response

      res.status(200).json(updatedTable);
    } catch (error) {
      console.error('Error assigning menu to table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error assigning menu to table: ${errorMessage}` });
    }
  }

  // Remove menu from table (Kept as it might still be relevant)
  public async removeMenuFromTable(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;

       if (!mongoose.Types.ObjectId.isValid(tableId)) {
         res.status(400).json({ error: 'Invalid Table ID format' });
         return;
       }

      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });

      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found within the restaurant' });
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
        { $unset: { menuId: "" } }, // Correct way to unset with $unset
        { new: true }
      );

      res.status(200).json(updatedTable);
    } catch (error) {
      console.error('Error removing menu from table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error removing menu from table: ${errorMessage}` });
    }
  }

  // Method updateMenuItem was removed in the previous step.


  // Method deleteMenuItem was removed in the previous step.
}
