const mongoose = require('mongoose');

// Define schemas
const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  role: String,
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
});

const roleSchema = new mongoose.Schema({
  name: String,
  description: String,
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  isSystemRole: Boolean,
  scope: String
});

const User = mongoose.model('User', userSchema);
const Role = mongoose.model('Role', roleSchema);

async function fixUserRoles() {
  try {
    await mongoose.connect('mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0');
    
    // Find all restaurant admin users who don't have roles assigned
    const restaurantAdminUsers = await User.find({ 
      role: 'restaurant_admin',
      $or: [
        { roles: { $exists: false } },
        { roles: { $size: 0 } }
      ]
    });
    
    console.log(`Found ${restaurantAdminUsers.length} restaurant admin users without proper role assignments`);
    
    // Find the restaurant_admin role
    const restaurantAdminRole = await Role.findOne({ name: 'restaurant_admin' });
    if (!restaurantAdminRole) {
      console.error('restaurant_admin role not found!');
      process.exit(1);
    }
    
    console.log(`Restaurant admin role ID: ${restaurantAdminRole._id}`);
    
    // Assign the role to each user
    for (const user of restaurantAdminUsers) {
      console.log(`Assigning restaurant_admin role to user: ${user.email} (${user._id})`);
      
      await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { roles: restaurantAdminRole._id } },
        { new: true }
      );
      
      console.log(`✅ Successfully assigned role to ${user.email}`);
    }
    
    // Do the same for system_admin users
    const systemAdminUsers = await User.find({ 
      role: 'system_admin',
      $or: [
        { roles: { $exists: false } },
        { roles: { $size: 0 } }
      ]
    });
    
    console.log(`\nFound ${systemAdminUsers.length} system admin users without proper role assignments`);
    
    const systemAdminRole = await Role.findOne({ name: 'system_admin' });
    if (!systemAdminRole) {
      console.error('system_admin role not found!');
    } else {
      console.log(`System admin role ID: ${systemAdminRole._id}`);
      
      for (const user of systemAdminUsers) {
        console.log(`Assigning system_admin role to user: ${user.email} (${user._id})`);
        
        await User.findByIdAndUpdate(
          user._id,
          { $addToSet: { roles: systemAdminRole._id } },
          { new: true }
        );
        
        console.log(`✅ Successfully assigned role to ${user.email}`);
      }
    }
    
    console.log('\n🎉 Role assignment completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserRoles(); 