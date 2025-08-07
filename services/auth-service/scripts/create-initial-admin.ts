import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { UserModel, UserRole, IUser } from '../src/models/user.model';
import { Role } from '../src/models/role.model';
import chalk from 'chalk';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Configuration from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat';
const ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || 'Admin123!@#';
const ADMIN_FIRST_NAME = process.env.INITIAL_ADMIN_FIRST_NAME || 'System';
const ADMIN_LAST_NAME = process.env.INITIAL_ADMIN_LAST_NAME || 'Administrator';

/**
 * Connect to MongoDB
 */
async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(chalk.green('✓ Connected to MongoDB'));
  } catch (error) {
    console.error(chalk.red('✗ MongoDB connection error:'), error);
    process.exit(1);
  }
}

/**
 * Check and create system_admin role if it doesn't exist
 */
async function ensureSystemAdminRole(): Promise<mongoose.Types.ObjectId> {
  try {
    let systemAdminRole = await Role.findOne({ name: 'system_admin' });
    
    if (!systemAdminRole) {
      console.log(chalk.yellow('! System admin role not found, creating...'));
      systemAdminRole = await Role.create({
        name: 'system_admin',
        description: 'System Administrator with full system access',
        permissions: []
      });
      console.log(chalk.green('✓ System admin role created successfully'));
    } else {
      console.log(chalk.green('✓ System admin role already exists'));
    }
    
    return systemAdminRole._id;
  } catch (error) {
    console.error(chalk.red('✗ Error ensuring system admin role:'), error);
    throw error;
  }
}

/**
 * Check if any system admin exists
 */
async function checkExistingSystemAdmin(): Promise<boolean> {
  try {
    // Check for existing system admin
    const existingSystemAdmin = await UserModel.findOne({ role: UserRole.SYSTEM_ADMIN });
    
    if (existingSystemAdmin) {
      console.log(chalk.yellow('! System admin already exists:'), 
        chalk.cyan(`${existingSystemAdmin.email} (${existingSystemAdmin.firstName} ${existingSystemAdmin.lastName})`));
      return true;
    }
    
    // Also check by role reference
    const systemAdminRole = await Role.findOne({ name: 'system_admin' });
    if (systemAdminRole) {
      const userWithSystemAdminRole = await UserModel.findOne({ roles: systemAdminRole._id });
      if (userWithSystemAdminRole) {
        console.log(chalk.yellow('! User with system admin role already exists:'), 
          chalk.cyan(`${userWithSystemAdminRole.email} (${userWithSystemAdminRole.firstName} ${userWithSystemAdminRole.lastName})`));
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(chalk.red('✗ Error checking for existing system admin:'), error);
    throw error;
  }
}

/**
 * Hash password manually (avoiding middleware)
 */
async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error(chalk.red('✗ Error hashing password:'), error);
    throw error;
  }
}

/**
 * Create initial system admin
 */
async function createInitialSystemAdmin(roleId: mongoose.Types.ObjectId): Promise<void> {
  try {
    console.log(chalk.blue('Creating initial system admin...'));
    console.log(chalk.gray(`Email: ${ADMIN_EMAIL}`));
    console.log(chalk.gray(`Name: ${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`));
    
    // Hash password manually to avoid double hashing
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    
    // Create user directly with MongoDB operations to bypass middleware
    const user = await mongoose.connection.collection('users').insertOne({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      role: UserRole.SYSTEM_ADMIN,
      roles: [roleId],
      isActive: true,
      isPasswordSet: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    if (user.acknowledged && user.insertedId) {
      console.log(chalk.green('✓ Initial system admin created successfully'));
      console.log(chalk.green(`✓ User ID: ${user.insertedId}`));
    } else {
      throw new Error('Failed to insert user document');
    }
    
    // Verify password hash to ensure it will work for login
    const createdUser = await UserModel.findOne({ email: ADMIN_EMAIL });
    if (createdUser) {
      const passwordVerified = await bcrypt.compare(ADMIN_PASSWORD, createdUser.password);
      if (passwordVerified) {
        console.log(chalk.green('✓ Password verification successful'));
      } else {
        console.error(chalk.red('✗ Password verification failed! The stored hash will not work for login.'));
      }
    }
  } catch (error) {
    console.error(chalk.red('✗ Error creating system admin:'), error);
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.blue('=== Creating Initial System Admin ==='));
    
    // Connect to database
    await connectToDatabase();
    
    // Check if system admin already exists
    const existingAdmin = await checkExistingSystemAdmin();
    if (existingAdmin) {
      console.log(chalk.yellow('! Initial setup already completed. Exiting...'));
      await mongoose.disconnect();
      return;
    }
    
    // Ensure system_admin role exists
    const roleId = await ensureSystemAdminRole();
    
    // Create initial system admin
    await createInitialSystemAdmin(roleId);
    
    console.log(chalk.green('✓ Initial setup completed successfully!'));
    console.log(chalk.blue('=== Done ==='));
  } catch (error) {
    console.error(chalk.red('✗ Setup failed:'), error);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log(chalk.gray('Disconnected from MongoDB'));
  }
}

// Run the script
main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

