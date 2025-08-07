import mongoose from 'mongoose';
import User, { IUser, UserRole } from './models/user.model';
import { Role } from './models/Role';
import { TokenUtils } from './utils/tokenUtils';
import * as EmailService from './services/EmailService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAdminSetup() {
  try {
    console.log('Starting admin setup test...');
    
    // 1. Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inseat-auth';
    console.log('Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
    
    // 2. Check if sys-admin role exists
    console.log('Checking for sys-admin role...');
    let sysAdminRole = await Role.findOne({ name: 'sys-admin' });
    
    // 3. Check if sys-admin user already exists
    console.log('Checking for existing sys-admin user...');
    const existingSysAdmin = await User.findOne({ 
      roles: sysAdminRole?._id,
      role: UserRole.SYSTEM_ADMIN
    });
    
    if (existingSysAdmin) {
      console.log('System administrator already exists. Exiting setup.');
      await mongoose.disconnect();
      return;
    }
    
    // 4. Create sys-admin role if it doesn't exist
    if (!sysAdminRole) {
      console.log('Creating sys-admin role...');
      sysAdminRole = await Role.create({
        name: 'sys-admin',
        description: 'System Administrator with full access'
      });
    }
    
    // 5. Check if user with this email already exists
    const userEmail = process.env.ADMIN_EMAIL || 'admin@inseat.app';
    console.log(`Checking for user with email: ${userEmail}`);
    
    let user = await User.findOne({ email: userEmail });
    
    // 6. Generate token
    console.log('Generating password reset token...');
    const { token, hashedToken } = TokenUtils.generatePasswordResetToken();
    
    if (!user) {
      // 7. Create sys-admin user
      console.log('Creating sys-admin user...');
      user = await User.create({
        email: userEmail,
        firstName: 'System',
        lastName: 'Administrator',
        role: UserRole.SYSTEM_ADMIN,
        roles: [sysAdminRole._id],
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    } else {
      // 8. Update existing user to become sys-admin
      console.log('Updating existing user to sys-admin...');
      user.roles = user.roles || [];
      if (!user.roles.includes(sysAdminRole._id)) {
        user.roles.push(sysAdminRole._id);
      }
      user.role = UserRole.SYSTEM_ADMIN;
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await user.save();
    }
    
    // 9. Send password setup email
    console.log('Sending password setup email...');
    const emailSent = await EmailService.sendPasswordSetupEmail(
      userEmail,
      'System',
      token,
      true
    );
    
    console.log('Email sent:', emailSent);
    
    console.log('Admin setup test completed successfully');
  } catch (error) {
    console.error('Error in admin setup test:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  } finally {
    // Disconnect from MongoDB
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
}

// Run the test
testAdminSetup();
