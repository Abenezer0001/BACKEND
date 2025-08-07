const mongoose = require('mongoose');

// Define schemas
const PermissionSchema = new mongoose.Schema({
  resource: String,
  action: String,
  description: String
}, { timestamps: true });

const RoleSchema = new mongoose.Schema({
  name: String,
  description: String,
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  isSystemRole: { type: Boolean, default: false },
  scope: { type: String, enum: ['system', 'business'], default: 'business' }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  role: String,
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  directPermissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

async function debugUserRoleAssignment() {
  try {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', UserSchema);
    const Role = mongoose.model('Role', RoleSchema);
    const Permission = mongoose.model('Permission', PermissionSchema);

    // Get the main restaurant_admin role
    const mainRole = await Role.findOne({ name: 'restaurant_admin' }).populate('permissions');
    console.log(`\n📋 Main restaurant_admin role:`);
    console.log(`   ID: ${mainRole._id}`);
    console.log(`   Permissions: ${mainRole.permissions.length}`);
    console.log(`   Business: ${mainRole.businessId || 'System'}`);
    
    const roleRatingPerms = mainRole.permissions.filter(p => p.resource === 'rating' || p.resource === 'review');
    console.log(`   Rating permissions: ${roleRatingPerms.length}`);
    
    // Debug: Check raw permissions array
    console.log(`   Raw permissions array length: ${mainRole.permissions ? mainRole.permissions.length : 'null'}`);
    
    // Check if it's a populate issue
    const roleWithoutPopulate = await Role.findOne({ name: 'restaurant_admin' });
    console.log(`   Raw permissions IDs count: ${roleWithoutPopulate.permissions ? roleWithoutPopulate.permissions.length : 'null'}`);
    
    // Force reload to avoid cache
    const freshRole = await Role.findById(mainRole._id).populate('permissions');
    const freshRatingPerms = freshRole.permissions.filter(p => p.resource === 'rating' || p.resource === 'review');
    console.log(`   Fresh role rating permissions: ${freshRatingPerms.length}`);

    // Find a specific user to test
    const testUser = await User.findOne({ role: 'restaurant_admin' }).populate({
      path: 'roles',
      populate: {
        path: 'permissions'
      }
    });

    if (testUser) {
      console.log(`\n👤 Test User: ${testUser.email}`);
      console.log(`   User ID: ${testUser._id}`);
      console.log(`   Role (legacy field): ${testUser.role}`);
      console.log(`   Roles array: ${testUser.roles?.length || 0} roles`);
      
      if (testUser.roles && testUser.roles.length > 0) {
        testUser.roles.forEach((role, index) => {
          console.log(`     [${index + 1}] Role: ${role.name} (${role._id})`);
          console.log(`         Permissions: ${role.permissions?.length || 0}`);
          
          const userRoleRatingPerms = role.permissions?.filter(p => p.resource === 'rating' || p.resource === 'review') || [];
          console.log(`         Rating permissions: ${userRoleRatingPerms.length}`);
          
          // Check if this role is the main restaurant_admin role
          const isMainRole = role._id.toString() === mainRole._id.toString();
          console.log(`         Is main role: ${isMainRole}`);
        });
      } else {
        console.log(`   ⚠️  User has no roles in roles array!`);
        console.log(`   This user needs to be assigned to the restaurant_admin role.`);
        
        // Fix this user by assigning them to the main role
        console.log(`\n🔧 Fixing user role assignment...`);
        await User.findByIdAndUpdate(testUser._id, {
          $push: { roles: mainRole._id }
        });
        console.log(`   ✅ Added main restaurant_admin role to user`);
      }
      
      // Test the RbacService-like permission check
      console.log(`\n🧪 Simulating permission check for rating:read:`);
      let hasRatingRead = false;
      
      if (testUser.roles && testUser.roles.length > 0) {
        for (const role of testUser.roles) {
          if (role.permissions) {
            hasRatingRead = role.permissions.some(p => p.resource === 'rating' && p.action === 'read');
            if (hasRatingRead) break;
          }
        }
      }
      
      console.log(`   Result: ${hasRatingRead}`);
    }

    // Check all restaurant_admin users and fix missing role assignments
    console.log(`\n🔍 Checking all restaurant_admin users...`);
    const allRestaurantAdmins = await User.find({ role: 'restaurant_admin' });
    
    let fixedUsers = 0;
    for (const user of allRestaurantAdmins) {
      if (!user.roles || user.roles.length === 0) {
        console.log(`   Fixing user: ${user.email}`);
        await User.findByIdAndUpdate(user._id, {
          $push: { roles: mainRole._id }
        });
        fixedUsers++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixedUsers} users with missing role assignments`);
    console.log(`📊 Total restaurant_admin users: ${allRestaurantAdmins.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugUserRoleAssignment();