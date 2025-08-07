import mongoose from 'mongoose';
import { Role } from '../models/Role';
import * as EmailService from '../services/EmailService';
import dotenv from 'dotenv';

dotenv.config();

async function validateEnvironment() {
  const requiredEnvVars = [
    'EMAIL_SERVICE',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'FRONTEND_URL',
    'PASSWORD_RESET_TOKEN_EXPIRES'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    return false;
  }
  
  console.log('✅ Environment variables validated');
  return true;
}

async function validateEmailConfig() {
  try {
    const isValid = await EmailService.verifyEmailConnection();
    if (isValid) {
      console.log('✅ Email service configuration verified');
      return true;
    } else {
      console.error('❌ Email service configuration failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying email configuration:', error);
    return false;
  }
}

async function initializeRoles() {
  try {
    // Check if roles exist
    const adminRole = await Role.findOne({ name: 'admin' });
    const sysAdminRole = await Role.findOne({ name: 'sys-admin' });

    // Create roles if they don't exist
    if (!adminRole) {
      await Role.create({
        name: 'admin',
        description: 'Administrator with system management capabilities',
        permissions: []
      });
      console.log('✅ Created admin role');
    } else {
      console.log('ℹ️ Admin role already exists');
    }

    if (!sysAdminRole) {
      await Role.create({
        name: 'sys-admin',
        description: 'System Administrator with full system access',
        permissions: []
      });
      console.log('✅ Created sys-admin role');
    } else {
      console.log('ℹ️ Sys-admin role already exists');
    }

    return true;
  } catch (error) {
    console.error('❌ Error initializing roles:', error);
    return false;
  }
}

async function validateDatabaseIndexes() {
  try {
    const User = mongoose.model('User');
    const indexes = await User.collection.indexes();
    
    const requiredIndexes = ['email_1', 'passwordResetToken_1'];
    const missingIndexes = requiredIndexes.filter(
      required => !indexes.some(index => index.name === required)
    );

    if (missingIndexes.length > 0) {
      console.error('❌ Missing required indexes:', missingIndexes.join(', '));
      return false;
    }

    console.log('✅ Database indexes verified');
    return true;
  } catch (error) {
    console.error('❌ Error verifying database indexes:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting initialization and validation...\n');

  try {
    // Validate environment variables
    if (!await validateEnvironment()) {
      process.exit(1);
    }

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat');
    console.log('✅ Database connection established');

    // Initialize roles
    if (!await initializeRoles()) {
      process.exit(1);
    }

    // Validate database indexes
    if (!await validateDatabaseIndexes()) {
      process.exit(1);
    }

    // Validate email configuration
    if (!await validateEmailConfig()) {
      process.exit(1);
    }

    console.log('\n✨ Initialization and validation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
main();

