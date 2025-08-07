import { Request } from 'express';
import mongoose from 'mongoose';

export interface JWTPayload {
  userId: string;
  businessId?: string;
  restaurantId?: string;
  role: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface BusinessContext {
  businessId: mongoose.Types.ObjectId;
  isBusinessOwner: boolean;
  allowedRoles: string[];
} 