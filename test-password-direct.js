const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
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

async function testPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Register model
    const User = mongoose.model('User', UserSchema);

    // Find admin user
    const adminEmail = 'admin@inseat.com';
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log('Admin user not found');
      process.exit(1);
    }

    console.log('Testing password validation...');
    
    // Test the exact combinations
    const testCases = [
      { password: 'Admin@123456', description: 'Correct password (12 chars)' },
      { password: 'Admin@123456 ', description: 'Password with trailing space (13 chars)' },
      { password: 'admin@inseat.com', description: 'Wrong password (email)' },
      { password: 'incorrect', description: 'Wrong password' }
    ];

    for (const testCase of testCases) {
      try {
        const isValid = await bcrypt.compare(testCase.password, adminUser.password);
        console.log(`✓ "${testCase.password}" (${testCase.password.length} chars) - ${testCase.description}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      } catch (error) {
        console.log(`✗ "${testCase.password}" - ${testCase.description}: ERROR - ${error.message}`);
      }
    }

    console.log('\n🎯 Summary:');
    console.log('✅ Correct password: "Admin@123456" (without trailing space)');
    console.log('❌ Frontend sending: "Admin@123456 " (with trailing space)');
    console.log('\n💡 Solution: Frontend should trim the password input or backend should trim received passwords');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPassword(); 