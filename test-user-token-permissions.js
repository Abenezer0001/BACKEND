const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

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

async function testUserPermissions() {
  try {
    const MONGO_URL = 'mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', UserSchema);
    const Role = mongoose.model('Role', RoleSchema);
    const Permission = mongoose.model('Permission', PermissionSchema);

    // Find the admin user
    console.log('\n🔍 Looking for admin users...');
    const adminUsers = await User.find({ 
      $or: [
        { role: 'system_admin' },
        { role: 'restaurant_admin' },
        { email: { $regex: /admin/i } }
      ]
    }).limit(5);

    console.log(`Found ${adminUsers.length} admin users:`);
    
    for (const user of adminUsers) {
      console.log(`\n👤 User: ${user.email} (${user.role})`);
      console.log(`   - ID: ${user._id}`);
      console.log(`   - Roles: ${user.roles?.length || 0}`);
      console.log(`   - Business: ${user.businessId || 'None'}`);

      // Get user permissions through roles
      if (user.roles && user.roles.length > 0) {
        const userRoles = await Role.find({ _id: { $in: user.roles } })
          .populate('permissions');
        
        let allPermissions = [];
        userRoles.forEach(role => {
          console.log(`   📋 Role: ${role.name} (${role.permissions?.length || 0} permissions)`);
          if (role.permissions) {
            allPermissions.push(...role.permissions);
          }
        });

        // Check for rating permissions
        const ratingPermissions = allPermissions.filter(p => 
          p.resource === 'rating' || p.resource === 'review'
        );
        
        console.log(`   🌟 Rating/Review permissions: ${ratingPermissions.length}`);
        ratingPermissions.forEach(perm => {
          console.log(`      - ${perm.resource}:${perm.action}`);
        });

        // Test specific permission
        const hasRatingRead = allPermissions.some(p => 
          p.resource === 'rating' && p.action === 'read'
        );
        console.log(`   ✅ Has rating:read permission: ${hasRatingRead}`);
      } else {
        console.log(`   ⚠️  No roles assigned to user`);
      }
    }

    // Also check what a fresh JWT token would contain
    console.log('\n🔑 JWT Token Test:');
    const testUser = adminUsers.find(u => u.role === 'restaurant_admin') || adminUsers[0];
    if (testUser) {
      console.log(`Testing JWT generation for: ${testUser.email}`);
      
      // This is what would be in a JWT token (simplified)
      const tokenPayload = {
        userId: testUser._id,
        id: testUser._id,
        email: testUser.email,
        role: testUser.role,
        businessId: testUser.businessId
      };
      
      console.log('Token payload would contain:', tokenPayload);
      console.log('Note: JWT tokens do NOT contain permissions - they are fetched via /auth/me/permissions API call');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testUserPermissions();