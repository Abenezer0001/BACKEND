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

async function testRatingPermissions() {
  try {
    const MONGO_URL = 'mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    const Role = mongoose.model('Role', RoleSchema);
    const Permission = mongoose.model('Permission', PermissionSchema);

    // Check restaurant_admin role
    console.log('\n🔍 Checking restaurant_admin role permissions...');
    const restaurantAdminRole = await Role.findOne({ name: 'restaurant_admin' })
      .populate('permissions');

    if (restaurantAdminRole) {
      const ratingPermissions = restaurantAdminRole.permissions.filter(p => 
        p.resource === 'rating' || p.resource === 'review'
      );
      
      console.log(`✅ Found restaurant_admin role with ${restaurantAdminRole.permissions.length} total permissions`);
      console.log(`📊 Rating/Review permissions: ${ratingPermissions.length}`);
      
      ratingPermissions.forEach((perm, index) => {
        console.log(`  [${index + 1}] ${perm.resource}:${perm.action}`);
      });
    } else {
      console.log('❌ restaurant_admin role not found');
    }

    // Check system_admin role
    console.log('\n🔍 Checking system_admin role permissions...');
    const systemAdminRole = await Role.findOne({ name: 'system_admin' })
      .populate('permissions');

    if (systemAdminRole) {
      const ratingPermissions = systemAdminRole.permissions.filter(p => 
        p.resource === 'rating' || p.resource === 'review'
      );
      
      console.log(`✅ Found system_admin role with ${systemAdminRole.permissions.length} total permissions`);
      console.log(`📊 Rating/Review permissions: ${ratingPermissions.length}`);
      
      ratingPermissions.forEach((perm, index) => {
        console.log(`  [${index + 1}] ${perm.resource}:${perm.action}`);
      });
    } else {
      console.log('❌ system_admin role not found');
    }

    // Check all rating permissions in database
    console.log('\n🔍 All rating permissions in database:');
    const allRatingPerms = await Permission.find({
      $or: [
        { resource: 'rating' },
        { resource: 'review' }
      ]
    });

    allRatingPerms.forEach((perm, index) => {
      console.log(`  [${index + 1}] ${perm.resource}:${perm.action} (${perm._id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testRatingPermissions();