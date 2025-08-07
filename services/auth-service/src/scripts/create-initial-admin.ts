import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User, { UserRole, IUser } from '../models/user.model';
import { Role } from '../models/role.model';
import { TokenUtils } from '../utils/tokenUtils';

// Validate password function
function validatePassword(password: string): boolean {
  // Ensure password meets minimum requirements
  // Check length (minimum 8 characters)
  if (password.length < 8) return false;
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) return false;
  
  // Check for number
  if (!/[0-9]/.test(password)) return false;
  
  // Check for special character
  if (!/[@$!%*?&#]/.test(password)) return false;
  
  return true;
}

// Determine the absolute path to the .env file
const envPath = path.resolve(__dirname, '../../../../.env');
console.log(`Loading environment from: ${envPath}`);

// Load environment variables from the correct absolute path
dotenv.config({ path: envPath });

/**
 * Script to create initial system admin user
 * Reads credentials from environment variables:
 * - INITIAL_SYSADMIN_EMAIL: Email for the system admin
 */
async function createInitialAdmin() {
  // Check environment variables
  const email = process.env.INITIAL_SYSADMIN_EMAIL;
  
  console.log('Environment variables:');
  console.log(`- INITIAL_SYSADMIN_EMAIL: ${email ? 'SET' : 'NOT SET'}`);
  
  if (!email) {
    console.error('Error: INITIAL_SYSADMIN_EMAIL environment variable must be set');
    process.exit(1);
  }

  // Database connection URL (with proper credential handling)
  const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017/inseat';

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('Successfully connected to MongoDB');

    // Start a MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email }).session(session);
      if (existingUser) {
        console.log(`User with email ${email} already exists. Aborting.`);
        await session.abortTransaction();
        await session.endSession();
        process.exit(0);
      }

      // Find or create the system_admin role
      console.log('Setting up system_admin role...');
      let sysAdminRole = await Role.findOne({ name: 'system_admin' }).session(session);
      
      if (!sysAdminRole) {
        console.log('Creating system_admin role...');
        const [createdRole] = await Role.create([{
          name: 'system_admin',
          description: 'System Administrator with full system access',
          permissions: []
        }], { session });
        sysAdminRole = createdRole;
      }

      // Create the system admin user
      console.log('Creating system admin user...');
      
      // Generate password reset token
      console.log('Generating password reset token...');
      const { token, hashedToken } = TokenUtils.generatePasswordResetToken();
      
      // Calculate token expiration
      const tokenExpiration = TokenUtils.getTokenExpirationDate();
      console.log(`Token will expire at: ${tokenExpiration.toISOString()}`);
      
      // Generate frontend URL for password setup
      const frontendUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:5173';
      const setupUrl = `${frontendUrl}/password-setup?token=${token}`;
      
      // Create user with password reset token
      const userDoc = {
        email,
        // Use a temporary password (will be replaced during setup)
        password: 'TEMPORARY_PASSWORD_REQUIRES_SETUP', 
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.SYSTEM_ADMIN,
        roles: [sysAdminRole._id],
        isPasswordSet: false,
        isActive: true,
        passwordResetToken: hashedToken,
        passwordResetExpires: tokenExpiration,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Get the native collection to bypass Mongoose middleware
      const userCollection = mongoose.connection.collection('users');
      const result = await userCollection.insertOne(userDoc, { session });
      
      if (!result.acknowledged) {
        throw new Error('Failed to insert user document');
      }

      await session.commitTransaction();
      console.log('\nSystem admin creation successful:');
      console.log(`- Email: ${email}`);
      console.log(`- User ID: ${result.insertedId}`);
      console.log(`- Role: system_admin`);
      console.log(`- Password Reset Token: ${token}`);
      console.log('\nIMPORTANT: Use this URL to set up the admin password:');
      console.log(`${setupUrl}\n`);
      console.log('WARNING: This URL will expire in 6 hours. Set up the password immediately.');
      
      // Also show API instructions
      console.log('\nAlternatively, use this API request to set up the password:');
      console.log('curl -X POST http://localhost:3001/api/password/setup-password \\');
      console.log('  -H "Content-Type: application/json" \\');
      console.log(`  -d '{"token": "${token}", "password": "YourStrongPassword123!@#"}'`);
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error creating system admin:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
createInitialAdmin().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
