const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

// Define User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'system_admin', 'restaurant_admin', 'manager', 'staff', 'customer'],
    default: 'customer'
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: false
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  directPermissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Define Business Schema
const BusinessSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settings: {
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

async function fixUserBusiness() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Register models
    const User = mongoose.model('User', UserSchema);
    const Business = mongoose.model('Business', BusinessSchema);

    // Find our restaurant admin user
    const userId = '68444757fb4c856668bf18ee';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('Current user:', {
      id: user._id,
      email: user.email,
      role: user.role,
      businessId: user.businessId
    });

    // Check if user already has a business
    if (user.businessId) {
      console.log('User already has a businessId:', user.businessId);
      process.exit(0);
    }

    // Look for existing businesses
    const existingBusinesses = await Business.find().limit(10);
    console.log('Existing businesses:', existingBusinesses.map(b => ({ id: b._id, name: b.name })));

    let business;
    if (existingBusinesses.length > 0) {
      // Use the first existing business
      business = existingBusinesses[0];
      console.log('Using existing business:', business.name);
    } else {
      // Create a new business
      business = new Business({
        name: 'Test Restaurant',
        description: 'Test restaurant for RBAC testing',
        ownerId: user._id,
        settings: {
          currency: 'USD',
          timezone: 'UTC'
        }
      });
      await business.save();
      console.log('Created new business:', business.name);
    }

    // Assign business to user
    user.businessId = business._id;
    await user.save();

    console.log('Updated user with businessId:', business._id);
    console.log('User can now access RBAC features');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserBusiness(); 