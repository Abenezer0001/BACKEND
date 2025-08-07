import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url || 'file://' + __filename);
const __dirname = dirname(__filename);

// Load environment variables from .env file located in the parent directory (Inseat-backend)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import Models
import Restaurant from '../services/restaurant-service/src/models/Restaurant';
import Venue from '../services/restaurant-service/src/models/Venue';
import Category from '../services/restaurant-service/src/models/Category';
import SubCategory from '../services/restaurant-service/src/models/SubCategory';
import MenuItem from '../services/restaurant-service/src/models/MenuItem';
import Modifier from '../services/restaurant-service/src/models/Modifier';

// Path to frontend data files
const CATEGORIES_PATH = '../../order-mate-express/src/data/categories-data.json';
const MENU_ITEMS_PATH = '../../order-mate-express/src/data/menu-items.json';

interface IFrontendCategory {
  id: string;
  name: string;
  image: string;
  imageSearchTerm: string;
  subCategories: string[];
}

interface IModifierOption {
  name: string;
  price: number;
}

interface IModifierGroup {
  name: string;
  type: string;
  required: boolean;
  options: IModifierOption[];
}

interface IFrontendMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  categoryId: string;
  subcategory: string;
  featured?: boolean;
  popular?: boolean;
  tags?: string[];
  modifiers?: IModifierGroup[];
}

interface ICategoryMap {
  [key: string]: mongoose.Types.ObjectId;
}

interface ISubCategoryMap {
  [key: string]: mongoose.Types.ObjectId;
}

const seedDatabase = async () => {
  const dbUri = process.env.MONGO_URL || 'mongodb://localhost:27017/inseat';

  if (!dbUri) {
    console.error('Error: MONGODB_URI is not defined in the .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    console.log('MongoDB connected successfully for seeding menu data.');

    // Read the JSON data files
    const categoriesData: IFrontendCategory[] = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, CATEGORIES_PATH), 'utf-8')
    );
    
    const menuItemsData = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, MENU_ITEMS_PATH), 'utf-8')
    ).items as IFrontendMenuItem[];

    console.log(`Loaded ${categoriesData.length} categories and ${menuItemsData.length} menu items from frontend data.`);

    // Find a Restaurant to attach menu data to
    const restaurant = await Restaurant.findOne().exec();
    if (!restaurant) {
      console.error('Error: No restaurants found in the database. Please create a restaurant first.');
      await mongoose.disconnect();
      process.exit(1);
    }
    const restaurantId = restaurant._id;
    console.log(`Using Restaurant ID: ${restaurantId}`);

    // Find a Venue to attach menu data to
    const venue = await Venue.findOne({ restaurantId }).exec();
    if (!venue) {
      console.error('Error: No venues found for this restaurant. Please create a venue first.');
      await mongoose.disconnect();
      process.exit(1);
    }
    const venueId = venue._id;
    console.log(`Using Venue ID: ${venueId}`);

    // Clear existing data
    console.log('Clearing existing menu data...');
    await Category.deleteMany({ restaurantId });
    await SubCategory.deleteMany({ category: { $in: await Category.find({ restaurantId }).distinct('_id') } });
    await MenuItem.deleteMany({ restaurantId });

    // Maps to store IDs of created categories and subcategories
    const categoryMap: ICategoryMap = {};
    const subCategoryMap: ISubCategoryMap = {};

    // Step 1: Create Categories
    console.log('Creating categories...');
    for (let index = 0; index < categoriesData.length; index++) {
      const category = categoriesData[index];
      const newCategory = await Category.create({
        name: category.name,
        description: category.name,
        image: category.image,
        restaurantId,
        isActive: true,
        order: index
      });
      
      categoryMap[category.id] = newCategory._id;
      console.log(`Created category: ${category.name}`);
    }

    // Step 2: Create SubCategories
    console.log('Creating subcategories...');
    for (let i = 0; i < categoriesData.length; i++) {
      const category = categoriesData[i];
      const categoryId = categoryMap[category.id];
      
      for (let index = 0; index < category.subCategories.length; index++) {
        const subCategoryName = category.subCategories[index];
        const subCategory = await SubCategory.create({
          name: subCategoryName,
          description: subCategoryName,
          category: categoryId,
          isActive: true,
          order: index,
          image: category.image // Using the same image as the parent category
        });
        
        // Store with a compound key of categoryId_subCategoryName for uniqueness
        const key = category.id + '_' + subCategoryName;
        subCategoryMap[key] = subCategory._id;
        console.log(`Created subcategory: ${subCategoryName} for category ${category.name}`);
      }
    }

    // Step 3: Create Menu Items
    console.log('Creating menu items...');
    for (const item of menuItemsData) {
      // Find category and subcategory IDs
      const categoryId = categoryMap[item.categoryId];
      
      if (!categoryId) {
        console.warn(`Warning: Category ID ${item.categoryId} not found for menu item ${item.name}. Skipping.`);
        continue;
      }
      
      // Create a compound key to look up the subcategory
      const subCategoryKey = `${item.categoryId}_${item.subcategory}`;
      const subCategoryId = subCategoryMap[subCategoryKey];
      
      if (!subCategoryId && item.subcategory) {
        console.warn(`Warning: SubCategory ${item.subcategory} not found for menu item ${item.name} in category ${item.categoryId}. Skipping.`);
        continue;
      }

      // Handle modifiers if needed
      let modifiers: mongoose.Types.ObjectId[] = [];
      
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modGroup of item.modifiers) {
          const modifier = await Modifier.create({
            name: modGroup.name,
            type: modGroup.type === 'single-select' ? 'SINGLE' : 'MULTIPLE',
            required: modGroup.required,
            options: modGroup.options.map(opt => ({
              name: opt.name,
              price: opt.price
            })),
            restaurantId
          });
          
          modifiers.push(modifier._id);
        }
      }

      // Create menu item
      await MenuItem.create({
        name: item.name,
        description: item.description,
        venueId,
        categories: [categoryId],
        subCategories: subCategoryId ? [subCategoryId] : [],
        price: item.price,
        modifierGroups: modifiers,
        image: item.image,
        preparationTime: 15, // Default preparation time in minutes
        isAvailable: true,
        isActive: true,
        allergens: [],
        restaurantId
      });
      
      console.log(`Created menu item: ${item.name}`);
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error during database seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

// Run the seeding function
seedDatabase();
