import { UserRole } from '../models/user.model';
import mongoose from 'mongoose';
import type { ObjectId } from 'mongoose';

declare global {
  namespace Express {
    // Define the User interface with all required properties
    interface User {
      id?: string;
      userId?: string;
      _id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      role: UserRole | string;
      roles: string[] | ObjectId[] | any[];
      permissions?: ObjectId[] | any[];
      isPasswordSet?: boolean;
      restaurantIds?: string[];
      restaurantId?: string;
      businessId?: string;
      passwordResetToken?: string;
      passwordResetExpires?: Date;
      iat?: number;
      exp?: number;
    }

    // Extend the Request interface to include our User type
    interface Request {
      user?: User;
    }
  }
}

// This file is a module
export {};
