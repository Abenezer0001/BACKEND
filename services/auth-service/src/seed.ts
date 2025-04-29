import mongoose from 'mongoose';
import { Role } from './models/role.model';
import { Permission } from './models/permission.model';
import User, { UserRole } from './models/user.model';
import bcrypt from 'bcrypt';

/**
 * Seed default roles and permissions for the application
 */
export const seedRolesAndPermissions = async (): Promise<void> => {
  try {
    console.log('Seeding roles and permissions...');
    
    // Define core resources
    const resources = [
      'users',
      'roles',
      'permissions',
      'restaurants',
      'menu_items',
      'categories',
      'orders',
      'tables',
      'payments',
      'loyalty'
    ];
    
    // Define standard actions
    const standardActions = ['create', 'read', 'update', 'delete'];
    
    // Create permissions for each resource and action
    const permissionDocs: any[] = [];
    
    for (const resource of resources) {
      for (const action of standardActions) {
        permissionDocs.push({
          resource,
          action,
          description: `${action} ${resource}`
        });
      }
    }
    
    // Add special permissions
    permissionDocs.push(
      {
        resource: 'restaurants',
        action: 'manage',
        description: 'Full management of restaurant'
      },
      {
        resource: 'orders',
        action: 'process',
        description: 'Process and update order status'
      },
      {
        resource: 'loyalty',
        action: 'configure',
        description: 'Configure loyalty program settings'
      },
      {
        resource: 'analytics',
        action: 'view',
        description: 'View analytics and reports'
      },
      {
        resource: 'system',
        action: 'manage',
        description: 'Manage system settings'
      }
    );
    
    // Check if permissions already exist
    const existingPermissionsCount = await Permission.countDocuments();
    
    let permissions: any[] = [];
    
    if (existingPermissionsCount === 0) {
      // Insert all permissions
      permissions = await Permission.insertMany(permissionDocs);
      console.log(`Created ${permissions.length} permissions`);
    } else {
      // Get existing permissions
      permissions = await Permission.find();
      console.log(`Using ${permissions.length} existing permissions`);
    }
    
    // Create permission maps for easier role creation
    const permissionIdsByResource: Record<string, Record<string, string>> = {};
    
    permissions.forEach(permission => {
      if (!permissionIdsByResource[permission.resource]) {
        permissionIdsByResource[permission.resource] = {};
      }
      permissionIdsByResource[permission.resource][permission.action] = permission._id;
    });
    
    // Check if roles already exist
    const existingRolesCount = await Role.countDocuments();
    
    if (existingRolesCount === 0) {
      // Define roles
      const roles = [
        {
          name: 'system_admin',
          description: 'System administrator with full access',
          permissions: permissions.map(p => p._id) // All permissions
        },
        {
          name: 'restaurant_admin',
          description: 'Restaurant administrator',
          permissions: [
            // Restaurant management
            ...Object.values(permissionIdsByResource['restaurants'] || {}),
            // Menu management
            ...Object.values(permissionIdsByResource['menu_items'] || {}),
            ...Object.values(permissionIdsByResource['categories'] || {}),
            // Order management
            ...Object.values(permissionIdsByResource['orders'] || {}),
            // Table management
            ...Object.values(permissionIdsByResource['tables'] || {}),
            // Loyalty program
            ...Object.values(permissionIdsByResource['loyalty'] || {}),
            // Limited user management (read only)
            permissionIdsByResource['users']?.['read']
          ].filter(Boolean)
        },
        {
          name: 'customer',
          description: 'Regular customer',
          permissions: [
            // Read-only permissions for viewing restaurant info
            permissionIdsByResource['restaurants']?.['read'],
            permissionIdsByResource['menu_items']?.['read'],
            permissionIdsByResource['categories']?.['read'],
            // Own order management
            permissionIdsByResource['orders']?.['create'],
            permissionIdsByResource['orders']?.['read']
          ].filter(Boolean)
        }
      ];
      
      // Create roles
      await Role.insertMany(roles);
      console.log(`Created ${roles.length} roles`);
    } else {
      console.log(`Using ${existingRolesCount} existing roles`);
    }
    
    // Create a default admin user if none exists
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@inseat.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      // Get system_admin role
      const adminRole = await Role.findOne({ name: 'system_admin' });
      
      if (adminRole) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        
        // Create admin user
        const adminUser = new User({
          email: adminEmail,
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          role: UserRole.SYSTEM_ADMIN,
          roles: [adminRole._id],
          isActive: true
        });
        
        await adminUser.save();
        console.log(`Created default admin user: ${adminEmail}`);
      }
    } else {
      console.log(`Using existing admin user: ${adminEmail}`);
    }
    
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding roles and permissions:', error);
    throw error;
  }
};

// Allow direct execution of seed script
if (require.main === module) {
  // Connect to MongoDB
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inseat-auth';
  
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('Connected to MongoDB');
      await seedRolesAndPermissions();
      process.exit(0);
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}
