import mongoose from 'mongoose';
import Business from '../models/Business';
import Restaurant from '../models/Restaurant';
import { getUserModel } from '../../../auth-service/src/models/user.model';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat';

async function seedBusiness() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const UserModel = getUserModel();

    // Create Cinema City business
    const businessData = {
      name: 'Cinema City',
      legalName: 'Cinema City Entertainment Ltd.',
      registrationNumber: 'CC-2024-001',
      contactInfo: {
        phone: '+1-555-0123',
        email: 'admin@cinemacity.com',
        address: '123 Entertainment Blvd, Downtown, CA 90210, USA'
      },
      isActive: true
    };

    // Check if Cinema City business already exists
    let business = await Business.findOne({ name: 'Cinema City' });
    
    if (!business) {
      // Find or create business owner
      let owner = await UserModel.findOne({ email: 'admin@cinemacity.com' });
      
      if (!owner) {
        console.log('Creating business owner...');
        owner = new UserModel({
          email: 'admin@cinemacity.com',
          password: 'temp-password-123', // Will need to be reset
          firstName: 'Cinema',
          lastName: 'Admin',
          role: 'restaurant_admin',
          isPasswordSet: false,
          roles: []
        });
        await owner.save();
        console.log('Business owner created:', owner.email);
      }

      // Create the business
      business = new Business({
        ...businessData,
        ownerId: owner._id
      });
      
      await business.save();
      console.log('Business created:', business.name);

      // Update owner's businessId
      owner.businessId = business._id as any;
      await owner.save();
      console.log('Owner updated with businessId');
    } else {
      console.log('Cinema City business already exists');
    }

    // Find all existing restaurants and associate them with Cinema City business
    const restaurants = await Restaurant.find({ businessId: { $exists: false } });
    
    if (restaurants.length > 0) {
      console.log(`Found ${restaurants.length} restaurants without business association`);
      
      for (const restaurant of restaurants) {
        restaurant.businessId = business._id as any;
        await restaurant.save();
        console.log(`Associated restaurant "${restaurant.name}" with Cinema City business`);
      }
    } else {
      console.log('All restaurants already have business associations');
    }

    // Also check for restaurants with null businessId
    const nullBusinessRestaurants = await Restaurant.find({ businessId: null });
    
    if (nullBusinessRestaurants.length > 0) {
      console.log(`Found ${nullBusinessRestaurants.length} restaurants with null businessId`);
      
      for (const restaurant of nullBusinessRestaurants) {
        restaurant.businessId = business._id as any;
        await restaurant.save();
        console.log(`Fixed restaurant "${restaurant.name}" businessId association`);
      }
    }

    // Display final summary
    const totalRestaurants = await Restaurant.countDocuments({ businessId: business._id });
    console.log(`\n=== SEEDING COMPLETE ===`);
    console.log(`Business: ${business.name}`);
    console.log(`Business ID: ${business._id}`);
    console.log(`Owner: ${business.ownerId}`);
    console.log(`Total associated restaurants: ${totalRestaurants}`);
    
    const allRestaurants = await Restaurant.find({ businessId: business._id }).select('name');
    allRestaurants.forEach((restaurant, index) => {
      console.log(`  ${index + 1}. ${restaurant.name}`);
    });

  } catch (error) {
    console.error('Error seeding business:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding
if (require.main === module) {
  seedBusiness();
}

export default seedBusiness; 