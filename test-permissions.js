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

async function checkPermissions() {
  try {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', UserSchema);
    const Role = mongoose.model('Role', RoleSchema);
    const Permission = mongoose.model('Permission', PermissionSchema);

    // Find the system admin user
    console.log('Searching for admin user...');
    const user = await User.findOne({ email: 'admin@inseat.com' })
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions'
        }
      });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('- ID:', user._id.toString());
    console.log('- Email:', user.email);
    console.log('- Role (legacy):', user.role);
    console.log('- Roles count:', user.roles?.length || 0);
    console.log('- Direct permissions count:', user.directPermissions?.length || 0);
    
    if (user.roles && user.roles.length > 0) {
      console.log('\n📋 Roles and their permissions:');
      user.roles.forEach((role, index) => {
        console.log(`\n[${index + 1}] Role: ${role.name}`);
        console.log(`    - ID: ${role._id}`);
        console.log(`    - Scope: ${role.scope}`);
        console.log(`    - System Role: ${role.isSystemRole}`);
        console.log(`    - Permissions: ${role.permissions?.length || 0}`);
        
        if (role.permissions && role.permissions.length > 0) {
          role.permissions.forEach((perm, i) => {
            console.log(`      [${i + 1}] ${perm.resource}:${perm.action} (${perm._id})`);
          });
        } else {
          console.log('      ⚠️  No permissions found for this role');
        }
      });
    } else {
      console.log('❌ No roles assigned to user');
    }

    // Also check what roles exist in the database
    console.log('\n📊 All roles in database:');
    const allRoles = await Role.find().populate('permissions');
    allRoles.forEach((role, index) => {
      console.log(`[${index + 1}] ${role.name} (${role._id}) - ${role.permissions?.length || 0} permissions`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPermissions(); 