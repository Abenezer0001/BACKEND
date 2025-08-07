import mongoose from 'mongoose';
import Business from '../models/Business';
import Restaurant from '../models/Restaurant';
import { getUserModel } from '../../../auth-service/src/models/user.model';

const MONGO_URI = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0"';

async function seedBusinessWithRestaurants() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const UserModel = getUserModel();

    // Get or create the system admin user
    let systemAdmin = await UserModel.findOne({ email: 'admin@inseat.com' });
    
    if (!systemAdmin) {
      console.log('System admin not found, creating...');
      systemAdmin = new UserModel({
        email: 'admin@inseat.com',
        password: 'Admin@123456',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'system_admin',
        isPasswordSet: true,
        isActive: true
      });
      await systemAdmin.save();
      console.log('Created new system admin:', systemAdmin.email);
    } else {
      console.log('System admin found:', systemAdmin.email);
    }

    // Get all existing restaurants
    const existingRestaurants = await Restaurant.find({});
    console.log(`Found ${existingRestaurants.length} existing restaurants`);

    // Create or update Cinema City business
    const businessData = {
      name: 'Cinema City',
      legalName: 'Cinema City Entertainment Ltd.',
      registrationNumber: 'CC-2024-001',
      contactInfo: {
        phone: '+971-4-555-0123',
        email: 'admin@cinemacity.com',
        address: '123 Entertainment Boulevard, Dubai, UAE'
      },
      ownerId: systemAdmin._id,
      isActive: true,
      settings: {
        multiRestaurant: true,
        allowStaffManagement: true,
        requireApprovalForNewStaff: true,
        defaultCurrency: 'AED',
        defaultTimezone: 'Asia/Dubai'
      }
    };

    // Create or find the business
    let business = await Business.findOne({ name: 'Cinema City' });
    
    if (business) {
      // Update existing business
      business = await Business.findByIdAndUpdate(business._id, businessData, { new: true });
      console.log('Updated existing Cinema City business:', business!._id);
    } else {
      // Create new business
      business = new Business(businessData);
      await business.save();
      console.log('Created new Cinema City business:', business._id);
    }

    if (!business) {
      throw new Error('Failed to create or update business');
    }

    // Associate all existing restaurants with the business
    const restaurantIds = existingRestaurants.map(r => r._id);
    
    if (restaurantIds.length > 0) {
      const updateResult = await Restaurant.updateMany(
        { _id: { $in: restaurantIds } },
        { $set: { businessId: business._id } }
      );
      
      console.log(`Associated ${updateResult.modifiedCount} restaurants with Cinema City business`);
      
      // Note: restaurants field should be virtual populated, not directly set
      console.log('Updated business with restaurant references via businessId field');
    }

    // Create a business owner role user (different from system admin)
    const ownerData = {
      email: 'owner@cinemacity.com',
      password: 'Admin@123456',
      firstName: 'Cinema',
      lastName: 'Owner',
      role: 'restaurant_admin',
      businessId: business._id,
      isPasswordSet: true,
      isActive: true
    };

    let businessOwner = await UserModel.findOne({ email: 'owner@cinemacity.com' });
    
    if (businessOwner) {
      // Update existing owner
      businessOwner = await UserModel.findByIdAndUpdate(businessOwner._id, {
        ...ownerData,
        password: businessOwner.password // Keep existing password
      }, { new: true });
      console.log('Updated existing business owner:', businessOwner!.email);
    } else {
      // Create new business owner
      businessOwner = new UserModel(ownerData);
      await businessOwner.save();
      console.log('Created new business owner:', businessOwner.email);
    }

    if (!businessOwner) {
      throw new Error('Failed to create or update business owner');
    }

    // Update business with owner reference
    business.ownerId = businessOwner._id;
    await business.save();

    console.log('\n=== Business Setup Complete ===');
    console.log('Business ID:', business._id);
    console.log('Business Name:', business.name);
    console.log('Owner ID:', businessOwner._id);
    console.log('Owner Email:', businessOwner.email);
    console.log('Associated Restaurants:', restaurantIds.length);
    console.log('Restaurant IDs:', restaurantIds.slice(0, 3).map(id => id.toString()));
    
    console.log('\n=== Test Credentials ===');
    console.log('System Admin: admin@inseat.com / Admin@123456');
    console.log('Business Owner: owner@cinemacity.com / Admin@123456');
    console.log('Restaurant Admin: abenezer.t@achievengine.com / Admin@123456');

  } catch (error) {
    console.error('Error seeding business:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedBusinessWithRestaurants(); 