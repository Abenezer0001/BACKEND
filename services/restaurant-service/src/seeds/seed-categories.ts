import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file located three levels up (Inseat-backend)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Import Models
import Restaurant from '../models/Restaurant'; // Models are in the parent directory relative to seeds/
import Category from '../models/Category';

const seedCategories = async () => {
  const dbUri = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

  if (!dbUri) {
    console.error('Error: MONGODB_URI is not defined in the .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    console.log('MongoDB connected successfully for category seeding.');

    // --- Find Prerequisite Data ---
    const sampleRestaurant = await Restaurant.findOne().exec(); // Find any restaurant
    if (!sampleRestaurant) {
      console.error('Seeding Error: No Restaurants found. Cannot seed categories without a restaurant.');
      await mongoose.disconnect();
      process.exit(1);
    }
    const restaurantId = sampleRestaurant._id;
    console.log(`Using Restaurant ID: ${restaurantId} for categories.`);

    // --- Seed Category Data ---

    console.log(`Clearing existing Category data for restaurant ${restaurantId}...`);
    await Category.deleteMany({ restaurantId: restaurantId });

    const categoriesToCreate = [
      {
        name: 'Appetizers',
        description: 'Starters to begin your meal.',
        restaurantId: restaurantId,
        isActive: true,
        order: 1,
        imageSearchTerm: 'restaurant appetizer variety', // Added search term
        image: '', // Added placeholder image field
      },
      {
        name: 'Main Courses',
        description: 'Our signature main dishes.',
        restaurantId: restaurantId,
        isActive: true,
        order: 2,
        imageSearchTerm: 'gourmet main course plating', // Added search term
        image: '', // Added placeholder image field
      },
      {
        name: 'Desserts',
        description: 'Sweet treats to end your meal.',
        restaurantId: restaurantId,
        isActive: true,
        order: 3,
        imageSearchTerm: 'decadent chocolate dessert', // Added search term
        image: '', // Added placeholder image field
      },
      {
        name: 'Beverages',
        description: 'Drinks including soft drinks, juices, and water.',
        restaurantId: restaurantId,
        isActive: true,
        order: 4,
        imageSearchTerm: 'refreshing iced beverages assortment', // Added search term
        image: '', // Added placeholder image field
      },
       {
        name: 'Salads',
        description: 'Fresh and healthy salad options.',
        restaurantId: restaurantId,
        isActive: true,
        order: 5,
        imageSearchTerm: 'fresh garden salad bowl', // Added search term
        image: '', // Added placeholder image field
      }
    ];

    console.log('Inserting new Category data...');
    const createdCategories = await Category.insertMany(categoriesToCreate);
    console.log(`Successfully seeded ${createdCategories.length} categories for restaurant ${restaurantId}.`);

  } catch (error) {
    console.error('Error during category database seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

// Run the seeding function
seedCategories();
