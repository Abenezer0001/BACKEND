import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

export class TokenUtils {
  private static readonly PASSWORD_RESET_TOKEN_EXPIRES = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES || '86400', 10);

  /**
   * Generate a secure random token for password reset
   */
  static generatePasswordResetToken(): { token: string; hashedToken: string } {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash the token for storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Debug logging in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('[TokenUtils] Generated new token:');
      console.log('  - Plain token:', token);
      console.log('  - Hashed token:', hashedToken);
      console.log('  - Expires:', this.getTokenExpirationDate());
    }

    return { token, hashedToken };
  }

  /**
   * Hash a token for verification
   */
  static hashToken(token: string): string {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      // Debug logging in development mode
      if (process.env.NODE_ENV !== 'production') {
        console.log('[TokenUtils] Hashing token for verification:');
        console.log('  - Input token:', token);
        console.log('  - Result hash:', hashedToken);
      }
      
      return hashedToken;
    } catch (error) {
      console.error('[TokenUtils] Error hashing token:', error);
      throw new Error('Failed to hash token');
    }
  }

  /**
   * Get token expiration date
   */
  static getTokenExpirationDate(): Date {
    return new Date(Date.now() + this.PASSWORD_RESET_TOKEN_EXPIRES * 1000);
  }

  /**
   * Check if a token has expired
   */
  static isTokenExpired(expirationDate: Date): boolean {
    const isExpired = Date.now() > expirationDate.getTime();
    
    // Debug logging in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('[TokenUtils] Checking token expiration:');
      console.log('  - Current time:', new Date());
      console.log('  - Expiration time:', expirationDate);
      console.log('  - Is expired:', isExpired);
    }
    
    return isExpired;
  }

  /**
   * Verify a token by comparing it with the stored hashed token
   */
  static verifyToken(plainToken: string, storedHashedToken: string): boolean {
    try {
      const hashedInputToken = this.hashToken(plainToken);
      const isValid = hashedInputToken === storedHashedToken;
      
      // Debug logging in development mode
      if (process.env.NODE_ENV !== 'production') {
        console.log('[TokenUtils] Verifying token:');
        console.log('  - Plain input token:', plainToken);
        console.log('  - Hashed input token:', hashedInputToken);
        console.log('  - Stored hashed token:', storedHashedToken);
        console.log('  - Is valid:', isValid);
      }
      
      return isValid;
    } catch (error) {
      console.error('[TokenUtils] Error verifying token:', error);
      return false;
    }
  }
}

