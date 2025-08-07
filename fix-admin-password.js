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

// Add password comparison method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

async function fixAdminPassword() {
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

    console.log('Found admin user:', {
      id: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
      hasPassword: !!adminUser.password
    });

    // Test current password scenarios
    const testPasswords = [
      'Admin@123456',      // Without space
      'Admin@123456 ',     // With trailing space  
      'admin@123456',      // Lowercase
      'Admin123456'        // Without special char
    ];

    console.log('\nTesting current password hash against various inputs:');
    for (const testPassword of testPasswords) {
      try {
        const isValid = await bcrypt.compare(testPassword, adminUser.password);
        console.log(`"${testPassword}" (length: ${testPassword.length}): ${isValid ? 'MATCH' : 'NO MATCH'}`);
      } catch (error) {
        console.log(`"${testPassword}": ERROR - ${error.message}`);
      }
    }

    // Set the correct password
    const correctPassword = 'Admin@123456'; // No trailing space
    console.log(`\nSetting password to: "${correctPassword}" (length: ${correctPassword.length})`);
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(correctPassword, saltRounds);
    
    // Update user with new password
    adminUser.password = hashedPassword;
    await adminUser.save();
    
    console.log('Password updated successfully');

    // Verify the new password works
    const verification = await bcrypt.compare(correctPassword, hashedPassword);
    console.log('Password verification:', verification ? 'SUCCESS' : 'FAILED');

    // Test the model method too
    const modelVerification = await adminUser.comparePassword(correctPassword);
    console.log('Model method verification:', modelVerification ? 'SUCCESS' : 'FAILED');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdminPassword(); 