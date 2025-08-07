import { Request, Response } from 'express';
import DemoService from '../services/DemoService';
import DemoRequest from '../models/DemoRequest';
import { Log } from '../utils/logger';

export class DemoController {
  /**
   * Create a complete demo account with restaurant, menu data, and admin user
   * POST /api/demo/create-account
   */
  public async createDemoAccount(req: Request, res: Response): Promise<void> {
    const correlationId = (req as any).correlationId;
    
    try {
      const { restaurantName, businessEmail } = req.body;
      
      // Validate required fields
      if (!restaurantName || !businessEmail) {
        Log.warn('Demo account creation failed - missing required fields', {
          restaurantName: !!restaurantName,
          businessEmail: !!businessEmail,
          correlationId
        });
        
        res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: restaurantName and businessEmail are required'
        });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(businessEmail)) {
        Log.warn('Demo account creation failed - invalid email format', {
          businessEmail,
          correlationId
        });
        
        res.status(400).json({ 
          success: false, 
          error: 'Invalid email format'
        });
        return;
      }
      
      // Check if a demo account for this email already exists
      const existingDemo = await DemoRequest.findOne({ 
        email: businessEmail,
        expiresAt: { $gt: new Date() }
      });
      
      if (existingDemo) {
        Log.warn('Demo account already exists for email', {
          businessEmail,
          existingDemoId: existingDemo._id,
          correlationId
        });
        
        res.status(409).json({ 
          success: false, 
          error: 'A demo account for this email already exists and is still active'
        });
        return;
      }
      
      Log.info('Creating comprehensive demo account', {
        restaurantName,
        businessEmail,
        correlationId
      });
      
      // Create comprehensive demo account with all components
      const demoAccount = await DemoService.createComprehensiveDemoAccount({
        restaurantName,
        businessEmail,
        correlationId
      });
      
      Log.info('Demo account created successfully', {
        restaurantName,
        businessEmail,
        restaurantId: demoAccount.restaurantId,
        adminUserId: demoAccount.adminUserId,
        correlationId
      });
      
      res.status(201).json({
        success: true,
        message: 'Demo account created successfully. Check your email for login credentials.',
        data: {
          restaurantId: demoAccount.restaurantId,
          restaurantName: demoAccount.restaurantName,
          adminDemoLink: demoAccount.adminDemoLink,
          customerDemoLink: demoAccount.customerDemoLink,
          expiresAt: demoAccount.expiresAt
        }
      });
      
    } catch (error: any) {
      Log.error('Error creating demo account', {
        error: error.message,
        stack: error.stack,
        correlationId
      });
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create demo account', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Handle new demo request submissions (legacy method)
   */
  public async createDemoRequest(req: Request, res: Response): Promise<void> {
    try {
      const { fullName, email, phoneNumber, companyName, restaurantName } = req.body;
      
      // Validate required fields
      if (!fullName || !email || !phoneNumber || !companyName || !restaurantName) {
        res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
        return;
      }
      
      // Check if a demo request for this email already exists
      const existingRequest = await DemoRequest.findOne({ email });
      
      if (existingRequest && existingRequest.status !== 'completed') {
        res.status(409).json({ 
          success: false, 
          error: 'A demo request for this email is already being processed' 
        });
        return;
      }
      
      // Create a new demo request
      const demoRequest = await DemoService.createDemoRequest({
        fullName,
        email,
        phoneNumber,
        companyName,
        restaurantName
      });
      
      // Process the demo request immediately
      // In a production environment, this might be handled by a queue or background job
      await DemoService.processDemoRequest(demoRequest._id.toString());
      
      res.status(201).json({
        success: true,
        message: 'Demo request submitted successfully. Check your email for access details.'
      });
    } catch (error: any) {
      console.error('Error creating demo request:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error processing demo request', 
        details: error.message 
      });
    }
  }

  /**
   * Validate demo login credentials
   */
  public async validateDemoCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { demoId, email, password } = req.body;
      
      if (!demoId || !email || !password) {
        res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
        return;
      }
      
      // Find the demo request
      const demoRequest = await DemoRequest.findOne({
        email,
        adminDemoLink: { $regex: demoId },
        adminDemoPassword: password,
        expiresAt: { $gt: new Date() } // Check if not expired
      });
      
      if (!demoRequest) {
        res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials or expired demo' 
        });
        return;
      }
      
      // Return success with demo access token
      res.status(200).json({
        success: true,
        demoToken: demoId,
        restaurantId: demoRequest.restaurantId,
        restaurantName: demoRequest.restaurantName
      });
    } catch (error: any) {
      console.error('Error validating demo credentials:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error validating demo credentials', 
        details: error.message 
      });
    }
  }

  /**
   * Get customer-facing demo information
   */
  public async getCustomerDemoInfo(req: Request, res: Response): Promise<void> {
    try {
      const { demoId } = req.params;
      
      if (!demoId) {
        res.status(400).json({ 
          success: false, 
          error: 'Demo ID is required' 
        });
        return;
      }
      
      // Validate demo access
      const demoRequest = await DemoService.validateDemoAccess(demoId);
      
      if (!demoRequest) {
        res.status(404).json({ 
          success: false, 
          error: 'Demo not found or expired' 
        });
        return;
      }
      
      // Return restaurant information for customer demo
      res.status(200).json({
        success: true,
        restaurantId: demoRequest.restaurantId,
        restaurantName: demoRequest.restaurantName,
        demoMode: true
      });
    } catch (error: any) {
      console.error('Error getting customer demo info:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error retrieving demo information', 
        details: error.message 
      });
    }
  }

  /**
   * List all demo requests (admin function)
   */
  public async listDemoRequests(req: Request, res: Response): Promise<void> {
    try {
      // Add pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      const total = await DemoRequest.countDocuments();
      const demoRequests = await DemoRequest.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      res.status(200).json({
        success: true,
        data: demoRequests,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error('Error listing demo requests:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error listing demo requests', 
        details: error.message 
      });
    }
  }
}

export default new DemoController(); 