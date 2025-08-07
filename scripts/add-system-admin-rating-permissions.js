/**
 * Script to add rating permissions to system_admin role
 * Run with: node scripts/add-system-admin-rating-permissions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Define the schemas directly in JavaScript since we can't import TypeScript modules
const PermissionSchema = new mongoose.Schema({
  resource: { type: String, required: true, trim: true },
  action: { type: String, required: true, trim: true },
  description: { type: String, required: false }
}, { timestamps: true });

PermissionSchema.index({ resource: 1, action: 1 }, { unique: true });

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: false },
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
  isSystemRole: { type: Boolean, default: false },
  scope: { type: String, enum: ['system', 'business'], default: 'business' }
}, { timestamps: true });

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

async function addSystemAdminRatingPermissions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Create models
    const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
    const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
    
    // Find system_admin role
    const systemAdminRole = await Role.findOne({ name: 'system_admin' });
    
    if (!systemAdminRole) {
      console.error('System admin role not found!');
      process.exit(1);
    }
    
    console.log(`Found system_admin role with ID: ${systemAdminRole._id}`);
    
    // Find all rating permissions that were just created
    const ratingPermissions = await Permission.find({
      $or: [
        { resource: 'rating' },
        { resource: 'review' }
      ]
    });
    
    console.log(`Found ${ratingPermissions.length} rating permissions`);
    
    // Get current permissions
    const currentPermissions = systemAdminRole.permissions || [];
    console.log(`Current permissions count: ${currentPermissions.length}`);
    
    // Add only new permissions (avoid duplicates)
    const newPermissions = ratingPermissions
      .map(p => p._id)
      .filter(pid => !currentPermissions.some(existing => existing.toString() === pid.toString()));
    
    if (newPermissions.length === 0) {
      console.log('✅ All rating permissions already exist for system_admin role!');
    } else {
      // Update the system_admin role with new permissions
      await Role.findByIdAndUpdate(systemAdminRole._id, {
        $push: { permissions: { $each: newPermissions } }
      });
      
      console.log(`✅ Successfully added ${newPermissions.length} new rating permissions to system_admin role!`);
    }
    
    // Verify final permissions
    const updatedRole = await Role.findById(systemAdminRole._id).populate('permissions');
    const ratingPerms = updatedRole.permissions.filter(p => p.resource === 'rating' || p.resource === 'review');
    
    console.log('\n📋 Rating permissions now assigned to system_admin:');
    ratingPerms.forEach((perm, index) => {
      console.log(`  [${index + 1}] ${perm.resource}:${perm.action} - ${perm.description}`);
    });
    
    console.log(`\nTotal permissions for system_admin: ${updatedRole.permissions.length}`);
    
  } catch (error) {
    console.error('Error adding rating permissions:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update
addSystemAdminRatingPermissions();