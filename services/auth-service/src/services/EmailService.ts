import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { JWT_SECRET } from '../config';

// Load environment variables from root .env file
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
console.log('Loading .env from:', rootEnvPath);
dotenv.config({ path: rootEnvPath });

// Debug environment variables
console.log('Email Environment Variables:');
console.log('- EMAIL_APPLICATION:', process.env.EMAIL_APPLICATION || 'Not set');
console.log('- EMAIL_APPLICATION_PASSWORD:', process.env.EMAIL_APPLICATION_PASSWORD ? '[SET]' : 'Not set');
console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'Not set');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set');
console.log('- ADMIN_FRONTEND_URL:', process.env.ADMIN_FRONTEND_URL || 'Not set');

// Enhanced email template base styles
const getBaseStyles = () => `
  <style>
    /* CSS Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #0F172A;
      background: #3b82f6;
      min-height: 100vh;
      padding: 20px;
    }

    .email-wrapper {
      background: #3b82f6;
      min-height: 100vh;
      padding: 40px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      max-width: 600px;
      width: 100%;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.15);
      overflow: hidden;
      position: relative;
    }

    .header {
      background: #3b82f6;
      padding: 40px 40px 60px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" patternUnits="userSpaceOnUse" width="100" height="100"><circle cx="20" cy="20" r="1" fill="white" opacity="0.1"/><circle cx="80" cy="40" r="1.5" fill="white" opacity="0.08"/><circle cx="40" cy="80" r="1" fill="white" opacity="0.12"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
    }

    .logo {
      font-size: 32px;
      font-weight: 800;
      color: white;
      margin-bottom: 10px;
      letter-spacing: -1px;
      position: relative;
      z-index: 2;
      text-shadow: 0 2px 4px rgba(15, 23, 42, 0.3);
    }

    .admin-badge, .demo-badge {
      display: inline-block;
      background: white;
      color: #0F172A;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      margin-left: 10px;
    }

    .content {
      padding: 50px 40px;
      background: white;
      position: relative;
    }

    .greeting {
      font-size: 28px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 20px;
    }

    .description {
      font-size: 16px;
      color: #1E293B;
      margin-bottom: 25px;
      line-height: 1.7;
    }

    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      background: #3b82f6;
      color: white !important;
      text-decoration: none;
      border-radius: 50px;
      
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
      position: relative;
      overflow: hidden;
      margin: 25px 0;
      transition: all 0.3s ease;
      border: none;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      background: #2563eb;
      box-shadow: 0 12px 35px rgba(59, 130, 246, 0.5);
      color: white !important;
    }

    .fallback-link {
      background: #f8f9fa;
      border: 2px dashed #e9ecef;
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      word-break: break-all;
      color: #1E293B;
    }

    .security-notice {
      background: #fef3c7;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      border-radius: 0 12px 12px 0;
      margin: 30px 0;
      position: relative;
    }

    .security-notice::before {
      content: '⚠️';
      position: absolute;
      left: -12px;
      top: 20px;
      background: #3b82f6;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .security-notice p {
      margin: 0;
      font-weight: 600;
      color: #0F172A;
    }

    .demo-section {
      background: #f8fafc;
      border-radius: 16px;
      padding: 30px;
      margin: 30px 0;
      border: 1px solid #cbd5e1;
      position: relative;
      overflow: hidden;
    }

    .demo-section::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      height: 4px;
      background: #3b82f6;
      border-radius: 16px 16px 0 0;
    }

    .demo-section h3 {
      color: #0F172A;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
    }

    .demo-section h3::before {
      content: '🚀';
      margin-right: 10px;
      font-size: 24px;
    }

    .credentials-box {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin: 15px 0;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
    }

    .credential-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .credential-item:last-child {
      border-bottom: none;
    }

    .credential-label {
      font-weight: 600;
      color: #1E293B;
      font-size: 14px;
    }

    .credential-value {
      font-family: 'Courier New', monospace;
      background: #f8fafc;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 13px;
      color: #0F172A;
    }

    .footer {
      background: #f8fafc;
      padding: 30px 40px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .footer-text {
      font-size: 13px;
      color: #1E293B;
      line-height: 1.6;
      margin-bottom: 15px;
    }

    .divider {
      width: 60px;
      height: 3px;
      background: #3b82f6;
      margin: 30px auto;
      border-radius: 2px;
    }

    .highlight-box {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      border-radius: 0 12px 12px 0;
      margin: 25px 0;
    }

    .highlight-box p {
      margin: 0;
      color: #0F172A;
      font-weight: 500;
    }

    /* Responsive Design */
    @media screen and (max-width: 640px) {
      .email-wrapper {
        padding: 20px 10px;
      }
      
      .container {
        border-radius: 15px;
      }
      
      .header, .content, .footer {
        padding: 30px 25px;
      }
      
      .demo-section {
        padding: 20px;
      }
      
      .logo {
        font-size: 28px;
      }
      
      .greeting {
        font-size: 24px;
      }
      
      .cta-button {
        padding: 14px 28px;
        font-size: 15px;
      }
    }
  </style>
`;

// validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// If no email config, use mock transporter for development
const createTransport = () => {
  // Explicitly check for the Doktermin style EMAIL_APPLICATION
  if (process.env.EMAIL_APPLICATION && process.env.EMAIL_APPLICATION_PASSWORD) {
    console.log('Using Gmail transporter with EMAIL_APPLICATION:', process.env.EMAIL_APPLICATION);
    
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_APPLICATION,
        pass: process.env.EMAIL_APPLICATION_PASSWORD,
      },
    });
    
    // Test the connection
    transport.verify((error) => {
      if (error) {
        console.error('Error verifying email transport:', error);
      } else {
        console.log('Email server is ready to send messages');
      }
    });
    
    return transport;
  } else if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log('Using SMTP transporter with EMAIL_USER:', process.env.EMAIL_USER);
    return nodemailer.createTransport({
      host: process.env.EMAIL_SERVICE,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else {
    console.warn('Email configuration not found, using mock email service');
    return {
      sendMail: async (mailOptions: any) => {
        console.log('Mock email sent:', mailOptions);
        return Promise.resolve({ messageId: 'mock-id' });
      },
      verify: async () => Promise.resolve(true)
    };
  }
};

const transporter = createTransport();

const emailTemplates = {
  passwordSetup: (firstName: string, link: string, isAdmin: boolean) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Welcome to INSEAT${isAdmin ? ' Admin Portal' : ''}</title>
      ${getBaseStyles()}
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">
              INSEAT
              ${isAdmin ? '<span class="admin-badge">Admin Portal</span>' : ''}
            </div>
          </div>
          
          <div class="content">
            <h1 class="greeting">Welcome${firstName ? `, ${firstName}` : ''}! 👋</h1>
            
            <p class="description">
              We're excited to have you join our platform! Your ${isAdmin ? 'administrative ' : ''}account has been successfully created, and you're just one step away from getting started.
            </p>
            
            <p class="description">
              Click the button below to set up your secure password and activate your account:
            </p>
            
            <div style="text-align: center;">
              <a href="${link}" class="cta-button">
                ${isAdmin ? 'Activate Admin Account' : 'Set Up Password'}
              </a>
            </div>
            
            <div class="divider"></div>
            
            <p style="color: #6c757d; font-size: 14px; margin-bottom: 15px;">
              If the button above doesn't work, copy and paste this secure link into your browser:
            </p>
            
            <div class="fallback-link">
              ${link}
            </div>
            
            <div class="security-notice">
              <p>🔒 This secure link expires in 1 hour for your protection</p>
            </div>

            <div class="highlight-box">
              <p>💡 After setting up your password, you'll have full access to ${isAdmin ? 'the admin dashboard and all management features' : 'your account and can start using INSEAT'}.</p>
            </div>
          </div>
          
          <div class="footer">
            <p class="footer-text">
              If you didn't request this account, please ignore this email or contact our support team.
            </p>
            <p class="footer-text">
              This is an automated message — please don't reply to this email.
            </p>
            <div style="margin-top: 20px; font-size: 12px; color: #adb5bd;">
              © 2025 INSEAT. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
};

/**
 * Send an email with the specified options.
 * @param {Object} mailOptions - The email options (from, to, subject, html).
 * @returns {Promise} - Resolves if email is sent successfully, otherwise rejects with an error.
 */
export const sendEmail = async (mailOptions: any): Promise<any> => {
  return transporter.sendMail(mailOptions);
};

/**
 * Send magic link email for password setup
 * @param to Email recipient
 * @param firstName First name of the recipient
 * @param token Reset token
 * @param isAdmin Whether the recipient is an admin
 * @returns true if email was sent successfully, false otherwise
 */
export const sendPasswordSetupEmail = async (
  to: string,
  firstName: string,
  token: string,
  isAdmin: boolean = false
): Promise<boolean> => {
  // Determine the correct protocol and frontend URL based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  let frontendUrl: string;
  
  if (isAdmin) {
    if (isDevelopment) {
      // For local development, use HTTP
      frontendUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:5173';
    } else {
      // For production, use HTTPS
      frontendUrl = process.env.ADMIN_FRONTEND_URL || 'https://cms.inseat.achievengine.com';
    }
  } else {
    if (isDevelopment) {
      // For local development, use HTTP
      frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    } else {
      // For production, use HTTPS
      frontendUrl = process.env.FRONTEND_URL || 'https://app.inseat.achievengine.com';
    }
  }
  
  // Ensure the URL uses the correct protocol for the environment
  if (isDevelopment && frontendUrl.startsWith('https://localhost')) {
    frontendUrl = frontendUrl.replace('https://localhost', 'http://localhost');
  }
  
  // Send to the password-setup route
  const magicLink = `${frontendUrl}/password-setup?token=${token}`;

  try {
    // Use EMAIL_APPLICATION first (doktermin style), then fall back to EMAIL_USER
    const fromEmail = process.env.EMAIL_APPLICATION || process.env.EMAIL_USER || 'noreply@inseat.com';
    
    await sendEmail({
      from: `"INSEAT Team" <${fromEmail}>`,
      to,
      subject: isAdmin ? 'Welcome to INSEAT - Admin Account Setup 🚀' : 'Welcome to INSEAT - Account Setup 🎉',
      html: emailTemplates.passwordSetup(firstName, magicLink, isAdmin),
    });

    // Log the magic link during development to help with testing
    if (isDevelopment) {
      console.log('====== DEVELOPMENT PASSWORD SETUP LINK ======');
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Email: ${to}`);
      console.log(`Magic link: ${magicLink}`);
      console.log(`Protocol used: ${frontendUrl.startsWith('https') ? 'HTTPS' : 'HTTP'}`);
      console.log('============================================');
    }

    return true;
  } catch (error) {
    console.error('Error sending password setup email:', error);
    return false;
  }
};

/**
 * Verify email configuration
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    if (typeof transporter.verify === 'function') {
      await transporter.verify();
    }
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

export const demoAccountCreationTemplate = (
  restaurantName: string,
  adminDemoLink: string,
  customerDemoLink: string,
  adminEmail: string,
  adminPassword: string,
  demoUniqueId: string,
  expiresAt: Date
) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Your INSEAT Demo Account is Ready!</title>
    ${getBaseStyles()}
  </head>
  <body>
    <div class="email-wrapper">
      <div class="container">
        <div class="header">
          <div class="logo">
            INSEAT
            <span class="demo-badge">Demo Account Ready</span>
          </div>
        </div>
        
        <div class="content">
          <h1 class="greeting">Your Demo Account is Ready! 🚀</h1>
          
          <p class="description">
            Congratulations! We've created a fully functional demo account for <strong>${restaurantName}</strong> with complete restaurant management capabilities.
          </p>
          
          <p class="description">
            Your demo includes sample menu items, tables, categories, and all the features you need to experience the full power of INSEAT.
          </p>

          <div class="demo-section">
            <h3>🏪 Admin Dashboard Access</h3>
            <p class="description">
              Log in to your restaurant management dashboard with these credentials:
            </p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <span class="credential-label">Dashboard URL:</span>
                <a href="${adminDemoLink}" class="credential-value" style="color: #667eea; text-decoration: none;">${adminDemoLink}</a>
              </div>
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${adminEmail}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${adminPassword}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Demo ID:</span>
                <span class="credential-value">${demoUniqueId}</span>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${adminDemoLink}" class="cta-button">Access Admin Dashboard</a>
            </div>
          </div>

          <div class="demo-section">
            <h3>🍽️ Customer Experience</h3>
            <p class="description">
              Preview how customers will interact with your restaurant's digital menu:
            </p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <span class="credential-label">Customer Menu:</span>
                <a href="${customerDemoLink}" class="credential-value" style="color: #667eea; text-decoration: none;">${customerDemoLink}</a>
              </div>
              <div class="credential-item">
                <span class="credential-label">Access:</span>
                <span class="credential-value">No login required!</span>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${customerDemoLink}" class="cta-button">View Customer Menu</a>
            </div>
          </div>

          <div class="security-notice">
            <p>🔒 Your demo expires on <strong>${expiresAt.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</strong> (7 days from creation)</p>
          </div>

          <div class="divider"></div>

          <p class="description">
            <strong>🎯 What's included in your demo:</strong>
          </p>
          <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 20px 0;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
              <div>
                <p style="margin: 8px 0; color: #5a6c7d; font-weight: 600;">📋 Restaurant Management</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Complete menu management</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Table and venue setup</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Category organization</p>
              </div>
              <div>
                <p style="margin: 8px 0; color: #5a6c7d; font-weight: 600;">📊 Analytics & Reports</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Sales analytics dashboard</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Order tracking system</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Performance metrics</p>
              </div>
              <div>
                <p style="margin: 8px 0; color: #5a6c7d; font-weight: 600;">🛠️ Advanced Features</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Modifier management</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Staff role management</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Real-time updates</p>
              </div>
              <div>
                <p style="margin: 8px 0; color: #5a6c7d; font-weight: 600;">🎨 Customization</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Brand customization</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Menu styling options</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">• Mobile optimization</p>
              </div>
            </div>
          </div>

          <div class="highlight-box">
            <p>💡 <strong>Pro Tip:</strong> Try creating a test order from the customer menu, then check how it appears in your admin dashboard for the complete experience!</p>
          </div>

          <p class="description">
            Need help getting started? Our demo includes sample data to help you explore every feature. If you have questions or want to schedule a live demonstration, our team is here to help!
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Questions about your demo?</p>
            <a href="mailto:support@inseat.com" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Contact Support Team</a>
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            This demo account was automatically created for <strong>${restaurantName}</strong>
          </p>
          <p class="footer-text">
            Save these credentials in a secure location for future reference.
          </p>
          <div style="margin-top: 20px; font-size: 12px; color: #adb5bd;">
            © 2025 INSEAT. All rights reserved. | Demo ID: ${demoUniqueId}
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

export const demoInvitationTemplate = (
  fullName: string, 
  restaurantName: string, 
  adminDemoLink: string, 
  customerDemoLink: string, 
  adminUsername: string,
  adminPassword: string
) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Your INSEAT Demo is Ready!</title>
    ${getBaseStyles()}
  </head>
  <body>
    <div class="email-wrapper">
      <div class="container">
        <div class="header">
          <div class="logo">
            INSEAT
            <span class="demo-badge">Demo Ready</span>
          </div>
        </div>
        
        <div class="content">
          <h1 class="greeting">Your Demo is Ready! 🎉</h1>
          
          <p class="description">
            Dear ${fullName},
          </p>
          
          <p class="description">
            Thank you for your interest in INSEAT! We've created a personalized demo experience for <strong>${restaurantName}</strong> that showcases all the powerful features our platform offers.
          </p>

          <div class="demo-section">
            <h3>Admin Dashboard Demo</h3>
            <p class="description">
              Experience the full power of restaurant management with your personalized admin dashboard:
            </p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <span class="credential-label">Admin URL:</span>
                <a href="${adminDemoLink}" class="credential-value" style="color: #667eea; text-decoration: none;">${adminDemoLink}</a>
              </div>
              <div class="credential-item">
                <span class="credential-label">Username:</span>
                <span class="credential-value">${adminUsername}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${adminPassword}</span>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${adminDemoLink}" class="cta-button">Access Admin Dashboard</a>
            </div>
          </div>

          <div class="demo-section">
            <h3>Customer Experience Demo</h3>
            <p class="description">
              See what your customers will experience with this customer-facing demonstration:
            </p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <span class="credential-label">Customer URL:</span>
                <a href="${customerDemoLink}" class="credential-value" style="color: #667eea; text-decoration: none;">${customerDemoLink}</a>
              </div>
              <div class="credential-item">
                <span class="credential-label">Access:</span>
                <span class="credential-value">No login required!</span>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${customerDemoLink}" class="cta-button">View Customer Site</a>
            </div>
          </div>

          <div class="highlight-box">
            <p>🕒 Your demo access will be available for <strong>7 days</strong>. Feel free to explore all features and functionalities at your own pace.</p>
          </div>

          <div class="divider"></div>

          <p class="description">
            <strong>What you can explore:</strong>
          </p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 8px 0; color: #5a6c7d;">🍽️ Menu management and customization</p>
            <p style="margin: 8px 0; color: #5a6c7d;">📊 Order tracking and analytics</p>
            <p style="margin: 8px 0; color: #5a6c7d;">💳 Payment processing simulation</p>
            <p style="margin: 8px 0; color: #5a6c7d;">👥 Customer interaction features</p>
            <p style="margin: 8px 0; color: #5a6c7d;">📱 Mobile-responsive design</p>
          </div>

          <p class="description">
            If you have any questions or need assistance during your demo exploration, please don't hesitate to contact our support team. We're here to help you discover how INSEAT can transform your restaurant operations!
          </p>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            Questions? Contact our support team at any time.
          </p>
          <p class="footer-text">
            This is an automated message — please don't reply to this email.
          </p>
          <div style="margin-top: 20px; font-size: 12px; color: #adb5bd;">
            © 2025 INSEAT. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
`;