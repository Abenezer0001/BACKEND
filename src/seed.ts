import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file located in the parent directory (Inseat-backend)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import Models (adjust paths based on your actual project structure)
// Assuming models are within the restaurant-service
import Restaurant from '../services/restaurant-service/src/models/Restaurant';
import Venue from '../services/restaurant-service/src/models/Venue';
import Category from '../services/restaurant-service/src/models/Category';
import Menu from '../services/restaurant-service/src/models/Menu';

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