import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getUserModel } from '../services/auth-service/src/models/user.model';
import { Role } from '../services/auth-service/src/models/role.model';
import { Permission } from '../services/auth-service/src/models/permission.model';
import Business from '../services/restaurant-service/src/models/Business';
import Restaurant from '../services/restaurant-service/src/models/Restaurant';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/inseat';

// System permissions for comprehensive RBAC
const systemPermissions = [
  // Business management
  { resource: 'business', action: 'create', description: 'Create new businesses' },
  { resource: 'business', action: 'read', description: 'View business information' },
  { resource: 'business', action: 'update', description: 'Update business information' },
  { resource: 'business', action: 'delete', description: 'Delete businesses' },
  { resource: 'business', action: 'manage', description: 'Full business management' },

  // Restaurant management
  { resource: 'restaurant', action: 'create', description: 'Create new restaurants' },
  { resource: 'restaurant', action: 'read', description: 'View restaurant information' },
  { resource: 'restaurant', action: 'update', description: 'Update restaurant information' },
  { resource: 'restaurant', action: 'delete', description: 'Delete restaurants' },
  { resource: 'restaurant', action: 'manage', description: 'Full restaurant management' },

  // User management
  { resource: 'user', action: 'create', description: 'Create new users' },
  { resource: 'user', action: 'read', description: 'View user information' },
  { resource: 'user', action: 'update', description: 'Update user information' },
  { resource: 'user', action: 'delete', description: 'Delete users' },
  { resource: 'user', action: 'assign-role', description: 'Assign roles to users' },
  { resource: 'user', action: 'revoke-role', description: 'Revoke roles from users' },

  // Role management
  { resource: 'role', action: 'create', description: 'Create new roles' },
  { resource: 'role', action: 'read', description: 'View role information' },
  { resource: 'role', action: 'update', description: 'Update role information' },
  { resource: 'role', action: 'delete', description: 'Delete roles' },

  // Menu management
  { resource: 'menu', action: 'create', description: 'Create menu items' },
  { resource: 'menu', action: 'read', description: 'View menu items' },
  { resource: 'menu', action: 'update', description: 'Update menu items' },
  { resource: 'menu', action: 'delete', description: 'Delete menu items' },

  // Category management
  { resource: 'category', action: 'create', description: 'Create categories' },
  { resource: 'category', action: 'read', description: 'View categories' },
  { resource: 'category', action: 'update', description: 'Update categories' },
  { resource: 'category', action: 'delete', description: 'Delete categories' },

  // Order management
  { resource: 'order', action: 'create', description: 'Create orders' },
  { resource: 'order', action: 'read', description: 'View orders' },
  { resource: 'order', action: 'update', description: 'Update orders' },
  { resource: 'order', action: 'delete', description: 'Cancel orders' },
  { resource: 'order', action: 'manage', description: 'Full order management' },

  // Table management
  { resource: 'table', action: 'create', description: 'Create tables' },
  { resource: 'table', action: 'read', description: 'View tables' },
  { resource: 'table', action: 'update', description: 'Update tables' },
  { resource: 'table', action: 'delete', description: 'Delete tables' },

  // Payment management
  { resource: 'payment', action: 'read', description: 'View payments' },
  { resource: 'payment', action: 'process', description: 'Process payments' },
  { resource: 'payment', action: 'refund', description: 'Process refunds' },

  // Analytics and reporting
  { resource: 'analytics', action: 'read', description: 'View analytics and reports' },
  { resource: 'report', action: 'read', description: 'View reports' },
  { resource: 'report', action: 'generate', description: 'Generate reports' },
];

// System roles with their permissions
const systemRoles = [
  {
    name: 'Super Admin',
    description: 'Full system access for platform administrators',
    scope: 'system',
    isSystemRole: true,
    businessId: null,
    permissions: ['*'] // All permissions
  },
  {
    name: 'Platform Support',
    description: 'Limited system access for support team',
    scope: 'system',
    isSystemRole: true,
    businessId: null,
    permissions: [
      'business:read',
      'restaurant:read',
      'user:read',
      'order:read',
      'analytics:read'
    ]
  }
];

// Default business roles template
const businessRoleTemplates = [
  {
    name: 'Business Owner',
    description: 'Full access to business operations',
    scope: 'business',
    isSystemRole: false,
    permissions: [
      'business:read', 'business:update',
      'restaurant:manage',
      'user:create', 'user:read', 'user:update', 'user:assign-role', 'user:revoke-role',
      'role:create', 'role:read', 'role:update', 'role:delete',
      'menu:manage', 'category:manage',
      'order:manage', 'table:manage',
      'payment:read', 'payment:process', 'payment:refund',
      'analytics:read', 'report:read', 'report:generate'
    ]
  },
  {
    name: 'Restaurant Manager',
    description: 'Manage restaurant operations',
    scope: 'business',
    isSystemRole: false,
    permissions: [
      'restaurant:read', 'restaurant:update',
      'menu:create', 'menu:read', 'menu:update', 'menu:delete',
      'category:create', 'category:read', 'category:update', 'category:delete',
      'order:read', 'order:update',
      'table:read', 'table:update',
      'user:read',
      'analytics:read', 'report:read'
    ]
  },
  {
    name: 'Kitchen Staff',
    description: 'Access to kitchen operations',
    scope: 'business',
    isSystemRole: false,
    permissions: [
      'order:read', 'order:update',
      'menu:read'
    ]
  },
  {
    name: 'Server',
    description: 'Access to serving operations',
    scope: 'business',
    isSystemRole: false,
    permissions: [
      'order:create', 'order:read', 'order:update',
      'table:read', 'table:update',
      'menu:read', 'category:read',
      'payment:read'
    ]
  },
  {
    name: 'Cashier',
    description: 'Access to payment operations',
    scope: 'business',
    isSystemRole: false,
    permissions: [
      'order:read',
      'payment:read', 'payment:process', 'payment:refund'
    ]
  }
];

async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function seedPermissions() {
  console.log('🌱 Seeding permissions...');
  
  for (const permissionData of systemPermissions) {
    try {
      const existingPermission = await Permission.findOne({
        resource: permissionData.resource,
        action: permissionData.action
      });

      if (!existingPermission) {
        const permission = new Permission(permissionData);
        await permission.save();
        console.log(`✅ Created permission: ${permissionData.resource}:${permissionData.action}`);
      } else {
        console.log(`⏭️  Permission already exists: ${permissionData.resource}:${permissionData.action}`);
      }
    } catch (error) {
      console.error(`❌ Error creating permission ${permissionData.resource}:${permissionData.action}:`, error);
    }
  }
}

async function seedSystemRoles() {
  console.log('🌱 Seeding system roles...');

  for (const roleData of systemRoles) {
    try {
      const existingRole = await Role.findOne({
        name: roleData.name,
        scope: 'system'
      });

      if (!existingRole) {
        let permissions = [];
        
        if (roleData.permissions.includes('*')) {
          // Super admin gets all permissions
          permissions = await Permission.find({}).select('_id');
        } else {
          // Find specific permissions
          for (const permString of roleData.permissions) {
            const [resource, action] = permString.split(':');
            const permission = await Permission.findOne({ resource, action });
            if (permission) {
              permissions.push(permission._id);
            }
          }
        }

        const role = new Role({
          name: roleData.name,
          description: roleData.description,
          scope: roleData.scope,
          isSystemRole: roleData.isSystemRole,
          businessId: roleData.businessId,
          permissions
        });

        await role.save();
        console.log(`✅ Created system role: ${roleData.name} with ${permissions.length} permissions`);
      } else {
        console.log(`⏭️  System role already exists: ${roleData.name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating system role ${roleData.name}:`, error);
    }
  }
}

async function createSuperAdmin() {
  console.log('🌱 Creating Super Admin user...');

  const UserModel = getUserModel();
  const email = 'superadmin@inseat.com';

  try {
    const existingUser = await UserModel.findOne({ email });

    if (!existingUser) {
      const superAdminRole = await Role.findOne({ name: 'Super Admin', scope: 'system' });
      
      if (!superAdminRole) {
        console.error('❌ Super Admin role not found. Please seed roles first.');
        return;
      }

      const superAdmin = new UserModel({
        email,
        password: 'SuperAdmin123!', // Should be changed in production
        firstName: 'Super',
        lastName: 'Admin',
        role: 'system_admin',
        roles: [superAdminRole._id],
        isPasswordSet: true,
        isActive: true
      });

      await superAdmin.save();
      console.log('✅ Created Super Admin user');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: SuperAdmin123! (Change this in production!)`);
    } else {
      console.log('⏭️  Super Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
  }
}

async function createSampleBusiness() {
  console.log('🌱 Creating sample business...');

  const businessName = 'Sample Restaurant Group';

  try {
    const existingBusiness = await Business.findOne({ name: businessName });

    if (!existingBusiness) {
      const UserModel = getUserModel();
      
      // Create business owner
      const ownerEmail = 'owner@samplerestaurant.com';
      let owner = await UserModel.findOne({ email: ownerEmail });

      if (!owner) {
        owner = new UserModel({
          email: ownerEmail,
          password: 'Owner123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'restaurant_admin',
          isPasswordSet: true,
          isActive: true
        });
        await owner.save();
        console.log('✅ Created business owner user');
      }

      // Create business
      const business = new Business({
        name: businessName,
        legalName: 'Sample Restaurant Group LLC',
        registrationNumber: 'SRG-001',
        contactInfo: {
          email: 'info@samplerestaurant.com',
          phone: '+1-555-0123',
          address: '123 Main St, Sample City, SC 12345'
        },
        ownerId: owner._id,
        isActive: true
      });

      await business.save();

      // Update owner's businessId
      owner.businessId = business._id as mongoose.Types.ObjectId;
      await owner.save();

      console.log('✅ Created sample business');
      console.log(`🏢 Business: ${businessName}`);
      console.log(`👤 Owner: ${ownerEmail} / Owner123!`);

      // Create business-specific roles
      await createBusinessRoles(business._id as mongoose.Types.ObjectId);

      return business;
    } else {
      console.log('⏭️  Sample business already exists');
      return existingBusiness;
    }
  } catch (error) {
    console.error('❌ Error creating sample business:', error);
  }
}

async function createBusinessRoles(businessId: mongoose.Types.ObjectId) {
  console.log('🌱 Creating business-specific roles...');

  for (const roleTemplate of businessRoleTemplates) {
    try {
      const existingRole = await Role.findOne({
        name: roleTemplate.name,
        businessId
      });

      if (!existingRole) {
        // Find permissions for this role
        const permissions = [];
        for (const permString of roleTemplate.permissions) {
          if (permString.includes(':manage')) {
            // For manage permissions, add all CRUD operations
            const resource = permString.split(':')[0];
            const managePerms = await Permission.find({
              resource,
              action: { $in: ['create', 'read', 'update', 'delete'] }
            });
            permissions.push(...managePerms.map(p => p._id));
          } else {
            const [resource, action] = permString.split(':');
            const permission = await Permission.findOne({ resource, action });
            if (permission) {
              permissions.push(permission._id);
            }
          }
        }

        const role = new Role({
          name: roleTemplate.name,
          description: roleTemplate.description,
          scope: roleTemplate.scope,
          isSystemRole: roleTemplate.isSystemRole,
          businessId,
          permissions
        });

        await role.save();
        console.log(`✅ Created business role: ${roleTemplate.name} with ${permissions.length} permissions`);
      } else {
        console.log(`⏭️  Business role already exists: ${roleTemplate.name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating business role ${roleTemplate.name}:`, error);
    }
  }
}

async function createSampleRestaurant(businessId: mongoose.Types.ObjectId) {
  console.log('🌱 Creating sample restaurant...');

  const restaurantName = 'Sample Bistro';

  try {
    const existingRestaurant = await Restaurant.findOne({ name: restaurantName });

    if (!existingRestaurant) {
      const restaurant = new Restaurant({
        name: restaurantName,
        businessId,
        locations: [{
          address: '456 Food St, Sample City, SC 12345',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }],
        venues: [],
        tables: [],
        menu: [{
          category: 'Appetizers',
          items: [{
            name: 'Sample Appetizer',
            description: 'A delicious sample appetizer',
            price: 12.99,
            modifiers: [],
            isAvailable: true,
            schedule: []
          }]
        }],
        schedule: [{
          dayOfWeek: 1,
          openTime: '09:00',
          closeTime: '22:00',
          isOpen: true
        }]
      });

      await restaurant.save();
      console.log('✅ Created sample restaurant');
      console.log(`🍽️  Restaurant: ${restaurantName}`);

      return restaurant;
    } else {
      console.log('⏭️  Sample restaurant already exists');
      return existingRestaurant;
    }
  } catch (error) {
    console.error('❌ Error creating sample restaurant:', error);
  }
}

async function main() {
  console.log('🚀 Starting Business RBAC Seeding...');
  console.log('=====================================');

  await connectDatabase();

  try {
    // Seed in order of dependencies
    await seedPermissions();
    await seedSystemRoles();
    await createSuperAdmin();
    
    const business = await createSampleBusiness();
    if (business) {
      await createSampleRestaurant(business._id as mongoose.Types.ObjectId);
    }

    console.log('');
    console.log('✅ Business RBAC Seeding completed successfully!');
    console.log('=====================================');
    console.log('');
    console.log('🔑 Default accounts created:');
    console.log('  Super Admin: superadmin@inseat.com / SuperAdmin123!');
    console.log('  Business Owner: owner@samplerestaurant.com / Owner123!');
    console.log('');
    console.log('⚠️  IMPORTANT: Change these passwords in production!');
    console.log('');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  main();
}

export default main; 