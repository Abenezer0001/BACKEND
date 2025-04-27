import mongoose from 'mongoose';
import axios from 'axios'; // Import axios
import Restaurant from '../models/Restaurant';
import Venue from '../models/Venue';
import Table from '../models/Table';
import TableType from '../models/TableType';
import Category from '../models/Category'; // Import Category model
import SubCategory from '../models/SubCategory'; // Import SubCategory model
import SubSubCategory from '../models/SubSubCategory'; // Import SubSubCategory model
import Menu from '../../models/menu.model'; // Import Menu model
import MenuItem, { IMenuItem } from './../models/MenuItem'; // Import MenuItem model and interface
import { restaurantData } from './data'; // Assuming data.ts might be updated or a new file created
import { ITable } from '../models/Table';

// Removed direct Unsplash API fetching logic

// --- Seed Data (Example Structure - Adapt as needed) ---
// Added imageSearchTerm to all levels
const menuSeedData = {
  categories: [
    { name: 'Appetizers', description: 'Starters to whet your appetite', imageSearchTerm: 'restaurant appetizers variety' },
    { name: 'Main Courses', description: 'Hearty main dishes', imageSearchTerm: 'gourmet main course plating' },
    { name: 'Desserts', description: 'Sweet treats to finish', imageSearchTerm: 'decadent chocolate dessert' },
    { name: 'Drinks', description: 'Beverages', imageSearchTerm: 'refreshing iced beverages assortment' },
  ],
  subCategories: [
    { name: 'Soups', description: 'Warm and comforting soups', categoryName: 'Appetizers', imageSearchTerm: 'bowl of soup' },
    { name: 'Salads', description: 'Fresh and crisp salads', categoryName: 'Appetizers', imageSearchTerm: 'fresh garden salad' },
    { name: 'Pasta', description: 'Italian pasta dishes', categoryName: 'Main Courses', imageSearchTerm: 'plate of pasta' },
    { name: 'Grill', description: 'Grilled meats and fish', categoryName: 'Main Courses', imageSearchTerm: 'grilled steak platter' },
    { name: 'Cakes', description: 'Delicious cakes', categoryName: 'Desserts', imageSearchTerm: 'slice of cake' },
    { name: 'Ice Cream', description: 'Frozen delights', categoryName: 'Desserts', imageSearchTerm: 'ice cream scoop' },
    { name: 'Soft Drinks', description: 'Non-alcoholic beverages', categoryName: 'Drinks', imageSearchTerm: 'soda can' },
    { name: 'Hot Drinks', description: 'Coffee, Tea, etc.', categoryName: 'Drinks', imageSearchTerm: 'cup of coffee' },
  ],
  subSubCategories: [
    { name: 'Creamy Soups', description: 'Rich and creamy soups', subCategoryName: 'Soups', imageSearchTerm: 'creamy tomato soup' },
    { name: 'Broth Soups', description: 'Light broth-based soups', subCategoryName: 'Soups', imageSearchTerm: 'chicken noodle soup broth' },
    { name: 'Green Salads', description: 'Leafy green salads', subCategoryName: 'Salads', imageSearchTerm: 'caesar salad bowl' },
    { name: 'Pasta Salads', description: 'Pasta-based salads', subCategoryName: 'Salads', imageSearchTerm: 'pasta salad mediterranean' },
    { name: 'Red Sauce Pasta', description: 'Pasta with tomato-based sauces', subCategoryName: 'Pasta', imageSearchTerm: 'spaghetti bolognese closeup' },
    { name: 'White Sauce Pasta', description: 'Pasta with cream-based sauces', subCategoryName: 'Pasta', imageSearchTerm: 'fettuccine alfredo dish' },
    { name: 'Steaks', description: 'Grilled steaks', subCategoryName: 'Grill', imageSearchTerm: 'grilled ribeye steak' },
    { name: 'Chicken', description: 'Grilled chicken dishes', subCategoryName: 'Grill', imageSearchTerm: 'grilled chicken breast' },
    { name: 'Chocolate Cakes', description: 'Rich chocolate cakes', subCategoryName: 'Cakes', imageSearchTerm: 'chocolate lava cake slice' },
    { name: 'Fruit Cakes', description: 'Cakes with fruit', subCategoryName: 'Cakes', imageSearchTerm: 'strawberry shortcake' },
    { name: 'Scoops', description: 'Classic ice cream scoops', subCategoryName: 'Ice Cream', imageSearchTerm: 'vanilla ice cream scoop' },
    { name: 'Sundaes', description: 'Ice cream sundaes', subCategoryName: 'Ice Cream', imageSearchTerm: 'chocolate sundae' },
    { name: 'Sodas', description: 'Carbonated soft drinks', subCategoryName: 'Soft Drinks', imageSearchTerm: 'cola glass with ice' },
    { name: 'Juices', description: 'Fresh fruit juices', subCategoryName: 'Soft Drinks', imageSearchTerm: 'orange juice glass' },
    { name: 'Coffee', description: 'Various coffee preparations', subCategoryName: 'Hot Drinks', imageSearchTerm: 'espresso cup' },
    { name: 'Tea', description: 'Different types of tea', subCategoryName: 'Hot Drinks', imageSearchTerm: 'cup of hot tea' },
  ],
  menuItems: [
    // Appetizers -> Soups -> Creamy Soups (Need 5 total for Appetizers)
    { name: 'Tomato Soup', description: 'Classic creamy tomato soup', price: 5.99, preparationTime: 10, subSubCategoryName: 'Creamy Soups', imageSearchTerm: 'creamy tomato soup bowl' },
    { name: 'Mushroom Soup', description: 'Creamy mushroom soup', price: 6.50, preparationTime: 12, subSubCategoryName: 'Creamy Soups', imageSearchTerm: 'creamy mushroom soup bowl' },
    // Appetizers -> Soups -> Broth Soups
    { name: 'Chicken Noodle Soup', description: 'Hearty chicken noodle soup', price: 5.50, preparationTime: 10, subSubCategoryName: 'Broth Soups', imageSearchTerm: 'chicken noodle soup classic' },
    // Appetizers -> Salads -> Green Salads
    { name: 'Caesar Salad', description: 'Romaine lettuce, croutons, Parmesan, Caesar dressing', price: 8.99, preparationTime: 8, subSubCategoryName: 'Green Salads', imageSearchTerm: 'caesar salad plate' },
    // Appetizers -> Salads -> Pasta Salads (Adding one more for Appetizers category)
    { name: 'Greek Pasta Salad', description: 'Pasta salad with feta, olives, and vegetables', price: 9.50, preparationTime: 10, subSubCategoryName: 'Pasta Salads', imageSearchTerm: 'greek pasta salad bowl' },

    // Main Courses -> Pasta -> Red Sauce Pasta (Need 5 total for Main Courses)
    { name: 'Spaghetti Bolognese', description: 'Spaghetti with meat sauce', price: 12.99, preparationTime: 15, subSubCategoryName: 'Red Sauce Pasta', imageSearchTerm: 'spaghetti bolognese plate' },
    { name: 'Penne Arrabbiata', description: 'Penne pasta in spicy tomato sauce', price: 11.99, preparationTime: 14, subSubCategoryName: 'Red Sauce Pasta', imageSearchTerm: 'penne arrabbiata spicy' },
    // Main Courses -> Pasta -> White Sauce Pasta
    { name: 'Fettuccine Alfredo', description: 'Fettuccine in creamy Alfredo sauce', price: 13.50, preparationTime: 15, subSubCategoryName: 'White Sauce Pasta', imageSearchTerm: 'fettuccine alfredo creamy' },
    // Main Courses -> Grill -> Steaks
    { name: 'Ribeye Steak', description: 'Grilled ribeye steak with side', price: 25.99, preparationTime: 20, subSubCategoryName: 'Steaks', imageSearchTerm: 'grilled ribeye steak medium rare' },
    // Main Courses -> Grill -> Chicken (Adding one more for Main Courses category)
    { name: 'Grilled Lemon Herb Chicken', description: 'Chicken breast grilled with lemon and herbs', price: 15.99, preparationTime: 18, subSubCategoryName: 'Chicken', imageSearchTerm: 'grilled lemon herb chicken breast' },

    // Desserts -> Cakes -> Chocolate Cakes (Need 5 total for Desserts)
    { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center', price: 7.99, preparationTime: 12, subSubCategoryName: 'Chocolate Cakes', imageSearchTerm: 'chocolate lava cake dessert' },
    { name: 'Black Forest Gateau', description: 'Chocolate sponge cake with cherries and cream', price: 8.50, preparationTime: 10, subSubCategoryName: 'Chocolate Cakes', imageSearchTerm: 'black forest gateau slice' },
    // Desserts -> Cakes -> Fruit Cakes
    { name: 'Cheesecake Slice', description: 'Classic New York cheesecake', price: 7.50, preparationTime: 5, subSubCategoryName: 'Fruit Cakes', imageSearchTerm: 'new york cheesecake slice' }, // Using Fruit Cakes sub-sub for variety
    // Desserts -> Ice Cream -> Scoops
    { name: 'Vanilla Bean Ice Cream', description: 'Two scoops of vanilla bean ice cream', price: 4.99, preparationTime: 3, subSubCategoryName: 'Scoops', imageSearchTerm: 'vanilla ice cream scoops bowl' },
    // Desserts -> Ice Cream -> Sundaes (Adding one more for Desserts category)
    { name: 'Caramel Sundae', description: 'Vanilla ice cream with caramel sauce and nuts', price: 6.99, preparationTime: 5, subSubCategoryName: 'Sundaes', imageSearchTerm: 'caramel sundae glass' },

    // Drinks -> Soft Drinks -> Sodas (Need 5 total for Drinks)
    { name: 'Cola', description: 'Classic cola', price: 2.50, preparationTime: 1, subSubCategoryName: 'Sodas', imageSearchTerm: 'cola drink glass ice' },
    { name: 'Lemon-Lime Soda', description: 'Refreshing lemon-lime soda', price: 2.50, preparationTime: 1, subSubCategoryName: 'Sodas', imageSearchTerm: 'lemon lime soda can' },
    // Drinks -> Soft Drinks -> Juices
    { name: 'Orange Juice', description: 'Freshly squeezed orange juice', price: 3.50, preparationTime: 3, subSubCategoryName: 'Juices', imageSearchTerm: 'orange juice fresh glass' },
    // Drinks -> Hot Drinks -> Coffee
    { name: 'Espresso', description: 'Strong black coffee', price: 3.00, preparationTime: 2, subSubCategoryName: 'Coffee', imageSearchTerm: 'espresso shot cup' },
    // Drinks -> Hot Drinks -> Tea (Adding one more for Drinks category)
    { name: 'Green Tea', description: 'Hot green tea', price: 2.75, preparationTime: 2, subSubCategoryName: 'Tea', imageSearchTerm: 'green tea cup hot' },
  ]
};


async function seed() {
  try {
    // Connect to MongoDB
    const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      Restaurant.deleteMany({}),
      Venue.deleteMany({}),
      Table.deleteMany({}),
      TableType.deleteMany({}),
      Category.deleteMany({}), // Clear Categories
      SubCategory.deleteMany({}), // Clear SubCategories
      SubSubCategory.deleteMany({}), // Clear SubSubCategories
      Menu.deleteMany({}) // Clear Menus
    ]);
    console.log('Cleared existing data');

    // --- Seed Categories ---
    console.log('Seeding Categories...');
    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    for (const catData of menuSeedData.categories) {
      // const imageUrl = await fetchImage(catData.name); // Removed image fetch
      const category = await Category.create({
        name: catData.name,
        description: catData.description,
        image: '', // Set initial image empty
        imageSearchTerm: catData.imageSearchTerm, // Add search term
        isActive: true,
        order: 0 // Add order if needed
      });
      categoryMap.set(catData.name, category._id);
      console.log(`Created Category: ${category.name}`);
    }

    // --- Seed SubCategories ---
    console.log('Seeding SubCategories...');
    const subCategoryMap = new Map<string, mongoose.Types.ObjectId>();
    for (const subCatData of menuSeedData.subCategories) {
      const parentCategoryId = categoryMap.get(subCatData.categoryName);
      if (!parentCategoryId) {
        console.warn(`Parent category "${subCatData.categoryName}" not found for subcategory "${subCatData.name}". Skipping.`);
        continue;
      }
      // const imageUrl = await fetchImage(subCatData.name); // Removed image fetch
      const subCategory = await SubCategory.create({
        name: subCatData.name,
        description: subCatData.description,
        image: '', // Set initial image empty
        imageSearchTerm: subCatData.imageSearchTerm, // Add search term
        category: parentCategoryId,
        isActive: true,
        order: 0 // Add order if needed
      });
      subCategoryMap.set(subCatData.name, subCategory._id);
      console.log(`Created SubCategory: ${subCategory.name}`);
    }

    // --- Seed SubSubCategories ---
    console.log('Seeding SubSubCategories...');
    const subSubCategoryMap = new Map<string, mongoose.Types.ObjectId>();
    for (const subSubCatData of menuSeedData.subSubCategories) {
      const parentSubCategoryId = subCategoryMap.get(subSubCatData.subCategoryName);
      if (!parentSubCategoryId) {
        console.warn(`Parent subcategory "${subSubCatData.subCategoryName}" not found for sub-subcategory "${subSubCatData.name}". Skipping.`);
        continue;
      }
      // const imageUrl = await fetchImage(subSubCatData.name); // Removed image fetch
      const subSubCategory = await SubSubCategory.create({
        name: subSubCatData.name,
        description: subSubCatData.description,
        image: '', // Set initial image empty
        imageSearchTerm: subSubCatData.imageSearchTerm, // Add search term
        subCategory: parentSubCategoryId,
        isActive: true,
        order: 0 // Add order if needed
      });
      subSubCategoryMap.set(subSubCatData.name, subSubCategory._id);
      console.log(`Created SubSubCategory: ${subSubCategory.name}`);
    }

    // --- Seed Restaurants, Venues, Tables (Existing Logic) ---
    console.log('Seeding Restaurants, Venues, Tables...');
    const restaurantIds: mongoose.Types.ObjectId[] = []; // Store restaurant IDs
    for (const restaurantInfo of restaurantData.restaurants) {
      // Create restaurant
      const restaurant = await Restaurant.create({
        name: restaurantInfo.name,
        locations: [{
          address: restaurantInfo.address,
          coordinates: { latitude: 40.7128, longitude: -74.0060 }
        }],
        schedule: [ /* ... schedule data ... */ ] // Keep existing schedule data
      });
      restaurantIds.push(restaurant._id); // Store ID
      console.log(`Created restaurant: ${restaurant.name}`);

      // Create venues, table types, tables (Keep existing logic)
      const venuePromises = restaurantInfo.venues.map(venueName =>
        Venue.create({ name: venueName, description: `${venueName} at ${restaurantInfo.name}`, capacity: Math.floor(Math.random() * 50) + 50, isActive: true, restaurantId: restaurant._id })
      );
      const venues = await Promise.all(venuePromises);
      console.log(`Created ${venues.length} venues for ${restaurant.name}`);

      const tableTypePromises = restaurantInfo.tableTypes.map(tableTypeInfo =>
        TableType.create({ name: tableTypeInfo.name, description: tableTypeInfo.description, restaurantId: restaurant._id })
      );
      const tableTypes = await Promise.all(tableTypePromises);
      console.log(`Created ${tableTypes.length} table types for ${restaurant.name}`);

      const tablePromises: Promise<mongoose.Document & ITable>[] = [];
      restaurantInfo.tables.forEach((tableNumber, index) => {
        const venueIndex = index % venues.length;
        const tableTypeIndex = index % tableTypes.length;
        tablePromises.push(
          Table.create({ number: tableNumber, venueId: venues[venueIndex]._id, capacity: Math.floor(Math.random() * 6) + 2, tableTypeId: tableTypes[tableTypeIndex]._id, isActive: true, isOccupied: false }) as Promise<mongoose.Document & ITable>
        );
      });
      const tables = await Promise.all(tablePromises);
      console.log(`Created ${tables.length} tables for ${restaurant.name}`);

      // Update restaurant with references
      await Restaurant.findByIdAndUpdate(restaurant._id, {
        venues: venues.map(venue => venue._id),
        tables: tables.map(table => table._id)
      });
    }

    // --- Seed MenuItems ---
    // Note: Menu creation and linking items to menus is now handled by seed-menus.ts
    console.log('Seeding MenuItems...');
    if (restaurantIds.length > 0) {
        const firstRestaurantId = restaurantIds[0]; // Assign items to the first restaurant for simplicity

        for (const itemData of menuSeedData.menuItems) {
            const subSubCatId = subSubCategoryMap.get(itemData.subSubCategoryName);
            if (!subSubCatId) {
                console.warn(`SubSubCategory "${itemData.subSubCategoryName}" not found for item "${itemData.name}". Skipping item creation.`);
                continue;
            }
            // const imageUrl = await fetchImage(itemData.name); // Removed image fetch

            await MenuItem.create({
                name: itemData.name,
                description: itemData.description,
                subSubCategory: subSubCatId, // Link to the actual SubSubCategory
                price: itemData.price,
                image: '', // Set initial image empty
                imageSearchTerm: itemData.imageSearchTerm, // Add search term
                preparationTime: itemData.preparationTime,
                isAvailable: true,
                isActive: true,
                restaurantId: firstRestaurantId, // Assign to restaurant
                // Add modifierGroups, allergens, nutritionalInfo if needed from seed data
                modifierGroups: [],
                allergens: [],
            });
             console.log(`Created MenuItem: ${itemData.name}`);
        }
    } else {
         console.warn('No restaurants seeded, skipping MenuItem creation.');
    }

    console.log('Base seed completed successfully (excluding Menu creation). Run seed:menus next.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
