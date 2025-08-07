import mongoose from 'mongoose';
import { Permission, IPermission } from '../services/auth-service/src/models/permission.model';
import { Role, IRole } from '../services/auth-service/src/models/role.model';

// Permission seed data
const PERMISSION_SEED_DATA = [
  // Business permissions
  { resource: 'business', action: 'create', description: 'Create new businesses' },
  { resource: 'business', action: 'read', description: 'View business list and details' },
  { resource: 'business', action: 'update', description: 'Edit business information and settings' },
  { resource: 'business', action: 'delete', description: 'Delete businesses' },

  // Restaurant permissions
  { resource: 'restaurant', action: 'create', description: 'Create new restaurants' },
  { resource: 'restaurant', action: 'read', description: 'View restaurant list and details' },
  { resource: 'restaurant', action: 'update', description: 'Edit restaurant information' },
  { resource: 'restaurant', action: 'delete', description: 'Delete restaurants' },

  // User permissions
  { resource: 'user', action: 'create', description: 'Create new users' },
  { resource: 'user', action: 'read', description: 'View user list and profiles' },
  { resource: 'user', action: 'update', description: 'Edit user information and roles' },
  { resource: 'user', action: 'delete', description: 'Delete users' },

  // Menu permissions
  { resource: 'menu', action: 'create', description: 'Create new menus' },
  { resource: 'menu', action: 'read', description: 'View menu list and details' },
  { resource: 'menu', action: 'update', description: 'Edit menu structure and settings' },
  { resource: 'menu', action: 'delete', description: 'Delete menus' },

  // Menu Item permissions
  { resource: 'menuitem', action: 'create', description: 'Create new menu items' },
  { resource: 'menuitem', action: 'read', description: 'View menu item list and details' },
  { resource: 'menuitem', action: 'update', description: 'Edit menu item details and pricing' },
  { resource: 'menuitem', action: 'delete', description: 'Delete menu items' },

  // Category permissions
  { resource: 'category', action: 'create', description: 'Create new categories' },
  { resource: 'category', action: 'read', description: 'View category list and details' },
  { resource: 'category', action: 'update', description: 'Edit category information' },
  { resource: 'category', action: 'delete', description: 'Delete categories' },

  // Order permissions
  { resource: 'order', action: 'create', description: 'Create new orders' },
  { resource: 'order', action: 'read', description: 'View order list and details' },
  { resource: 'order', action: 'update', description: 'Edit order status and information' },
  { resource: 'order', action: 'delete', description: 'Cancel/delete orders' },

  // Analytics permissions
  { resource: 'analytics', action: 'read', description: 'View analytics dashboards and reports' },

  // Settings permissions
  { resource: 'settings', action: 'read', description: 'View system settings' },
  { resource: 'settings', action: 'update', description: 'Modify system settings and configurations' }
];

// Role seed data with pre-assigned permissions
const ROLE_SEED_DATA = [
  {
    name: 'system_admin',
    description: 'Full system access with all permissions',
    permissions: PERMISSION_SEED_DATA.map(p => p), // All permissions
    isSystemRole: true,
    scope: 'system' as const
  },
  {
    name: 'restaurant_admin', 
    description: 'Full access to own business/restaurant operations',
    permissions: PERMISSION_SEED_DATA.filter(p => 
      !['business'].includes(p.resource) || p.action === 'read' || p.action === 'update'
    ),
    isSystemRole: false,
    scope: 'business' as const
  },
  {
    name: 'customer',
    description: 'Basic customer access for ordering',
    permissions: PERMISSION_SEED_DATA.filter(p => 
      (['order', 'menu', 'menuitem', 'category'].includes(p.resource) && ['create', 'read'].includes(p.action))
    ),
    isSystemRole: false,
    scope: 'business' as const
  }
];

async function seedPermissions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing permissions and roles
    await Permission.deleteMany({});
    await Role.deleteMany({});
    console.log('Cleared existing permissions and roles');

    // Insert permissions
    const insertedPermissions: IPermission[] = [];
    for (const permData of PERMISSION_SEED_DATA) {
      const permission = new Permission({
        resource: permData.resource,
        action: permData.action,
        description: permData.description
      });
      const savedPermission = await permission.save();
      insertedPermissions.push(savedPermission);
    }
    console.log(`Inserted ${insertedPermissions.length} permissions`);

    // Insert roles with permission references
    for (const roleData of ROLE_SEED_DATA) {
      const rolePermissions = roleData.permissions.map(permData => {
        const foundPerm = insertedPermissions.find(p => 
          p.resource === permData.resource && p.action === permData.action
        );
        if (!foundPerm) {
          throw new Error(`Permission not found: ${permData.resource}:${permData.action}`);
        }
        return foundPerm._id;
      });
      
      const role = new Role({
        name: roleData.name,
        description: roleData.description,
        permissions: rolePermissions,
        isSystemRole: roleData.isSystemRole,
        scope: roleData.scope
      });
      
      await role.save();
      console.log(`Created role: ${roleData.name} with ${rolePermissions.length} permissions`);
    }

    console.log('Permissions and roles seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedPermissions();
}

export { PERMISSION_SEED_DATA, ROLE_SEED_DATA, seedPermissions }; 