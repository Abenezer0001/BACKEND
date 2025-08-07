/**
 * Script to update restaurant_admin permissions to add kitchen, schedule, and cashier management access
 * Run with: node scripts/update-restaurant-admin-permissions.js
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
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inseat';

async function updatePermissions() {
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
    
    // Define all the missing resources that restaurant_admin should have access to
    const additionalResources = [
      'business', 'restaurant', 'user', 'menu', 'menuitem', 'category', 
      'subcategory', 'subsubcategory', 'modifier', 'table', 'venue', 
      'zone', 'order', 'customer', 'inventory', 'invoice', 'analytics', 
      'settings', 'promotion', 'kitchen', 'cashier', 'schedule'
    ];
    
    const actions = ['create', 'read', 'update', 'delete'];
    
    // Get or create permission IDs for the new resources
    const permissionIds = [];
    
    for (const resource of additionalResources) {
      for (const action of actions) {
        // Find existing permission or create new one
        let permission = await Permission.findOne({ resource, action });
        
        if (!permission) {
          console.log(`Creating missing permission: ${resource}:${action}`);
          permission = await Permission.create({
            resource,
            action,
            description: `${action} ${resource}`
          });
        }
        
        permissionIds.push(permission._id);
      }
    }
    
    // Special permissions for restaurant admin
    const specialPermissions = [
      { resource: 'business', action: 'read' },
      { resource: 'business', action: 'update' },
      { resource: 'restaurant', action: 'manage' },
      { resource: 'order', action: 'process' },
      { resource: 'analytics', action: 'view' }
    ];
    
    for (const sp of specialPermissions) {
      let permission = await Permission.findOne({ resource: sp.resource, action: sp.action });
      
      if (!permission) {
        console.log(`Creating special permission: ${sp.resource}:${sp.action}`);
        permission = await Permission.create({
          resource: sp.resource,
          action: sp.action,
          description: `${sp.action} ${sp.resource}`
        });
      }
      
      permissionIds.push(permission._id);
    }
    
    console.log(`Found/created ${permissionIds.length} permissions for restaurant_admin`);
    
    // Get current permissions
    const currentPermissions = restaurantAdminRole.permissions || [];
    console.log(`Current permissions count: ${currentPermissions.length}`);
    
    // Merge permissions (avoid duplicates)
    const allPermissions = [...new Set([...currentPermissions.map(p => p.toString()), ...permissionIds.map(p => p.toString())])];
    
    console.log(`Total permissions after merge: ${allPermissions.length}`);
    
    // Update the restaurant_admin role with all permissions
    await Role.findByIdAndUpdate(restaurantAdminRole._id, {
      permissions: allPermissions
    });
    
    console.log('✅ Successfully updated restaurant_admin role permissions!');
    console.log(`Added ${allPermissions.length - currentPermissions.length} new permissions`);
    
    // Log some of the key permissions for verification
    const promotionPermissions = await Permission.find({ resource: 'promotion' });
    console.log(`Promotion permissions available: ${promotionPermissions.map(p => `${p.resource}:${p.action}`).join(', ')}`);
    
    const venuePermissions = await Permission.find({ resource: 'venue' });
    console.log(`Venue permissions available: ${venuePermissions.map(p => `${p.resource}:${p.action}`).join(', ')}`);
    
  } catch (error) {
    console.error('Error updating permissions:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update
updatePermissions();
