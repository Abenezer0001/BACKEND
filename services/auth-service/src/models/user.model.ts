import mongoose, { Schema, Document, Model, Connection } from 'mongoose';
// Use require for CommonJS modules
const bcrypt = require('bcrypt');
import { IRole } from './role.model';
import { IPermission } from './permission.model';

export enum UserRole {
  CUSTOMER = 'customer',
  RESTAURANT_ADMIN = 'restaurant_admin',
  SYSTEM_ADMIN = 'system_admin',
  KITCHEN_STAFF = 'kitchen_staff',
  CASHIER = 'cashier'
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  // NEW: Business-level fields
  businessId?: mongoose.Types.ObjectId; // Link to Business (for Business Owners and employees)
  // RBAC fields
  roles: mongoose.Types.ObjectId[] | IRole[];
  restaurantId?: mongoose.Types.ObjectId; // Kept for specific restaurant assignments
  // NEW: Venue and Kitchen assignments
  assignedVenues?: mongoose.Types.ObjectId[]; // For cashiers and waiters
  assignedKitchens?: mongoose.Types.ObjectId[]; // For kitchen staff
  // Work-related fields
  workSchedule?: {
    shifts: {
      dayOfWeek: number; // 0-6 (Sunday to Saturday)
      startTime: string; // HH:mm format
      endTime: string; // HH:mm format
      isActive: boolean;
    }[];
    overtimeApproved: boolean;
  };
  phoneNumber?: string;
  profileImage?: string;
  isActive: boolean;
  lastLogin?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // OAuth fields
  googleId?: string;
  // Password management fields
  isPasswordSet: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  // Demo account fields
  isDemo?: boolean;
  demoExpiresAt?: Date;
  // Email verification
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  // Profile information
  profile?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
  // Admin fields
  createdBy?: string;
  // Methods
  isRestaurantAdmin(): boolean;
  isSystemAdmin(): boolean;
  isBusinessOwner(): boolean;
  isKitchenStaff(): boolean;
  isCashier(): boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Export the schema separately for flexibility
export const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: false,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CUSTOMER
  },
  // RBAC fields
  roles: [{
    type: Schema.Types.ObjectId,
    ref: 'Role'
  }],
  // NEW: Business-level fields
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  // NEW: Venue and Kitchen assignments
  assignedVenues: [{
    type: Schema.Types.ObjectId,
    ref: 'Venue'
  }],
  assignedKitchens: [{
    type: Schema.Types.ObjectId,
    ref: 'Kitchen'
  }],
  // Work-related fields
  workSchedule: {
    shifts: [{
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        required: true
      },
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    overtimeApproved: {
      type: Boolean,
      default: false
    }
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  deletedAt: {
    type: Date,
    default: null
  },
  // OAuth fields
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  // Password management fields
  isPasswordSet: {
    type: Boolean,
    default: false
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  // Demo account fields
  isDemo: {
    type: Boolean,
    default: false
  },
  demoExpiresAt: {
    type: Date,
    default: null
  },
  // Email verification fields
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  // Profile information
  profile: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    }
  },
  // Admin fields
  createdBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Add methods
UserSchema.methods.isRestaurantAdmin = function(this: IUser): boolean {
  return this.role === UserRole.RESTAURANT_ADMIN;
};

UserSchema.methods.isSystemAdmin = function(this: IUser): boolean {
  return this.role === UserRole.SYSTEM_ADMIN;
};

UserSchema.methods.isBusinessOwner = function(this: IUser): boolean {
  // A user is a business owner if they have a businessId and are referenced as the ownerId of that business
  // This method will need to be used with additional business lookup in practice
  return !!this.businessId;
};

UserSchema.methods.isKitchenStaff = function(this: IUser): boolean {
  return this.role === UserRole.KITCHEN_STAFF;
};

UserSchema.methods.isCashier = function(this: IUser): boolean {
  return this.role === UserRole.CASHIER;
};

UserSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Middleware to hash password before saving
UserSchema.pre('save', async function(this: IUser, next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Create indexes for efficient querying
// Create indexes only once when the model is first defined
if (!mongoose.models.User) {
  console.log('Creating indexes for User model...');
  UserSchema.index({ email: 1 });
  UserSchema.index({ googleId: 1 }, { sparse: true });
  UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
  UserSchema.index({ businessId: 1 }); // NEW: Business-level indexing
  console.log('User model indexes created successfully');
}

// Ensure the model initialization happens only once
// This singleton pattern prevents model overwrite errors
let userModelInstance: Model<IUser> | null = null;

/**
 * Get the User model instance, creating it only once
 * This function returns the model without connection checks
 * @returns The User model instance
 */
export const getUserModel = (): Model<IUser> => {
  try {
    // Initialize model only once (singleton pattern)
    if (!userModelInstance) {
      console.log('Initializing User model...');
      userModelInstance = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
      console.log('User model initialized successfully');
    }
    
    return userModelInstance;
  } catch (error: any) {
    console.error(`Failed to get User model: ${error.message}`);
    throw new Error(`User model initialization failed: ${error.message}`);
  }
};

// For backward compatibility and exported constants
const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// Export the model without re-exporting the already exported functions
export { UserModel };
export default UserModel;

/**
 * Helper functions for database operations
 */

/**
 * Find a user by email
 * @param email The email to search for
 * @returns The user document or null if not found
 */
export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  const model = getUserModel();
  return await model.findOne({ email: email.toLowerCase() }).exec();
};

/**
 * Find customers by restaurant ID
 * @param restaurantId The restaurant ID to search for
 * @returns Array of customers belonging to the restaurant
 */
export const findCustomersByRestaurantId = async (restaurantId: string): Promise<IUser[]> => {
  const model = getUserModel();
  return model.find({
    restaurantId,
    role: UserRole.CUSTOMER
  }).exec();
};

/**
 * Find a user by ID
 * @param id The user ID to search for
 * @returns The user document or null if not found
 */
export const findUserById = async (id: string): Promise<IUser | null> => {
  // If this is a device ID, don't try to look it up in the User model
  if (id.startsWith('device_')) {
    console.log('Found guest user with device ID:', id);
    // Return a minimal guest user object for device IDs
    // Create a guest user with minimal required fields
    // Cast through unknown to avoid TypeScript errors while preserving runtime functionality
    return {
      _id: id,
      email: `${id}@guest.inseat.com`,
      role: 'guest',
      firstName: 'Guest',
      lastName: 'User',
      password: '', // Empty password for guest users
      roles: ['guest'],
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add any required IUser interface methods as needed
      comparePassword: async () => false, // Guest users can't log in with password
    } as unknown as IUser;
  }

  // For regular user IDs, look them up in the database
  try {
    const model = getUserModel();
    return await model.findById(id).exec();
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
};

/**
 * Create a new user
 * @param userData The user data to create
 * @returns The created user document
 */
export const createUser = async (userData: Partial<IUser>): Promise<IUser> => {
  const model = getUserModel();
  const user = new model(userData);
  return await user.save();
};
