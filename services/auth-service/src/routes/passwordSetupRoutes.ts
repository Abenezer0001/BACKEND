import express from 'express';
import { PasswordSetupController } from '../controllers/PasswordSetupController';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for token verification
const tokenVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per window
  message: { message: 'Too many token verification attempts, please try again later' }
});

// Rate limiter for password setup
const passwordSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 attempts per hour
  message: { message: 'Too many password setup attempts, please try again later' }
});

// Route for verifying token validity
router.get('/verify-setup-token', tokenVerificationLimiter, PasswordSetupController.verifyToken);

// Route for setting up password
router.post('/setup-password', passwordSetupLimiter, PasswordSetupController.setupPassword);

export default router;

