import mongoose from 'mongoose';
import crypto from 'crypto';
import DemoRequest from '../models/DemoRequest';
import { sendEmail, demoInvitationTemplate } from './EmailService';
import DemoRestaurantService from '../../../restaurant-service/src/services/DemoRestaurantService';
import dotenv from 'dotenv';

dotenv.config();

// Base URLs for demo sites
const ADMIN_DEMO_BASE_URL = process.env.ADMIN_DEMO_BASE_URL || 'https://admin-demo.inseat.com';
const CUSTOMER_DEMO_BASE_URL = process.env.CUSTOMER_DEMO_BASE_URL || 'https://demo.inseat.com';

class DemoService {
  /**
   * Create a demo request and store it in the database
   */
  async createDemoRequest(demoData: {
    fullName: string;
    email: string;
    phoneNumber: string;
    companyName: string;
    restaurantName: string;
  }) {
    try {
      // Create a new demo request record
      const demoRequest = new DemoRequest({
        fullName: demoData.fullName,
        email: demoData.email,
        phoneNumber: demoData.phoneNumber,
        companyName: demoData.companyName,
        restaurantName: demoData.restaurantName,
        status: 'pending'
      });

      const savedRequest = await demoRequest.save();
      return savedRequest;
    } catch (error) {
      console.error('Error creating demo request:', error);
      throw error;
    }
  }

  /**
   * Process a demo request by creating restaurant and demo data
   */
  async processDemoRequest(demoRequestId: string) {
    try {
      const demoRequest = await DemoRequest.findById(demoRequestId);
      
      if (!demoRequest) {
        throw new Error('Demo request not found');
      }

      // Generate a random password for admin access
      const adminPassword = this.generateRandomPassword();
      
      // Set unique identifiers for demo URLs
      const demoUniqueId = crypto.randomBytes(6).toString('hex');
      
      // Generate demo links
      const adminDemoLink = `${ADMIN_DEMO_BASE_URL}/${demoUniqueId}`;
      const customerDemoLink = `${CUSTOMER_DEMO_BASE_URL}/${demoUniqueId}`;
      
      // Create a fake ownerId for the demo restaurant
      const ownerId = new mongoose.Types.ObjectId();
      
      // Create restaurant data for the demo
      const restaurant = await DemoRestaurantService.createDemoRestaurant({
        name: demoRequest.restaurantName,
        email: demoRequest.email,
        ownerId: ownerId.toString()
      });
      
      // Update the demo request with generated data
      demoRequest.adminDemoPassword = adminPassword;
      demoRequest.adminDemoLink = adminDemoLink;
      demoRequest.customerDemoLink = customerDemoLink;
      demoRequest.restaurantId = restaurant._id;
      demoRequest.status = 'processed';
      
      await demoRequest.save();
      
      // Send email with demo access information
      await this.sendDemoInvitation(demoRequest);
      
      return demoRequest;
    } catch (error) {
      console.error('Error processing demo request:', error);
      throw error;
    }
  }

  /**
   * Send demo invitation email
   */
  async sendDemoInvitation(demoRequest: any) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_APPLICATION,
        to: demoRequest.email,
        subject: 'Your INSEAT Demo is Ready',
        html: demoInvitationTemplate(
          demoRequest.fullName,
          demoRequest.restaurantName,
          demoRequest.adminDemoLink,
          demoRequest.customerDemoLink,
          demoRequest.email, // Using email as admin username
          demoRequest.adminDemoPassword
        )
      };

      await sendEmail(mailOptions);
      
      // Update demo request status
      demoRequest.status = 'completed';
      await demoRequest.save();
      
      return true;
    } catch (error) {
      console.error('Error sending demo invitation:', error);
      throw error;
    }
  }

  /**
   * Generate a random password for demo admin access
   */
  generateRandomPassword(length = 10) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Validate demo access token
   */
  async validateDemoAccess(demoId: string) {
    try {
      // Find demo request by unique ID in the URL
      const demoRequest = await DemoRequest.findOne({
        $or: [
          { adminDemoLink: { $regex: demoId } },
          { customerDemoLink: { $regex: demoId } }
        ],
        expiresAt: { $gt: new Date() } // Check if demo hasn't expired
      });
      
      if (!demoRequest) {
        return null;
      }
      
      return demoRequest;
    } catch (error) {
      console.error('Error validating demo access:', error);
      throw error;
    }
  }
}

export default new DemoService(); 