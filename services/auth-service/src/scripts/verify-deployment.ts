import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User, { IUser, UserRole } from '../models/user.model';
import { Role } from '../models/Role';
import * as EmailService from '../services/EmailService';
import { TokenUtils } from '../utils/tokenUtils';

dotenv.config();

interface VerificationResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

async function verifyEnvironmentVariables(): Promise<VerificationResult> {
  const requiredVars = [
    'EMAIL_SERVICE',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'FRONTEND_URL',
    'PASSWORD_RESET_TOKEN_EXPIRES',
    'MONGODB_URI',
    'JWT_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    return {
      status: 'error',
      message: 'Missing required environment variables',
      details: missingVars
    };
  }

  return {
    status: 'success',
    message: 'All required environment variables are set'
  };
}

async function verifyRequiredRoles(): Promise<VerificationResult> {
  try {
    const adminRole = await Role.findOne({ name: 'admin' });
    const sysAdminRole = await Role.findOne({ name: 'sys-admin' });

    if (!adminRole || !sysAdminRole) {
      return {
        status: 'error',
        message: 'Required roles are missing',
        details: {
          admin: !!adminRole,
          sysAdmin: !!sysAdminRole
        }
      };
    }

    return {
      status: 'success',
      message: 'All required roles exist'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Error checking roles',
      details: error
    };
  }
}

async function verifyEmailConfiguration(): Promise<VerificationResult> {
  try {
    const isValid = await EmailService.verifyEmailConnection();
    
    if (!isValid) {
      return {
        status: 'error',
        message: 'Email configuration verification failed'
      };
    }

    return {
      status: 'success',
      message: 'Email configuration verified successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Error verifying email configuration',
      details: error
    };
  }
}

async function verifyTokenGeneration(): Promise<VerificationResult> {
  try {
    const { token, hashedToken } = TokenUtils.generatePasswordResetToken();
    
    if (!token || !hashedToken) {
      return {
        status: 'error',
        message: 'Token generation failed'
      };
    }

    return {
      status: 'success',
      message: 'Token generation working correctly'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Error testing token generation',
      details: error
    };
  }
}

async function verifyDatabaseIndexes(): Promise<VerificationResult> {
  try {
    const indexes = await User.collection.indexes();
    const requiredIndexes = ['email_1', 'passwordResetToken_1'];
    
    const missingIndexes = requiredIndexes.filter(
      required => !indexes.some(index => index.name === required)
    );

    if (missingIndexes.length > 0) {
      return {
        status: 'error',
        message: 'Missing required database indexes',
        details: missingIndexes
      };
    }

    return {
      status: 'success',
      message: 'All required database indexes exist'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Error checking database indexes',
      details: error
    };
  }
}

/**
 * Check that a system admin user exists and is properly set up
 */
async function checkAndSetupSystemAdmin(): Promise<VerificationResult> {
  try {
    // Find sys-admin role
    const sysAdminRole = await Role.findOne({ name: 'sys-admin' });
    
    if (!sysAdminRole) {
      return {
        status: 'error',
        message: 'System admin role not found'
      };
    }
    
    // Find system admin user
    const sysAdminUser = await User.findOne({
      roles: sysAdminRole._id,
      role: UserRole.SYSTEM_ADMIN
    });

    if (!sysAdminUser) {
      return {
        status: 'error',
        message: 'System admin account not found'
      };
    }

    return {
      status: 'success',
      message: 'System admin account exists'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Error checking system admin account',
      details: error
    };
  }
}

async function main() {
  console.log('🔍 Starting deployment verification...\n');

  const verifications = [
    {
      name: 'Environment Variables',
      check: verifyEnvironmentVariables
    },
    {
      name: 'Required Roles',
      check: verifyRequiredRoles
    },
    {
      name: 'Email Configuration',
      check: verifyEmailConfiguration
    },
    {
      name: 'Token Generation',
      check: verifyTokenGeneration
    },
    {
      name: 'Database Indexes',
      check: verifyDatabaseIndexes
    },
    {
      name: 'System Admin Account',
      check: checkAndSetupSystemAdmin
    }
  ];

  let hasErrors = false;

  for (const verification of verifications) {
    const result = await verification.check();
    
    console.log(`\n📋 Checking ${verification.name}...`);
    
    if (result.status === 'success') {
      console.log(`✅ ${result.message}`);
    } else if (result.status === 'warning') {
      console.log(`⚠️ ${result.message}`);
      if (result.details) {
        console.log('Details:', result.details);
      }
    } else {
      console.error(`❌ ${result.message}`);
      if (result.details) {
        console.error('Details:', result.details);
      }
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n❌ Deployment verification failed.');
    console.error('Please fix the errors above and run verification again.');
    process.exit(1);
  } else {
    console.log('\n✅ All verification checks passed!');
    console.log('The system is correctly deployed and ready to use.');
  }
}

// Run verification
main().catch(error => {
  console.error('Verification script error:', error);
  process.exit(1);
});

