import * as EmailService from './services/EmailService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmailService() {
  console.log('Testing email service...');
  console.log('Environment variables:');
  console.log('- EMAIL_APPLICATION:', process.env.EMAIL_APPLICATION || 'Not set');
  console.log('- EMAIL_APPLICATION_PASSWORD: ', process.env.EMAIL_APPLICATION_PASSWORD ? '[SET]' : 'Not set');
  console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'Not set');
  console.log('- EMAIL_USER:', process.env.EMAIL_USER || 'Not set');
  console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '[SET]' : 'Not set');
  console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set');
  console.log('- ADMIN_FRONTEND_URL:', process.env.ADMIN_FRONTEND_URL || 'Not set');
  
  try {
    // Test email connection
    const isConnected = await EmailService.verifyEmailConnection();
    console.log('Email connection verified:', isConnected);
    
    // Try to send test email
    if (isConnected) {
      const testToken = 'test-token-12345';
      const emailSent = await EmailService.sendPasswordSetupEmail(
        'abenu77z@gmail.com',
        'Abenezer',
        testToken,
        true // isAdmin
      );
      
      console.log('Test email sent:', emailSent);
    }
  } catch (error) {
    console.error('Error testing email service:', error);
  }
}

// Run the test
testEmailService();
