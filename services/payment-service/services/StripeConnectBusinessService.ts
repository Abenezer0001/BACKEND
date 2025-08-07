import Stripe from 'stripe';
import mongoose from 'mongoose';

export interface BusinessOnboardingData {
  businessId: string;
  businessName: string;
  businessEmail: string;
  legalName?: string;
  businessType: 'individual' | 'company';
  country: string;
  businessUrl?: string;
  businessDescription?: string;
  businessAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  businessOwner?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: {
      day: number;
      month: number;
      year: number;
    };
  };
}

export interface BusinessConnectResult {
  accountId: string;
  onboardingUrl: string;
  accountStatus: string;
  businessId: string;
}

export interface PlatformFeeConfig {
  platformFeePercentage: number;
  applicationFeeAmount?: number; // Fixed amount instead of percentage
}

export class StripeConnectBusinessService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createBusinessAccount(businessData: BusinessOnboardingData): Promise<BusinessConnectResult> {
    const session = await mongoose.startSession();
    
    try {
      const result = await session.withTransaction(async () => {
        // Create Stripe Express account for the business
        const account = await this.stripe.accounts.create({
          type: 'express',
          country: businessData.country,
          email: businessData.businessEmail,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: businessData.businessType,
          company: businessData.businessType === 'company' ? {
            name: businessData.legalName || businessData.businessName,
            ...(businessData.businessAddress && {
              address: businessData.businessAddress
            })
          } : undefined,
          individual: businessData.businessType === 'individual' && businessData.businessOwner ? {
            first_name: businessData.businessOwner.firstName,
            last_name: businessData.businessOwner.lastName,
            email: businessData.businessOwner.email,
            phone: businessData.businessOwner.phone,
            ...(businessData.businessOwner.dateOfBirth && {
              dob: businessData.businessOwner.dateOfBirth
            }),
            ...(businessData.businessAddress && {
              address: businessData.businessAddress
            })
          } : undefined,
          business_profile: {
            url: businessData.businessUrl,
            product_description: businessData.businessDescription || 'Restaurant and food service business'
          },
          settings: {
            payouts: {
              schedule: {
                interval: 'weekly',
                weekly_anchor: 'friday'
              }
            }
          }
        });

        // Create onboarding link
        const accountLink = await this.stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.FRONTEND_URL}/business/stripe-connect/refresh?business_id=${businessData.businessId}`,
          return_url: `${process.env.FRONTEND_URL}/business/stripe-connect/complete?business_id=${businessData.businessId}`,
          type: 'account_onboarding'
        });

        // Update business record with Stripe Connect information
        const Business = mongoose.model('Business');
        const business = await Business.findById(businessData.businessId).session(session);
        
        if (!business) {
          throw new Error('Business not found');
        }

        // Initialize stripeConnectAccount if it doesn't exist
        if (!business.stripeConnectAccount) {
          business.stripeConnectAccount = {};
        }
        
        // Initialize platformSettings if it doesn't exist
        if (!business.platformSettings) {
          business.platformSettings = {
            platformFeePercentage: 5.0,
            enableAutomaticPayouts: true,
            payoutSchedule: 'weekly'
          };
        }

        business.stripeConnectAccount.accountId = account.id;
        business.stripeConnectAccount.accountStatus = 'pending';
        business.stripeConnectAccount.onboardingUrl = accountLink.url;
        business.stripeConnectAccount.onboardingCompleted = false;
        business.stripeConnectAccount.chargesEnabled = account.charges_enabled;
        business.stripeConnectAccount.payoutsEnabled = account.payouts_enabled;
        business.stripeConnectAccount.detailsSubmitted = account.details_submitted;
        business.stripeConnectAccount.requirementsDue = account.requirements?.currently_due || [];
        business.stripeConnectAccount.lastStatusCheck = new Date();

        await business.save({ session });

        return {
          accountId: account.id,
          onboardingUrl: accountLink.url,
          accountStatus: 'pending' as const,
          businessId: businessData.businessId
        };
      }) as BusinessConnectResult | null;
      
      if (!result) {
        throw new Error('Transaction failed to complete');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating business account:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async refreshOnboardingLink(businessId: string): Promise<string> {
    const Business = mongoose.model('Business');
    const business = await Business.findById(businessId);
    
    if (!business || !business.stripeConnectAccount?.accountId) {
      throw new Error('Business not found or Stripe account not set up');
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: business.stripeConnectAccount.accountId,
      refresh_url: `${process.env.FRONTEND_URL}/business/stripe-connect/refresh?business_id=${businessId}`,
      return_url: `${process.env.FRONTEND_URL}/business/stripe-connect/complete?business_id=${businessId}`,
      type: 'account_onboarding'
    });

    // Update the onboarding URL in the database
    business.stripeConnectAccount.onboardingUrl = accountLink.url;
    business.stripeConnectAccount.lastStatusCheck = new Date();
    await business.save();

    return accountLink.url;
  }

  async checkAccountStatus(businessId: string): Promise<any> {
    const Business = mongoose.model('Business');
    const business = await Business.findById(businessId);
    
    if (!business) {
      throw new Error('Business not found');
    }
    
    // If business exists but no Stripe Connect account is set up
    if (!business.stripeConnectAccount?.accountId) {
      return {
        accountId: null,
        accountStatus: 'not_connected',
        needsOnboarding: true,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingCompleted: false,
        businessName: business.name,
        message: 'Stripe Connect account not set up. Please complete onboarding to start accepting payments.'
      };
    }

    const account = await this.stripe.accounts.retrieve(business.stripeConnectAccount.accountId);

    // Determine account status
    let accountStatus = 'pending';
    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
      accountStatus = 'active';
    } else if (account.details_submitted) {
      accountStatus = 'pending';
    } else if (account.requirements?.disabled_reason) {
      accountStatus = 'rejected';
    }

    // Update business record with latest information
    business.stripeConnectAccount.accountStatus = accountStatus as any;
    business.stripeConnectAccount.onboardingCompleted = account.details_submitted;
    business.stripeConnectAccount.chargesEnabled = account.charges_enabled;
    business.stripeConnectAccount.payoutsEnabled = account.payouts_enabled;
    business.stripeConnectAccount.detailsSubmitted = account.details_submitted;
    business.stripeConnectAccount.requirementsDue = account.requirements?.currently_due || [];
    business.stripeConnectAccount.lastStatusCheck = new Date();

    await business.save();

    return {
      accountId: account.id,
      accountStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingCompleted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
        disabledReason: account.requirements?.disabled_reason
      },
      payoutSchedule: account.settings?.payouts?.schedule
    };
  }

  async processOrderPaymentWithPlatformFee(orderData: {
    amount: number;
    currency: string;
    businessId: string;
    orderId: string;
    customerPaymentMethodId: string;
    platformFeeConfig?: PlatformFeeConfig;
  }): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    applicationFeeAmount: number;
    businessReceives: number;
  }> {
    const Business = mongoose.model('Business');
    const business = await Business.findById(orderData.businessId);
    
    if (!business || !business.stripeConnectAccount?.accountId) {
      throw new Error('Business not found or Stripe Connect not set up');
    }

    if (business.stripeConnectAccount.accountStatus !== 'active') {
      throw new Error('Business Stripe account is not active for payments');
    }

    // Calculate platform fee
    const platformFeePercentage = orderData.platformFeeConfig?.platformFeePercentage || 
                                 business.platformSettings?.platformFeePercentage || 5.0;
    
    const applicationFeeAmount = Math.round((orderData.amount * platformFeePercentage) / 100);
    const businessReceives = orderData.amount - applicationFeeAmount;

    // Create payment intent with application fee
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: orderData.amount,
      currency: orderData.currency,
      payment_method: orderData.customerPaymentMethodId,
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: business.stripeConnectAccount.accountId,
      },
      metadata: {
        orderId: orderData.orderId,
        businessId: orderData.businessId,
        platformFeePercentage: platformFeePercentage.toString(),
        applicationFeeAmount: applicationFeeAmount.toString()
      },
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment/success`
    });

    return {
      paymentIntent,
      applicationFeeAmount,
      businessReceives
    };
  }

  async createDashboardLink(businessId: string): Promise<string> {
    const Business = mongoose.model('Business');
    const business = await Business.findById(businessId);
    
    if (!business || !business.stripeConnectAccount?.accountId) {
      throw new Error('Business not found or Stripe account not set up');
    }

    const link = await this.stripe.accounts.createLoginLink(
      business.stripeConnectAccount.accountId
    );

    return link.url;
  }

  async getBusinessEarnings(businessId: string, startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    platformFees: number;
    netEarnings: number;
    payoutsPending: number;
    payoutsCompleted: number;
    transactionCount: number;
  }> {
    const Business = mongoose.model('Business');
    const business = await Business.findById(businessId);
    
    if (!business) {
      throw new Error('Business not found');
    }
    
    // If business exists but no Stripe Connect account is set up
    if (!business.stripeConnectAccount?.accountId) {
      return {
        totalRevenue: 0,
        platformFees: 0,
        netEarnings: 0,
        payoutsPending: 0,
        payoutsCompleted: 0,
        transactionCount: 0
      };
    }

    const accountId = business.stripeConnectAccount.accountId;

    // Get balance
    const balance = await this.stripe.balance.retrieve({
      stripeAccount: accountId
    });

    // Get charges for the period
    const charges = await this.stripe.charges.list({
      limit: 100,
      created: {
        gte: startDate ? Math.floor(startDate.getTime() / 1000) : undefined,
        lte: endDate ? Math.floor(endDate.getTime() / 1000) : undefined
      }
    }, {
      stripeAccount: accountId
    });

    // Calculate totals
    let totalRevenue = 0;
    let platformFees = 0;
    let transactionCount = 0;

    charges.data.forEach(charge => {
      if (charge.status === 'succeeded') {
        totalRevenue += charge.amount;
        // Platform fees are stored in application_fee_amount
        if (charge.application_fee_amount) {
          platformFees += charge.application_fee_amount;
        }
        transactionCount++;
      }
    });

    const netEarnings = totalRevenue - platformFees;
    const payoutsPending = balance.pending.reduce((sum, bal) => sum + bal.amount, 0);
    const payoutsCompleted = balance.available.reduce((sum, bal) => sum + bal.amount, 0);

    return {
      totalRevenue: totalRevenue / 100, // Convert from cents
      platformFees: platformFees / 100,
      netEarnings: netEarnings / 100,
      payoutsPending: payoutsPending / 100,
      payoutsCompleted: payoutsCompleted / 100,
      transactionCount
    };
  }
}