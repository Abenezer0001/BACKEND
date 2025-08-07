import { Request, Response } from 'express';
import User, { IUser } from '../models/user.model';
import { TokenUtils } from '../utils/tokenUtils';
import mongoose from 'mongoose';

export class PasswordSetupController {
  /**
   * Verify password reset token
   */
  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        res.status(400).json({ message: 'Token is required' });
        return;
      }

      // Hash the provided token for comparison
      const hashedToken = TokenUtils.hashToken(token);

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() }
      }).select('email firstName lastName');

      if (!user) {
        res.status(400).json({ message: 'Invalid or expired password reset token' });
        return;
      }

      res.status(200).json({ 
        message: 'Token is valid',
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(500).json({ message: 'Error verifying token' });
    }
  }

  /**
   * Set up password using reset token
   */
  static async setupPassword(req: Request, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({ 
          message: 'Missing required fields',
          details: {
            token: token ? undefined : 'Token is required',
            password: password ? undefined : 'Password is required'
          }
        });
        return;
      }

      // Validate password requirements
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        res.status(400).json({ 
          message: 'Password does not meet requirements',
          requirements: {
            length: 'Minimum 8 characters',
            uppercase: 'At least one uppercase letter',
            lowercase: 'At least one lowercase letter',
            number: 'At least one number',
            special: 'At least one special character (@$!%*?&)'
          }
        });
        return;
      }

      // Hash the provided token for comparison
      const hashedToken = TokenUtils.hashToken(token);

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() }
      }).session(session);

      if (!user) {
        await session.abortTransaction();
        res.status(400).json({ message: 'Invalid or expired password reset token' });
        return;
      }

      // Update user's password and clear reset token
      user.password = password;
      user.isPasswordSet = true;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save();
      await session.commitTransaction();

      res.status(200).json({ 
        message: 'Password set successfully',
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error setting up password:', error);
      res.status(500).json({ message: 'Error setting up password' });
    } finally {
      session.endSession();
    }
  }
}

