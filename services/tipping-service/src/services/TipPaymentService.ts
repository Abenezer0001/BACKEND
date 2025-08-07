import Stripe from 'stripe';
import mongoose from 'mongoose';
import { Staff, TipTransaction, ITipTransaction } from '../models/Staff';
import { TipNotificationService } from './TipNotificationService';

export interface TipPaymentData {
  staffId: string;
  amount: number;
  customerId?: string;
  paymentMethodId: string;
  source: 'qr_code' | 'pos_system' | 'mobile_app' | 'website';
  tableNumber?: string;
  orderId?: string;
  customerFeedback?: string;
  rating?: number;
  metadata?: any;
}

export interface PaymentResult {
  paymentIntent: Stripe.PaymentIntent;
  tipTransaction: ITipTransaction;
  transfer?: Stripe.Transfer;
}

export class TipPaymentService {
  private stripe: Stripe;
  private notificationService: TipNotificationService;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    
    this.notificationService = new TipNotificationService();
  }

  async processTipPayment(tipData: TipPaymentData): Promise<PaymentResult> {
    const session = await mongoose.startSession();
    
    try {
      const result = await session.withTransaction(async (): Promise<PaymentResult> => {
        const staff = await Staff.findById(tipData.staffId).session(session);
        
        if (!staff || !staff.isActive) {
          throw new Error('Staff member not found or inactive');
        }

        if (!staff.stripeAccountId || staff.accountStatus !== 'active') {
          throw new Error('Staff member not eligible for tips - Stripe account not set up');
        }

        // Calculate processing fee (3% platform fee)
        const processingFee = Math.round(tipData.amount * 0.03);
        const netAmount = tipData.amount - processingFee;

        // Create payment intent with application fee for platform
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: tipData.amount,
          currency: 'usd',
          payment_method: tipData.paymentMethodId,
          customer: tipData.customerId,
          confirm: true,

          // Direct transfer to staff member's connected account
          transfer_data: {
            destination: staff.stripeAccountId,
            amount: netAmount
          },

          // Platform keeps application fee
          application_fee_amount: processingFee,

          metadata: {
            ...tipData.metadata,
            staffId: tipData.staffId,
            restaurantId: staff.restaurantId.toString(),
            tipType: 'direct',
            source: tipData.source,
            tableNumber: tipData.tableNumber || '',
            orderId: tipData.orderId || ''
          }
        });

        // Record tip transaction
        const tipTransaction = new TipTransaction({
          restaurantId: staff.restaurantId,
          staffId: tipData.staffId,
          customerId: tipData.customerId,
          orderId: tipData.orderId ? new mongoose.Types.ObjectId(tipData.orderId) : undefined,
          amount: tipData.amount,
          currency: 'usd',
          stripePaymentIntentId: paymentIntent.id,
          paymentMethodId: tipData.paymentMethodId,
          tipType: 'direct',
          source: tipData.source,
          tableNumber: tipData.tableNumber,
          status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
          processingFee,
          netAmount,
          customerFeedback: tipData.customerFeedback,
          rating: tipData.rating,
          metadata: tipData.metadata || {},
          processedAt: paymentIntent.status === 'succeeded' ? new Date() : undefined
        });

        await tipTransaction.save({ session });

        // Create transfer if payment succeeded
        let transfer: Stripe.Transfer | undefined;
        if (paymentIntent.status === 'succeeded') {
          transfer = await this.stripe.transfers.create({
            amount: netAmount,
            currency: 'usd',
            destination: staff.stripeAccountId,
            transfer_group: `tip_${tipTransaction._id}`,
            metadata: {
              tipTransactionId: tipTransaction._id.toString(),
              staffId: tipData.staffId,
              restaurantId: staff.restaurantId.toString(),
              source: tipData.source
            }
          });
        }

        return { paymentIntent, tipTransaction, transfer };
      });
      
      if (!result) {
        throw new Error('Transaction failed to complete');
      }
      
      return result;
    } catch (error) {
      console.error('Error processing tip payment:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async processAutoGratuity(
    orderId: string,
    gratuityPercentage: number,
    orderTotal: number
  ): Promise<PaymentResult[]> {
    const Order = mongoose.model('Order');
    const order = await Order.findById(orderId).populate('restaurantId');
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Get staff members who participated in serving this order
    const staff = await Staff.find({
      restaurantId: order.restaurantId,
      isActive: true,
      'tipSettings.participateInTipPool': true
    });

    if (staff.length === 0) {
      throw new Error('No eligible staff members found for auto-gratuity');
    }

    const totalTipAmount = Math.round(orderTotal * (gratuityPercentage / 100));
    const tipPerStaff = Math.round(totalTipAmount / staff.length);

    const results: PaymentResult[] = [];

    for (const staffMember of staff) {
      try {
        const tipData: TipPaymentData = {
          staffId: staffMember._id.toString(),
          amount: tipPerStaff,
          source: 'pos_system',
          paymentMethodId: 'auto_gratuity', // Special identifier for auto-gratuity
          orderId,
          metadata: {
            autoGratuity: true,
            gratuityPercentage,
            orderTotal,
            staffCount: staff.length
          }
        };

        // For auto-gratuity, we bypass Stripe and directly create transaction records
        const tipTransaction = new TipTransaction({
          restaurantId: staffMember.restaurantId,
          staffId: staffMember._id,
          orderId: new mongoose.Types.ObjectId(orderId),
          amount: tipPerStaff,
          currency: 'usd',
          stripePaymentIntentId: `auto_gratuity_${orderId}_${staffMember._id}`,
          paymentMethodId: 'auto_gratuity',
          tipType: 'auto_gratuity',
          source: 'pos_system',
          status: 'completed',
          processingFee: 0, // No processing fee for auto-gratuity
          netAmount: tipPerStaff,
          metadata: tipData.metadata,
          processedAt: new Date()
        });

        await tipTransaction.save();

        results.push({
          paymentIntent: {} as Stripe.PaymentIntent, // Mock for consistency
          tipTransaction
        });

      } catch (error) {
        console.error(`Error processing auto-gratuity for staff ${staffMember._id}:`, error);
      }
    }

    return results;
  }

  async refundTip(tipTransactionId: string, reason?: string): Promise<Stripe.Refund> {
    const tipTransaction = await TipTransaction.findById(tipTransactionId);
    
    if (!tipTransaction) {
      throw new Error('Tip transaction not found');
    }

    if (tipTransaction.status !== 'completed') {
      throw new Error('Can only refund completed transactions');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: tipTransaction.stripePaymentIntentId,
        metadata: {
          tipTransactionId: tipTransactionId,
          refundReason: reason || 'Customer request'
        }
      });

      // Update transaction status
      tipTransaction.status = 'refunded';
      await tipTransaction.save();

      // Notify staff member
      await this.notificationService.notifyTipRefund(
        tipTransaction.staffId.toString(),
        {
          amount: tipTransaction.amount,
          refundReason: reason || 'Customer request',
          originalDate: tipTransaction.createdAt
        }
      );

      return refund;
    } catch (error) {
      console.error('Error refunding tip:', error);
      throw error;
    }
  }

  async getTipStatistics(staffId: string, startDate: Date, endDate: Date): Promise<any> {
    const tips = await TipTransaction.find({
      staffId: new mongoose.Types.ObjectId(staffId),
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const totalTips = tips.reduce((sum, tip) => sum + tip.netAmount, 0);
    const tipCount = tips.length;
    const averageTip = tipCount > 0 ? totalTips / tipCount : 0;

    // Group by source
    const tipsBySource = tips.reduce((acc, tip) => {
      acc[tip.source] = (acc[tip.source] || 0) + tip.netAmount;
      return acc;
    }, {} as Record<string, number>);

    // Group by day
    const tipsByDay = tips.reduce((acc, tip) => {
      const day = tip.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + tip.netAmount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTips: totalTips / 100, // Convert to dollars
      tipCount,
      averageTip: averageTip / 100,
      tipsBySource: Object.entries(tipsBySource).map(([source, amount]) => ({
        source,
        amount: amount / 100
      })),
      dailyTips: Object.entries(tipsByDay).map(([date, amount]) => ({
        date,
        amount: amount / 100
      }))
    };
  }

  async getRestaurantTipStatistics(restaurantId: string, startDate: Date, endDate: Date): Promise<any> {
    const pipeline = [
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTips: { $sum: '$netAmount' },
          tipCount: { $sum: 1 },
          averageTip: { $avg: '$netAmount' },
          tipsByStaff: {
            $push: {
              staffId: '$staffId',
              amount: '$netAmount',
              source: '$source'
            }
          }
        }
      }
    ];

    const result = await TipTransaction.aggregate(pipeline);
    
    if (result.length === 0) {
      return {
        totalTips: 0,
        tipCount: 0,
        averageTip: 0,
        topEarners: [],
        tipsBySource: []
      };
    }

    const stats = result[0];

    // Calculate top earners
    const staffTips = stats.tipsByStaff.reduce((acc: any, tip: any) => {
      const staffId = tip.staffId.toString();
      acc[staffId] = (acc[staffId] || 0) + tip.amount;
      return acc;
    }, {});

    const topEarners = Object.entries(staffTips)
      .map(([staffId, amount]) => ({ staffId, amount: (amount as number) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate tips by source
    const sourceStats = stats.tipsByStaff.reduce((acc: any, tip: any) => {
      acc[tip.source] = (acc[tip.source] || 0) + tip.amount;
      return acc;
    }, {});

    const tipsBySource = Object.entries(sourceStats).map(([source, amount]) => ({
      source,
      amount: (amount as number) / 100
    }));

    return {
      totalTips: stats.totalTips / 100,
      tipCount: stats.tipCount,
      averageTip: stats.averageTip / 100,
      topEarners,
      tipsBySource
    };
  }
}