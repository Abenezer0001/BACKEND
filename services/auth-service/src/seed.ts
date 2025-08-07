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
    
    // Check if seeding should be skipped
    const skipSeeding = process.env.SKIP_ROLE_PERMISSION_SEEDING === 'true';
    if (skipSeeding) {
      console.log('Skipping role and permission seeding due to SKIP_ROLE_PERMISSION_SEEDING=true');
      return;
    }
    
    // Define core resources - UPDATED to include all frontend expected resources
    const resources = [
      // Original resources
      'users',
      'roles',
      'permissions',
      'restaurants',
      'menu_items',
      'categories',
      'orders',
      'tables',
      'payments',
      'loyalty',
      // Additional resources that frontend expects
      'business',
      'restaurant',
      'user',
      'menu',
      'menuitem',
      'category',
      'subcategory',
      'subsubcategory',
      'modifier',
      'table',
      'venue',
      'zone',
      'order',
      'customer',
      'inventory',
      'invoice',
      'analytics',
      'settings',
      'promotion',
      'kitchen',
      'cashier',
      'schedule'
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
        resource: 'restaurant',
        action: 'manage',
        description: 'Full management of restaurant'
      },
      {
        resource: 'orders',
        action: 'process',
        description: 'Process and update order status'
      },
      {
        resource: 'order',
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
            // Restaurant management (original)
            ...Object.values(permissionIdsByResource['restaurants'] || {}),
            // Restaurant management (new)
            ...Object.values(permissionIdsByResource['restaurant'] || {}),
            // Business read access
            permissionIdsByResource['business']?.['read'],
            permissionIdsByResource['business']?.['update'],
            // Menu management (original)
            ...Object.values(permissionIdsByResource['menu_items'] || {}),
            // Menu management (new)
            ...Object.values(permissionIdsByResource['menu'] || {}),
            ...Object.values(permissionIdsByResource['menuitem'] || {}),
            // Category management (original)
            ...Object.values(permissionIdsByResource['categories'] || {}),
            // Category management (new)
            ...Object.values(permissionIdsByResource['category'] || {}),
            ...Object.values(permissionIdsByResource['subcategory'] || {}),
            ...Object.values(permissionIdsByResource['subsubcategory'] || {}),
            ...Object.values(permissionIdsByResource['modifier'] || {}),
            // Order management (original)
            ...Object.values(permissionIdsByResource['orders'] || {}),
            // Order management (new)
            ...Object.values(permissionIdsByResource['order'] || {}),
            // Table management (original)
            ...Object.values(permissionIdsByResource['tables'] || {}),
            // Table and venue management (new)
            ...Object.values(permissionIdsByResource['table'] || {}),
            ...Object.values(permissionIdsByResource['venue'] || {}),
            ...Object.values(permissionIdsByResource['zone'] || {}),
            // Customer management
            ...Object.values(permissionIdsByResource['customer'] || {}),
            // Inventory management
            ...Object.values(permissionIdsByResource['inventory'] || {}),
            // Invoice management
            ...Object.values(permissionIdsByResource['invoice'] || {}),
            // Analytics access
            ...Object.values(permissionIdsByResource['analytics'] || {}),
            // Settings access
            ...Object.values(permissionIdsByResource['settings'] || {}),
            // PROMOTION management - THIS WAS MISSING!
            ...Object.values(permissionIdsByResource['promotion'] || {}),
            // Kitchen management
            ...Object.values(permissionIdsByResource['kitchen'] || {}),
            // Cashier management
            ...Object.values(permissionIdsByResource['cashier'] || {}),
            // Schedule management
            ...Object.values(permissionIdsByResource['schedule'] || {}),
            // Loyalty program
            ...Object.values(permissionIdsByResource['loyalty'] || {}),
            // Limited user management (original)
            permissionIdsByResource['users']?.['read'],
            // Limited user management (new)
            permissionIdsByResource['user']?.['read'],
            permissionIdsByResource['user']?.['create'],
            permissionIdsByResource['user']?.['update']
          ].filter(Boolean)
        },
        {
          name: 'customer',
          description: 'Regular customer',
          permissions: [
            // Read-only permissions for viewing restaurant info (original)
            permissionIdsByResource['restaurants']?.['read'],
            permissionIdsByResource['menu_items']?.['read'],
            permissionIdsByResource['categories']?.['read'],
            // Read-only permissions for viewing restaurant info (new)
            permissionIdsByResource['restaurant']?.['read'],
            permissionIdsByResource['menu']?.['read'],
            permissionIdsByResource['menuitem']?.['read'],
            permissionIdsByResource['category']?.['read'],
            permissionIdsByResource['promotion']?.['read'],
            // Own order management (original)
            permissionIdsByResource['orders']?.['create'],
            permissionIdsByResource['orders']?.['read'],
            // Own order management (new)
            permissionIdsByResource['order']?.['create'],
            permissionIdsByResource['order']?.['read']
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
    // Note: If you're experiencing MongoDB timeouts with this seeding process,
    // set the environment variable SKIP_ROLE_PERMISSION_SEEDING=true
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
