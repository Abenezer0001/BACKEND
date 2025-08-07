import { Request, Response, NextFunction } from 'express';
import { StripeConnectBusinessService, BusinessOnboardingData } from '../services/StripeConnectBusinessService';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    businessId?: string;
    restaurantId?: string;
  };
}

export class StripeConnectBusinessController {
  private stripeConnectService: StripeConnectBusinessService;

  constructor() {
    this.stripeConnectService = new StripeConnectBusinessService();
  }

  // Create Stripe Connect account for business
  async createBusinessAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        businessName,
        legalName,
        businessType,
        country,
        businessUrl,
        businessDescription,
        businessAddress,
        businessOwner
      } = req.body;

      // Get business ID from authenticated user or request body
      const businessId = req.user?.businessId || req.body.businessId;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required'
        });
        return;
      }

      if (!businessName || !businessType || !country) {
        res.status(400).json({
          success: false,
          message: 'Business name, type, and country are required'
        });
        return;
      }

      const businessData: BusinessOnboardingData = {
        businessId,
        businessName,
        businessEmail: req.user?.email || req.body.businessEmail,
        legalName,
        businessType,
        country,
        businessUrl,
        businessDescription,
        businessAddress,
        businessOwner
      };

      const result = await this.stripeConnectService.createBusinessAccount(businessData);

      res.status(201).json({
        success: true,
        message: 'Stripe Connect account created successfully',
        data: result
      });
    } catch (error) {
      console.error('Error creating business account:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create business account'
      });
    }
  }

  // Get business Stripe Connect account status
  async getAccountStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.user?.businessId || req.params.businessId;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required'
        });
        return;
      }

      const accountStatus = await this.stripeConnectService.checkAccountStatus(businessId);

      res.status(200).json({
        success: true,
        data: accountStatus
      });
    } catch (error) {
      console.error('Error checking account status:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check account status'
      });
    }
  }

  // Refresh onboarding link
  async refreshOnboardingLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.user?.businessId || req.params.businessId;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required'
        });
        return;
      }

      const onboardingUrl = await this.stripeConnectService.refreshOnboardingLink(businessId);

      res.status(200).json({
        success: true,
        data: {
          onboardingUrl
        }
      });
    } catch (error) {
      console.error('Error refreshing onboarding link:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to refresh onboarding link'
      });
    }
  }

  // Create Stripe dashboard link for business
  async createDashboardLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.user?.businessId || req.params.businessId;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required'
        });
        return;
      }

      const dashboardUrl = await this.stripeConnectService.createDashboardLink(businessId);

      res.status(200).json({
        success: true,
        data: {
          dashboardUrl
        }
      });
    } catch (error) {
      console.error('Error creating dashboard link:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create dashboard link'
      });
    }
  }

  // Get business earnings and analytics
  async getBusinessEarnings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = req.user?.businessId || req.params.businessId;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required'
        });
        return;
      }

      // Parse date filters from query parameters
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
        if (isNaN(startDate.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Invalid start date format'
          });
          return;
        }
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        if (isNaN(endDate.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Invalid end date format'
          });
          return;
        }
      }

      const earnings = await this.stripeConnectService.getBusinessEarnings(businessId, startDate, endDate);

      res.status(200).json({
        success: true,
        data: earnings
      });
    } catch (error) {
      console.error('Error getting business earnings:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get business earnings'
      });
    }
  }

  // Process order payment with platform fee
  async processOrderPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        amount,
        currency = 'usd',
        orderId,
        customerPaymentMethodId,
        platformFeePercentage
      } = req.body;

      const businessId = req.user?.businessId || req.body.businessId;
      
      if (!businessId || !amount || !orderId || !customerPaymentMethodId) {
        res.status(400).json({
          success: false,
          message: 'Business ID, amount, order ID, and payment method are required'
        });
        return;
      }

      const result = await this.stripeConnectService.processOrderPaymentWithPlatformFee({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        businessId,
        orderId,
        customerPaymentMethodId,
        platformFeeConfig: platformFeePercentage ? { platformFeePercentage } : undefined
      });

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          paymentIntentId: result.paymentIntent.id,
          clientSecret: result.paymentIntent.client_secret,
          applicationFeeAmount: result.applicationFeeAmount / 100, // Convert back to dollars
          businessReceives: result.businessReceives / 100,
          platformFee: result.applicationFeeAmount / 100,
          status: result.paymentIntent.status
        }
      });
    } catch (error) {
      console.error('Error processing order payment:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process payment'
      });
    }
  }

  // Handle Stripe Connect webhook events
  async handleConnectWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This endpoint would handle Connect-specific webhook events
      // such as account.updated, account.application.deauthorized, etc.
      
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
      
      if (!endpointSecret || !sig) {
        res.status(400).json({
          success: false,
          message: 'Webhook signature verification failed'
        });
        return;
      }

      // For now, just acknowledge the webhook
      // In production, you'd want to verify the signature and handle specific events
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error handling Connect webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process webhook'
      });
    }
  }
}