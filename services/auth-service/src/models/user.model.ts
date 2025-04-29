import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { IRole } from './role.model';
import { IPermission } from './permission.model';

export enum UserRole {
  CUSTOMER = 'customer',
  RESTAURANT_ADMIN = 'restaurant_admin',
  SYSTEM_ADMIN = 'system_admin'
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  // RBAC fields
  roles: IRole[] | string[];
  directPermissions: IPermission[] | string[];
  restaurantId?: mongoose.Types.ObjectId;
  phoneNumber?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // New fields for Google OAuth
  googleId?: string;
  isRestaurantAdmin(): boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
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
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
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
  directPermissions: [{
    type: Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  phoneNumber: {
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
  // Add Google OAuth fields
  googleId: {
    type: String,
    sparse: true,
    unique: true
  }
}, {
  timestamps: true
});

// Add methods
UserSchema.methods.isRestaurantAdmin = function(this: IUser): boolean {
  return this.role === UserRole.RESTAURANT_ADMIN;
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

export default mongoose.model<IUser>('User', UserSchema);
