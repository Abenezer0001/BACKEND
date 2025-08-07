const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define schemas
const UserSchema = new mongoose.Schema({
  email: String,
  role: String,
  roles: [mongoose.Schema.Types.ObjectId],
  businessId: mongoose.Schema.Types.ObjectId
}, { collection: 'users' });

const RoleSchema = new mongoose.Schema({
  name: String,
  scope: String,
  businessId: mongoose.Schema.Types.ObjectId,
  permissions: [mongoose.Schema.Types.ObjectId]
}, { collection: 'roles' });

const User = mongoose.model('User', UserSchema);
const Role = mongoose.model('Role', RoleSchema);

async function checkRoles() {
  try {
    console.log('\n=== Checking Admin User ===');
    const adminUser = await User.findOne({ email: 'admin@inseat.com' });
    console.log('Admin User:', JSON.stringify(adminUser, null, 2));

    console.log('\n=== Checking Restaurant Admin User ===');
    const restaurantAdmin = await User.findOne({ email: 'abenezer.t@achievengine.com' });
    console.log('Restaurant Admin User:', JSON.stringify(restaurantAdmin, null, 2));

    console.log('\n=== Checking All Roles ===');
    const roles = await Role.find({});
    console.log('Available Roles:', JSON.stringify(roles, null, 2));

    // Fix the admin user if needed
    if (adminUser && (!adminUser.roles || adminUser.roles.length === 0)) {
      console.log('\n=== Fixing Admin User Roles ===');
      
      // Find system_admin role
      let systemAdminRole = await Role.findOne({ name: 'system_admin' });
      
      if (!systemAdminRole) {
        // Create system_admin role
        systemAdminRole = new Role({
          name: 'system_admin',
          scope: 'global',
          permissions: []
        });
        await systemAdminRole.save();
        console.log('Created system_admin role:', systemAdminRole);
      }

      // Update admin user with the role
      adminUser.roles = [systemAdminRole._id];
      await adminUser.save();
      console.log('Updated admin user with system_admin role');
    }

    // Fix the restaurant admin user if needed
    if (restaurantAdmin && (!restaurantAdmin.roles || restaurantAdmin.roles.length === 0)) {
      console.log('\n=== Fixing Restaurant Admin User Roles ===');
      
      // Find restaurant_admin role
      let restaurantAdminRole = await Role.findOne({ name: 'restaurant_admin' });
      
      if (!restaurantAdminRole) {
        // Create restaurant_admin role
        restaurantAdminRole = new Role({
          name: 'restaurant_admin',
          scope: 'business',
          permissions: []
        });
        await restaurantAdminRole.save();
        console.log('Created restaurant_admin role:', restaurantAdminRole);
      }

      // Update restaurant admin user with the role
      restaurantAdmin.roles = [restaurantAdminRole._id];
      await restaurantAdmin.save();
      console.log('Updated restaurant admin user with restaurant_admin role');
    }

    console.log('\n=== Final User States ===');
    const finalAdminUser = await User.findOne({ email: 'admin@inseat.com' });
    console.log('Final Admin User:', JSON.stringify(finalAdminUser, null, 2));

    const finalRestaurantAdmin = await User.findOne({ email: 'abenezer.t@achievengine.com' });
    console.log('Final Restaurant Admin User:', JSON.stringify(finalRestaurantAdmin, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkRoles(); 