const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

async function createInitialAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Define the UserRole enum to match the TypeScript enum
    const UserRole = {
      CUSTOMER: 'customer',
      RESTAURANT_ADMIN: 'restaurant_admin',
      SYSTEM_ADMIN: 'system_admin'
    };

    // Define models directly without schemas to avoid schema conflicts
    const User = mongoose.model('User');
    const Role = mongoose.model('Role');

    // Check if any Role exists
    let sysAdminRole = await Role.findOne({ name: 'sys-admin' });
    let systemAdminRole = await Role.findOne({ name: UserRole.SYSTEM_ADMIN });
    
    if (!sysAdminRole) {
      console.log('Creating sys-admin role...');
      sysAdminRole = await Role.create({
        name: 'sys-admin',
        description: 'System Administrator with full system access'
      });
    }

    if (!systemAdminRole) {
      console.log('Creating system_admin role...');
      systemAdminRole = await Role.create({
        name: UserRole.SYSTEM_ADMIN,
        description: 'System Administrator with full system access'
      });
    }

    // Check if admin already exists for auth-service/user.model.ts
    const existingAuthAdmin = await User.findOne({ email: 'admin@inseat.com' });
    
    if (existingAuthAdmin) {
      console.log('Admin user already exists in auth model:', existingAuthAdmin.email);
      // Update the admin's password for auth model
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.updateOne(
        { _id: existingAuthAdmin._id },
        { 
          $set: { 
            password: hashedPassword,
            isPasswordSet: true,
            // Set both role types to ensure compatibility with both models
            role: UserRole.SYSTEM_ADMIN
          } 
        }
      );
      console.log('Admin password reset and role updated');

      // Make sure the user has both role types
      if (!existingAuthAdmin.roles || existingAuthAdmin.roles.length === 0) {
        await User.updateOne(
          { _id: existingAuthAdmin._id },
          {
            $set: { roles: [sysAdminRole._id] }
          }
        );
        console.log('Added sys-admin role to existing user');
      }
    } else {
      // Create admin user compatible with both models
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create with fields for both user models
      const newAdmin = await User.create({
        email: 'admin@inseat.com',
        firstName: 'System',
        lastName: 'Admin',
        password: hashedPassword,
        // Fields for SystemAdminController model (User.ts)
        roles: [sysAdminRole._id],
        isPasswordSet: true,
        // Fields for AuthController model (user.model.ts)
        role: UserRole.SYSTEM_ADMIN,
        isActive: true
      });
      
      console.log('Admin user created successfully:');
      console.log('Email: admin@inseat.com');
      console.log('Password: admin123');
      console.log('User ID:', newAdmin._id);
    }

    console.log('Script completed successfully');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createInitialAdmin();
