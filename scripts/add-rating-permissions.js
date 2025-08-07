/**
 * Script to add rating permissions to restaurant_admin role
 * Run with: node scripts/add-rating-permissions.js
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
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";

async function addRatingPermissions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Create models
    const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
    const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
    
    // Find restaurant_admin role
    const restaurantAdminRole = await Role.findOne({ name: 'restaurant_admin' });
    
    if (!restaurantAdminRole) {
      console.error('Restaurant admin role not found!');
      process.exit(1);
    }
    
    console.log(`Found restaurant_admin role with ID: ${restaurantAdminRole._id}`);
    
    // Define rating permissions needed
    const ratingPermissions = [
      { resource: 'rating', action: 'create', description: 'Create rating resources' },
      { resource: 'rating', action: 'read', description: 'Read rating resources' },
      { resource: 'rating', action: 'update', description: 'Update rating resources' },
      { resource: 'rating', action: 'delete', description: 'Delete rating resources' },
      { resource: 'review', action: 'create', description: 'Create review resources' },
      { resource: 'review', action: 'read', description: 'Read review resources' },
      { resource: 'review', action: 'update', description: 'Update review resources' },
      { resource: 'review', action: 'delete', description: 'Delete review resources' }
    ];
    
    // Get or create permission IDs for rating resources
    const permissionIds = [];
    
    for (const perm of ratingPermissions) {
      // Find existing permission or create new one
      let permission = await Permission.findOne({ resource: perm.resource, action: perm.action });
      
      if (!permission) {
        console.log(`Creating missing permission: ${perm.resource}:${perm.action}`);
        permission = await Permission.create({
          resource: perm.resource,
          action: perm.action,
          description: perm.description
        });
      } else {
        console.log(`Permission already exists: ${perm.resource}:${perm.action}`);
      }
      
      permissionIds.push(permission._id);
    }
    
    console.log(`Found/created ${permissionIds.length} rating permissions`);
    
    // Get current permissions
    const currentPermissions = restaurantAdminRole.permissions || [];
    console.log(`Current permissions count: ${currentPermissions.length}`);
    
    // Check which rating permissions are already assigned
    const existingRatingPermissions = [];
    for (const permId of currentPermissions) {
      const perm = await Permission.findById(permId);
      if (perm && (perm.resource === 'rating' || perm.resource === 'review')) {
        existingRatingPermissions.push(perm._id);
      }
    }
    
    console.log(`Existing rating permissions: ${existingRatingPermissions.length}`);
    
    // Add only new permissions (avoid duplicates)
    const newPermissions = permissionIds.filter(pid => 
      !currentPermissions.some(existing => existing.toString() === pid.toString())
    );
    
    if (newPermissions.length === 0) {
      console.log('✅ All rating permissions already exist for restaurant_admin role!');
    } else {
      // Update the restaurant_admin role with new permissions
      await Role.findByIdAndUpdate(restaurantAdminRole._id, {
        $push: { permissions: { $each: newPermissions } }
      });
      
      console.log(`✅ Successfully added ${newPermissions.length} new rating permissions to restaurant_admin role!`);
    }
    
    // Verify final permissions
    const updatedRole = await Role.findById(restaurantAdminRole._id).populate('permissions');
    const ratingPerms = updatedRole.permissions.filter(p => p.resource === 'rating' || p.resource === 'review');
    
    console.log('\n📋 Rating permissions now assigned to restaurant_admin:');
    ratingPerms.forEach((perm, index) => {
      console.log(`  [${index + 1}] ${perm.resource}:${perm.action} - ${perm.description}`);
    });
    
    console.log(`\nTotal permissions for restaurant_admin: ${updatedRole.permissions.length}`);
    
  } catch (error) {
    console.error('Error adding rating permissions:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update
addRatingPermissions();