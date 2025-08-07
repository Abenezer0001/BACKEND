import { Request } from 'express';

export enum UserRole {
  CUSTOMER = 'customer',
  RESTAURANT_ADMIN = 'restaurant_admin',
  SYSTEM_ADMIN = 'system_admin',
  ADMIN = 'admin',
  STAFF = 'staff',
  SUPER_ADMIN = 'super-admin'
}

// Note: User interface is now imported from auth-service types instead of being declared globally 