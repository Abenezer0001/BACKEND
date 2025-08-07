import { Request, Response } from 'express';
import Category from '../models/Category';
import SubCategory from '../models/SubCategory';
import SubSubCategory from '../models/SubSubCategory';
import MenuItem from '../models/MenuItem';
import Schedule from '../models/Schedule';
import mongoose from 'mongoose';

/**
 * Public Menu Controller - No authentication required
 * For customer-facing menu access (INSEAT-menu)
 */
export class PublicMenuController {
  
  // Get all categories for a restaurant (public access)
  public async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.query;
      
      if (!restaurantId) {
        res.status(400).json({ error: 'Restaurant ID is required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
        res.status(400).json({ error: 'Invalid restaurant ID format' });
        return;
      }

      const categories = await Category.find({ 
        restaurantId, 
        isActive: true 
      }).sort({ order: 1 });

      // Check category schedules and update isActive based on schedule enforcement
      const categoriesWithSchedule = await Promise.all(
        categories.map(async (category) => {
          const categoryObj = category.toObject();
          
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
              console.log(`PublicMenuController: Category "${category.name}" schedule check: ${isCurrentlyActive}`);
              
              // Override isActive based on schedule
              categoryObj.isActive = isCurrentlyActive;
            }
            // If no schedule found, keep original isActive value
            
          } catch (error) {
            console.error(`PublicMenuController: Error checking schedule for category ${category.name}:`, error);
            // Keep original isActive value on error
          }
          
          return categoryObj;
        })
      );

      res.status(200).json(categoriesWithSchedule);
    } catch (error) {
      console.error('Error fetching public categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }

  // Get category by ID (public access)
  public async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid category ID format' });
        return;
      }

      const category = await Category.findOne({ 
        _id: id, 
        isActive: true 
      });

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      // Enhanced category with schedule enforcement
      const categoryObj = category.toObject();
      
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
          console.log(`PublicMenuController (getCategoryById): Category "${category.name}" schedule check: ${isCurrentlyActive}`);
          
          // Override isActive based on schedule
          categoryObj.isActive = isCurrentlyActive;
        }
        // If no schedule found, keep original isActive value
        
      } catch (error) {
        console.error(`PublicMenuController (getCategoryById): Error checking schedule for category ${category.name}:`, error);
        // Keep original isActive value on error
      }

      res.status(200).json(categoryObj);
    } catch (error) {
      console.error('Error fetching public category:', error);
      res.status(500).json({ error: 'Failed to fetch category' });
    }
  }

  // Get subcategories for a category (public access)
  public async getSubCategories(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId } = req.query;
      
      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(categoryId as string)) {
        res.status(400).json({ error: 'Invalid category ID format' });
        return;
      }

      const subCategories = await SubCategory.find({ 
        categoryId, 
        isActive: true 
      }).sort({ order: 1 });

      res.status(200).json(subCategories);
    } catch (error) {
      console.error('Error fetching public subcategories:', error);
      res.status(500).json({ error: 'Failed to fetch subcategories' });
    }
  }

  // Get sub-subcategories (public access)
  public async getSubSubCategories(req: Request, res: Response): Promise<void> {
    try {
      const { subCategoryId } = req.query;
      
      if (!subCategoryId) {
        res.status(400).json({ error: 'Sub-category ID is required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(subCategoryId as string)) {
        res.status(400).json({ error: 'Invalid sub-category ID format' });
        return;
      }

      const subSubCategories = await SubSubCategory.find({ 
        subCategoryId, 
        isActive: true 
      }).sort({ order: 1 });

      res.status(200).json(subSubCategories);
    } catch (error) {
      console.error('Error fetching public sub-subcategories:', error);
      res.status(500).json({ error: 'Failed to fetch sub-subcategories' });
    }
  }

  // Get menu items for a category (public access)
  public async getMenuItems(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId, subCategoryId, subSubCategoryId, restaurantId } = req.query;
      
      let filter: any = { isActive: true };

      if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId as string)) {
          res.status(400).json({ error: 'Invalid category ID format' });
          return;
        }
        // Menu items have categories as an array, so we need to use $in operator
        filter.categories = { $in: [new mongoose.Types.ObjectId(categoryId as string)] };
      }

      if (subCategoryId) {
        if (!mongoose.Types.ObjectId.isValid(subCategoryId as string)) {
          res.status(400).json({ error: 'Invalid sub-category ID format' });
          return;
        }
        // Menu items have subCategories as an array, so we need to use $in operator
        filter.subCategories = { $in: [new mongoose.Types.ObjectId(subCategoryId as string)] };
      }

      if (subSubCategoryId) {
        if (!mongoose.Types.ObjectId.isValid(subSubCategoryId as string)) {
          res.status(400).json({ error: 'Invalid sub-sub-category ID format' });
          return;
        }
        filter.subSubCategoryId = subSubCategoryId;
      }

      if (restaurantId) {
        if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
          res.status(400).json({ error: 'Invalid restaurant ID format' });
          return;
        }
        // Convert restaurantId to ObjectId for proper matching
        filter.restaurantId = new mongoose.Types.ObjectId(restaurantId as string);
      }

      console.log('PublicMenuController: Searching for menu items with filter:', JSON.stringify(filter, null, 2));
      
      const menuItems = await MenuItem.find(filter).populate('modifierGroups').sort({ order: 1 });
      
      console.log(`PublicMenuController: Found ${menuItems.length} menu items`);
      
      // Enhanced menu items with schedule enforcement
      const menuItemsWithScheduleEnforcement = await Promise.all(
        menuItems.map(async (menuItem) => {
          const menuItemObj = menuItem.toObject();
          
          try {
            // Find active schedule for this menu item
            const schedule = await Schedule.findOne({
              menuItemId: menuItem._id,
              scheduleType: 'MENU_ITEM',
              status: 'ACTIVE',
              isActive: true
            });

            if (schedule) {
              // Check if menu item is currently active based on schedule
              const isCurrentlyActive = schedule.isCurrentlyActive();
              console.log(`PublicMenuController: Menu item "${menuItem.name}" schedule check: ${isCurrentlyActive}`);
              
              // Override isAvailable based on schedule
              menuItemObj.isAvailable = isCurrentlyActive;
            }
            // If no schedule found, keep original isAvailable value
            
          } catch (error) {
            console.error(`PublicMenuController: Error checking schedule for menu item ${menuItem.name}:`, error);
            // Keep original isAvailable value on error
          }
          
          return menuItemObj;
        })
      );
      
      res.status(200).json(menuItemsWithScheduleEnforcement);
    } catch (error) {
      console.error('Error fetching public menu items:', error);
      res.status(500).json({ error: 'Failed to fetch menu items' });
    }
  }

  // Get restaurant full menu structure (public access)
  public async getFullMenu(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurant ID format' });
        return;
      }

      // Get all categories for the restaurant
      const categories = await Category.find({ 
        restaurantId, 
        isActive: true 
      }).sort({ order: 1 });

      // Build full menu structure
      const fullMenu = await Promise.all(
        categories.map(async (category) => {
          const subCategories = await SubCategory.find({ 
            categoryId: category._id, 
            isActive: true 
          }).sort({ order: 1 });

          const categoryWithSubs = {
            ...category.toObject(),
            subCategories: await Promise.all(
              subCategories.map(async (subCategory) => {
                const subSubCategories = await SubSubCategory.find({ 
                  subCategoryId: subCategory._id, 
                  isActive: true 
                }).sort({ order: 1 });

                const menuItems = await MenuItem.find({ 
                  categories: { $in: [category._id] },
                  subCategories: { $in: [subCategory._id] },
                  isActive: true 
                }).populate('modifierGroups').sort({ order: 1 });

                return {
                  ...subCategory.toObject(),
                  subSubCategories,
                  menuItems
                };
              })
            ),
            menuItems: await MenuItem.find({ 
              categories: { $in: [category._id] },
              subCategories: { $size: 0 },
              isActive: true 
            }).populate('modifierGroups').sort({ order: 1 })
          };

          return categoryWithSubs;
        })
      );

      res.status(200).json(fullMenu);
    } catch (error) {
      console.error('Error fetching full public menu:', error);
      res.status(500).json({ error: 'Failed to fetch full menu' });
    }
  }
}