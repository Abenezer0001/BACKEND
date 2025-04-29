// import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Temporary mock transporter
const transporter = {
  sendMail: async (mailOptions: any) => {
    console.log('Mock email sent:', mailOptions);
    return Promise.resolve({ messageId: 'mock-id' });
  }
};

/**
 * Send an email with the specified options.
 * @param {Object} mailOptions - The email options (from, to, subject, html).
 * @returns {Promise} - Resolves if email is sent successfully, otherwise rejects with an error.
 */
export const sendEmail = async (mailOptions: any): Promise<any> => {
  return transporter.sendMail(mailOptions);
};

export const demoInvitationTemplate = (
  fullName: string, 
  restaurantName: string, 
  adminDemoLink: string, 
  customerDemoLink: string, 
  adminUsername: string,
  adminPassword: string
) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
    <h2 style="color: #E74C3C; text-align: center;">Your INSEAT Demo is Ready!</h2>
    <p>Dear ${fullName},</p>
    <p>Thank you for your interest in INSEAT. We have created a personalized demo for <strong>${restaurantName}</strong>.</p>

    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #E74C3C;">Admin Dashboard Demo</h3>
      <p>Use the following credentials to access your restaurant management dashboard:</p>
      <p><strong>Admin URL:</strong> <a href="${adminDemoLink}" style="color: #E74C3C;">${adminDemoLink}</a></p>
      <p><strong>Username:</strong> ${adminUsername}</p>
      <p><strong>Password:</strong> ${adminPassword}</p>
    </div>

    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #E74C3C;">Customer-Facing Site Demo</h3>
      <p>Share this link to experience the customer side of INSEAT:</p>
      <p><strong>Customer URL:</strong> <a href="${customerDemoLink}" style="color: #E74C3C;">${customerDemoLink}</a></p>
      <p>No login required - customers can browse the menu and place orders immediately!</p>
    </div>

    <p>Your demo access will be available for 7 days. Feel free to explore all features and functionalities.</p>
    
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

    <p>Thank you,<br/>The INSEAT Team</p>
  </div>
`; 