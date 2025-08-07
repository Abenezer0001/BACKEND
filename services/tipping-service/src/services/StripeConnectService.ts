import Stripe from 'stripe';
import mongoose from 'mongoose';
import { Staff } from '../models/Staff';
import QRCode from 'qrcode';

export interface StaffOnboardingData {
  restaurantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'server' | 'bartender' | 'busser' | 'food_runner' | 'host' | 'kitchen';
  country?: string;
  dateOfBirth?: {
    day: number;
    month: number;
    year: number;
  };
}

export interface ConnectedAccountResult {
  accountId: string;
  onboardingUrl: string;
  staffMember: any;
}

export class StripeConnectService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createStaffAccount(staffData: StaffOnboardingData): Promise<ConnectedAccountResult> {
    const session = await mongoose.startSession();
    
    try {
      const result = await session.withTransaction(async (): Promise<ConnectedAccountResult> => {
        // Check if staff member already exists
        const existingStaff = await Staff.findOne({
          restaurantId: new mongoose.Types.ObjectId(staffData.restaurantId),
          email: staffData.email
        }).session(session);

        if (existingStaff) {
          throw new Error('Staff member with this email already exists');
        }

        // Generate unique QR code
        const qrCode = await this.generateUniqueQRCode(staffData.restaurantId, staffData.employeeId);
        const qrCodeUrl = `${process.env.FRONTEND_URL}/tip/${qrCode}`;

        // Create Express connected account
        const account = await this.stripe.accounts.create({
          type: 'express',
          country: staffData.country || 'US',
          email: staffData.email,
          capabilities: {
            card_payments: { requested: false }, // Staff don't need to accept payments
            transfers: { requested: true }
          },
          business_type: 'individual',
          individual: {
            first_name: staffData.firstName,
            last_name: staffData.lastName,
            email: staffData.email,
            phone: staffData.phone,
            dob: staffData.dateOfBirth
          },
          settings: {
            payouts: {
              schedule: {
                interval: 'daily',
                delay_days: 2
              }
            }
          },
          tos_acceptance: {
            service_agreement: 'recipient'
          }
        });

        // Create staff record in database
        const staffMember = new Staff({
          restaurantId: new mongoose.Types.ObjectId(staffData.restaurantId),
          employeeId: staffData.employeeId,
          firstName: staffData.firstName,
          lastName: staffData.lastName,
          email: staffData.email,
          phone: staffData.phone,
          role: staffData.role,
          stripeAccountId: account.id,
          accountStatus: 'pending',
          qrCode,
          qrCodeExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        });

        await staffMember.save({ session });

        // Generate QR code image
        const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Generate onboarding link
        const accountLink = await this.stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.FRONTEND_URL}/staff/onboarding/refresh?staff_id=${staffMember._id}`,
          return_url: `${process.env.FRONTEND_URL}/staff/onboarding/complete?staff_id=${staffMember._id}`,
          type: 'account_onboarding'
        });

        return {
          accountId: account.id,
          onboardingUrl: accountLink.url,
          staffMember: {
            ...staffMember.toObject(),
            qrCodeDataUrl,
            qrCodeUrl
          }
        };
      });
      
      if (!result) {
        throw new Error('Transaction failed to complete');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating staff account:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async refreshOnboardingLink(staffId: string): Promise<string> {
    const staff = await Staff.findById(staffId);
    
    if (!staff || !staff.stripeAccountId) {
      throw new Error('Staff member not found or Stripe account not set up');
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: staff.stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/staff/onboarding/refresh?staff_id=${staffId}`,
      return_url: `${process.env.FRONTEND_URL}/staff/onboarding/complete?staff_id=${staffId}`,
      type: 'account_onboarding'
    });

    return accountLink.url;
  }

  async checkAccountStatus(staffId: string): Promise<any> {
    const staff = await Staff.findById(staffId);
    
    if (!staff || !staff.stripeAccountId) {
      throw new Error('Staff member not found or Stripe account not set up');
    }

    const account = await this.stripe.accounts.retrieve(staff.stripeAccountId);
    
    // Update staff account status based on Stripe account status
    let accountStatus: 'pending' | 'active' | 'restricted' = 'pending';
    
    if (account.charges_enabled && account.payouts_enabled) {
      accountStatus = 'active';
    } else if (account.requirements?.disabled_reason) {
      accountStatus = 'restricted';
    }

    // Update database if status changed
    if (staff.accountStatus !== accountStatus) {
      staff.accountStatus = accountStatus;
      await staff.save();
    }

    return {
      accountId: account.id,
      accountStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
        disabledReason: account.requirements?.disabled_reason
      },
      balanceAvailable: null, // Balance available needs to be fetched separately
      payoutSchedule: account.settings?.payouts?.schedule
    };
  }

  async generateLoginLink(staffId: string): Promise<string> {
    const staff = await Staff.findById(staffId);
    
    if (!staff || !staff.stripeAccountId) {
      throw new Error('Staff member not found or Stripe account not set up');
    }

    const loginLink = await this.stripe.accounts.createLoginLink(staff.stripeAccountId);
    return loginLink.url;
  }

  async updatePayoutSchedule(
    staffId: string,
    schedule: {
      interval: 'daily' | 'weekly' | 'monthly';
      delay_days?: number;
    }
  ): Promise<void> {
    const staff = await Staff.findById(staffId);
    
    if (!staff || !staff.stripeAccountId) {
      throw new Error('Staff member not found or Stripe account not set up');
    }

    await this.stripe.accounts.update(staff.stripeAccountId, {
      settings: {
        payouts: {
          schedule: {
            interval: schedule.interval,
            delay_days: schedule.delay_days || 2
          }
        }
      }
    });

    // Update local preferences
    if (schedule.interval === 'daily') {
      staff.tipSettings.preferredPayoutSchedule = 'daily';
    } else if (schedule.interval === 'weekly') {
      staff.tipSettings.preferredPayoutSchedule = 'weekly';
    }

    await staff.save();
  }

  async getAccountBalance(staffId: string): Promise<any> {
    const staff = await Staff.findById(staffId);
    
    if (!staff || !staff.stripeAccountId) {
      throw new Error('Staff member not found or Stripe account not set up');
    }

    const balance = await this.stripe.balance.retrieve({
      stripeAccount: staff.stripeAccountId
    });

    return {
      available: balance.available.map(b => ({
        amount: b.amount / 100, // Convert to dollars
        currency: b.currency
      })),
      pending: balance.pending.map(b => ({
        amount: b.amount / 100,
        currency: b.currency
      }))
    };
  }

  async createInstantPayout(staffId: string, amount: number): Promise<Stripe.Payout> {
    const staff = await Staff.findById(staffId);
    
    if (!staff || !staff.stripeAccountId) {
      throw new Error('Staff member not found or Stripe account not set up');
    }

    if (!staff.tipSettings.instantPayouts) {
      throw new Error('Instant payouts not enabled for this staff member');
    }

    if (amount < staff.tipSettings.minimumPayout) {
      throw new Error(`Amount must be at least $${staff.tipSettings.minimumPayout / 100}`);
    }

    const payout = await this.stripe.payouts.create({
      amount: amount,
      currency: 'usd',
      method: 'instant'
    }, {
      stripeAccount: staff.stripeAccountId
    });

    return payout;
  }

  private async generateUniqueQRCode(restaurantId: string, employeeId: string): Promise<string> {
    let qrCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Generate QR code: restaurant_id + employee_id + random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      qrCode = `${restaurantId.substring(0, 8)}_${employeeId}_${randomSuffix}`;
      
      const existing = await Staff.findOne({ qrCode });
      if (!existing) {
        break;
      }
      
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique QR code');
    }

    return qrCode;
  }

  async regenerateQRCode(staffId: string): Promise<{ qrCode: string; qrCodeUrl: string; qrCodeDataUrl: string }> {
    const staff = await Staff.findById(staffId);
    
    if (!staff) {
      throw new Error('Staff member not found');
    }

    const newQRCode = await this.generateUniqueQRCode(
      staff.restaurantId.toString(),
      staff.employeeId
    );

    const qrCodeUrl = `${process.env.FRONTEND_URL}/tip/${newQRCode}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    staff.qrCode = newQRCode;
    staff.qrCodeExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    await staff.save();

    return {
      qrCode: newQRCode,
      qrCodeUrl,
      qrCodeDataUrl
    };
  }

  async deleteStaffAccount(staffId: string): Promise<void> {
    const staff = await Staff.findById(staffId);
    
    if (!staff) {
      throw new Error('Staff member not found');
    }

    if (staff.stripeAccountId) {
      try {
        await this.stripe.accounts.del(staff.stripeAccountId);
      } catch (error) {
        console.error('Error deleting Stripe account:', error);
        // Continue with soft delete even if Stripe deletion fails
      }
    }

    // Soft delete - mark as inactive
    staff.isActive = false;
    staff.accountStatus = 'restricted';
    await staff.save();
  }
}