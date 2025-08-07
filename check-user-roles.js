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

async function checkUserRoles() {
  try {
    await mongoose.connect('mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0');
    
    const userId = '68444757fb4c856668bf18ee';
    
    // Get user with populated roles
    const user = await User.findById(userId).populate('roles');
    console.log('User details:', JSON.stringify({
      _id: user._id,
      email: user.email,
      role: user.role,
      rolesArray: user.roles
    }, null, 2));
    
    // Check if restaurant_admin role exists
    const restaurantAdminRole = await Role.findOne({ name: 'restaurant_admin' });
    console.log('\nRestaurant admin role exists:', !!restaurantAdminRole);
    if (restaurantAdminRole) {
      console.log('Restaurant admin role details:', JSON.stringify({
        _id: restaurantAdminRole._id,
        name: restaurantAdminRole.name,
        description: restaurantAdminRole.description,
        businessId: restaurantAdminRole.businessId,
        isSystemRole: restaurantAdminRole.isSystemRole,
        scope: restaurantAdminRole.scope,
        permissionsCount: restaurantAdminRole.permissions?.length || 0
      }, null, 2));
    }
    
    // Check all roles to see what's available
    const allRoles = await Role.find({}).select('name description businessId isSystemRole scope');
    console.log('\nAll available roles:', JSON.stringify(allRoles, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserRoles(); 