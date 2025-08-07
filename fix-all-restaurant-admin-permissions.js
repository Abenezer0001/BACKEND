/**
 * Script to add rating permissions to ALL restaurant_admin role instances
 * Run with: node fix-all-restaurant-admin-permissions.js
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
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0';

async function fixAllRestaurantAdminPermissions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Create models
    const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
    const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
    
    // Find ALL restaurant_admin roles (including per-business instances)
    const restaurantAdminRoles = await Role.find({ name: 'restaurant_admin' });
    
    console.log(`Found ${restaurantAdminRoles.length} restaurant_admin role instances:`);
    restaurantAdminRoles.forEach((role, index) => {
      console.log(`  [${index + 1}] ID: ${role._id}, Business: ${role.businessId || 'System'}, Permissions: ${role.permissions?.length || 0}`);
    });
    
    // Get all rating permissions
    const ratingPermissions = await Permission.find({
      $or: [
        { resource: 'rating' },
        { resource: 'review' }
      ]
    });
    
    console.log(`\nFound ${ratingPermissions.length} rating permissions:`);
    ratingPermissions.forEach((perm, index) => {
      console.log(`  [${index + 1}] ${perm.resource}:${perm.action} (${perm._id})`);
    });
    
    // Update each restaurant_admin role instance
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const role of restaurantAdminRoles) {
      const currentPermissions = role.permissions || [];
      const currentPermissionIds = currentPermissions.map(p => p.toString());
      
      // Find which rating permissions are missing
      const missingPermissions = ratingPermissions.filter(perm => 
        !currentPermissionIds.includes(perm._id.toString())
      );
      
      if (missingPermissions.length > 0) {
        console.log(`\n📝 Updating role ${role._id} (Business: ${role.businessId || 'System'})`);
        console.log(`   Adding ${missingPermissions.length} missing permissions:`);
        missingPermissions.forEach(perm => {
          console.log(`     + ${perm.resource}:${perm.action}`);
        });
        
        // Add missing permissions
        await Role.findByIdAndUpdate(role._id, {
          $push: { 
            permissions: { 
              $each: missingPermissions.map(p => p._id) 
            } 
          }
        });
        
        updatedCount++;
      } else {
        console.log(`\n✅ Role ${role._id} already has all rating permissions`);
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 Update Summary:`);
    console.log(`   Updated roles: ${updatedCount}`);
    console.log(`   Skipped roles: ${skippedCount}`);
    console.log(`   Total roles: ${restaurantAdminRoles.length}`);
    
    // Verify the updates
    console.log(`\n🔍 Verification:`);
    const updatedRoles = await Role.find({ name: 'restaurant_admin' }).populate('permissions');
    
    for (const role of updatedRoles) {
      const ratingPerms = role.permissions.filter(p => p.resource === 'rating' || p.resource === 'review');
      console.log(`   Role ${role._id}: ${ratingPerms.length}/8 rating permissions`);
    }
    
  } catch (error) {
    console.error('Error fixing restaurant admin permissions:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixAllRestaurantAdminPermissions();