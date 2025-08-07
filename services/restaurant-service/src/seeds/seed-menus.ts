// import mongoose from 'mongoose';
// import Restaurant from '../models/Restaurant';
// import Menu from '../../models/menu.model';
// import MenuItem from '../models/MenuItem';
// import Category from '../models/Category'; // Needed to map category names to IDs if needed for structure
// import SubSubCategory from '../models/SubSubCategory'; // Needed to find items by sub-sub-category

// // --- Configuration ---
// const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

// // --- Helper Function to Group Items ---
// // This function helps organize existing MenuItem documents based on their SubSubCategory's parent Category
// async function groupItemsByTopLevelCategory() {
//     const items = await MenuItem.find({ isActive: true }).populate({
//         path: 'subSubCategory',
//         populate: {
//             path: 'subCategory',
//             populate: {
//                 path: 'category',
//                 select: 'name' // Select only the name of the top-level category
//             },
//             select: 'category' // Select only the category field from subCategory
//         },
//         select: 'subCategory' // Select only the subCategory field from subSubCategory
//     });

//     const groupedItems = new Map<string, mongoose.Types.ObjectId[]>(); // Map<CategoryName, ItemId[]>

//     for (const item of items) {
//         // Safely access nested properties
//         const topLevelCategory = (item.subSubCategory as any)?.subCategory?.category;
//         const categoryName = topLevelCategory?.name;

//         if (categoryName) {
//             if (!groupedItems.has(categoryName)) {
//                 groupedItems.set(categoryName, []);
//             }
//             groupedItems.get(categoryName)?.push(item._id);
//         } else {
//             console.warn(`MenuItem ${item.name} (${item._id}) is missing valid category linkage.`);
//         }
//     }
//     return groupedItems;
// }


// async function seedMenus() {
//     try {
//         await mongoose.connect(MONGO_URL);
//         console.log('Connected to MongoDB for menu seeding.');

//         // --- Clear existing Menus ---
//         console.log('Clearing existing Menu data...');
//         await Menu.deleteMany({});
//         console.log('Cleared existing Menus.');

//         // --- Fetch Required Data ---
//         const restaurants = await Restaurant.find().limit(1); // Seed menus for the first restaurant for simplicity
//         if (restaurants.length === 0) {
//             console.error('No restaurants found. Run the main seed script first.');
//             process.exit(1);
//         }
//         const targetRestaurantId = restaurants[0]._id;
//         console.log(`Found restaurant: ${restaurants[0].name} (${targetRestaurantId})`);

//         const allTopLevelCategories = await Category.find({ isActive: true }); // Fetch actual categories
//         const itemsGrouped = await groupItemsByTopLevelCategory(); // Group existing items

//         if (itemsGrouped.size === 0) {
//              console.error('No menu items found or items could not be grouped by category. Run the main seed script first.');
//              process.exit(1);
//         }
//         console.log(`Found items grouped into ${itemsGrouped.size} categories.`);


//         // --- Define Menu Structures ---

//         // 1. Main Menu (Includes most categories)
//         const mainMenuCategories: any[] = [];
//         for (const category of allTopLevelCategories) {
//              if (itemsGrouped.has(category.name)) { // Only add category if it has items
//                  mainMenuCategories.push({
//                      _id: new mongoose.Types.ObjectId(),
//                      name: category.name,
//                      description: category.description,
//                      items: itemsGrouped.get(category.name) || [],
//                      isAvailable: true,
//                  });
//              }
//         }
//         if (mainMenuCategories.length > 0) {
//             await Menu.create({
//                 name: `${restaurants[0].name} - Main Menu`,
//                 description: 'Our primary selection of dishes and drinks.',
//                 restaurantId: targetRestaurantId,
//                 categories: mainMenuCategories,
//                 isActive: true,
//             });
//             console.log('Created Main Menu.');
//         } else {
//              console.warn('No categories with items found for Main Menu.');
//         }


//         // 2. Kids Menu (Example: Appetizers, specific Mains, Desserts)
//         const kidsMenuCategories: any[] = [];
//         const kidsCategoryNames = ['Appetizers', 'Pasta', 'Ice Cream', 'Juices']; // Example categories for kids
//         for (const categoryName of kidsCategoryNames) {
//              const category = allTopLevelCategories.find(c => c.name === categoryName);
//              if (category && itemsGrouped.has(categoryName)) {
//                  // Optional: Filter items further if needed (e.g., only specific pasta dishes)
//                  kidsMenuCategories.push({
//                      _id: new mongoose.Types.ObjectId(),
//                      name: category.name,
//                      description: category.description,
//                      items: itemsGrouped.get(categoryName) || [],
//                      isAvailable: true,
//                  });
//              }
//         }
//          if (kidsMenuCategories.length > 0) {
//             await Menu.create({
//                 name: `${restaurants[0].name} - Kids Menu`,
//                 description: 'Fun and tasty options for children.',
//                 restaurantId: targetRestaurantId,
//                 categories: kidsMenuCategories,
//                 isActive: true,
//             });
//             console.log('Created Kids Menu.');
//         } else {
//              console.warn('No categories with items found for Kids Menu.');
//         }


//         // 3. Bar Menu (Example: Appetizers, Drinks)
//         const barMenuCategories: any[] = [];
//         const barCategoryNames = ['Appetizers', 'Soft Drinks', 'Hot Drinks']; // Add alcoholic drinks if they exist
//          for (const categoryName of barCategoryNames) {
//              const category = allTopLevelCategories.find(c => c.name === categoryName);
//              if (category && itemsGrouped.has(categoryName)) {
//                  barMenuCategories.push({
//                      _id: new mongoose.Types.ObjectId(),
//                      name: category.name,
//                      description: category.description,
//                      items: itemsGrouped.get(categoryName) || [],
//                      isAvailable: true,
//                  });
//              }
//         }
//         if (barMenuCategories.length > 0) {
//             await Menu.create({
//                 name: `${restaurants[0].name} - Bar Menu`,
//                 description: 'Drinks and light bites available at the bar.',
//                 restaurantId: targetRestaurantId,
//                 categories: barMenuCategories,
//                 isActive: true,
//             });
//             console.log('Created Bar Menu.');
//         } else {
//              console.warn('No categories with items found for Bar Menu.');
//         }


//         console.log('Menu seeding completed successfully.');
//         process.exit(0);

//     } catch (error) {
//         console.error('Menu seeding failed:', error);
//         process.exit(1);
//     }
// }

// seedMenus();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file located in the parent directory (Inseat-backend)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import Models (adjust paths based on your actual project structure)
// Assuming models are within the restaurant-service
// import Restaurant from '../services/restaurant-service/src/models/Restaurant';
import Venue from '../models/Venue';
import Category from '../models/Category';
import Menu from '../models/Menu';
import Restaurant from '../models/Restaurant';

const seedDatabase = async () => {
  const dbUri = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

  if (!dbUri) {
    console.error('Error: MONGODB_URI is not defined in the .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    console.log('MongoDB connected successfully for seeding.');

    // --- Find Prerequisite Data ---

    // 1. Find one Restaurant (Menus belong to a restaurant)
    const sampleRestaurant = await Restaurant.findOne().exec();
    if (!sampleRestaurant) {
      console.error('Seeding Error: No Restaurants found. Please create a restaurant first.');
      await mongoose.disconnect();
      process.exit(1);
    }
    const restaurantId = sampleRestaurant._id;
    console.log(`Using Restaurant ID: ${restaurantId}`);

    // 2. Find two Venues (Menus are linked to venues)
    const sampleVenues = await Venue.find({ restaurantId: restaurantId }).limit(2).exec();
    if (sampleVenues.length < 2) {
      console.error(`Seeding Error: Found only ${sampleVenues.length} venues for restaurant ${restaurantId}. Need at least 2. Please create venues first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    const venueId1 = sampleVenues[0]._id;
    const venueId2 = sampleVenues[1]._id;
    console.log(`Using Venue IDs: ${venueId1}, ${venueId2}`);

    // 3. Find three Categories (Menus contain categories)
    const sampleCategories = await Category.find({ restaurantId: restaurantId }).limit(3).exec();
     if (sampleCategories.length < 3) {
       console.error(`Seeding Error: Found only ${sampleCategories.length} categories for restaurant ${restaurantId}. Need at least 3. Please create categories first.`);
       await mongoose.disconnect();
       process.exit(1);
     }
    const categoryId1 = sampleCategories[0]._id;
    const categoryId2 = sampleCategories[1]._id;
    const categoryId3 = sampleCategories[2]._id;
    console.log(`Using Category IDs: ${categoryId1}, ${categoryId2}, ${categoryId3}`);


    // --- Seed Menu Data ---

    console.log('Clearing existing Menu data...');
    await Menu.deleteMany({ restaurantId: restaurantId }); // Clear only menus for this restaurant

    const menusToCreate = [
      {
        name: 'Main Menu',
        description: 'Our primary selection of dishes.',
        restaurantId: restaurantId,
        venueId: venueId1, // Assign to the first venue
        categories: [categoryId1, categoryId2], // Assign first two categories
        subCategories: [], // Assuming no subcategories for simplicity
      },
      {
        name: 'Kids Menu',
        description: 'Special menu for our younger guests.',
        restaurantId: restaurantId,
        venueId: venueId1, // Also assign to the first venue
        categories: [categoryId3], // Assign the third category
        subCategories: [],
      },
      {
        name: 'Bar Menu',
        description: 'Drinks and light snacks available at the bar.',
        restaurantId: restaurantId,
        venueId: venueId2, // Assign to the second venue
        categories: [categoryId2], // Assign the second category (e.g., Appetizers)
        subCategories: [],
      },
    ];

    console.log('Inserting new Menu data...');
    const createdMenus = await Menu.insertMany(menusToCreate);
    console.log(`Successfully seeded ${createdMenus.length} menus.`);

  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

// Run the seeding function
seedDatabase();