import mongoose from 'mongoose';
import Stripe from 'stripe';
import { GroupOrder, IGroupOrder, IPaymentAssignment } from '../models/GroupOrder';

export interface PaymentSplitConfig {
  method: 'single' | 'equal' | 'individual' | 'percentage';
  payerId?: string;
  itemAssignments?: { [itemId: string]: string[] };
  percentages?: { [userId: string]: number };
}

export interface PaymentAssignment {
  userId: string;
  amount: number;
  breakdown: {
    items: number;
    tax: number;
    deliveryFee: number;
    serviceFee: number;
    tip: number;
  };
}

export interface ProcessingResult {
  results: Array<{
    userId: string;
    success: boolean;
    paymentIntentId?: string;
    amount?: number;
    error?: string;
  }>;
  successCount: number;
  totalCount: number;
}

export class PaymentSplitService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async calculatePaymentSplit(sessionId: string, config: PaymentSplitConfig): Promise<PaymentAssignment[]> {
    const groupOrder = await GroupOrder.findOne({ sessionId });
    
    if (!groupOrder) {
      throw new Error('Group order not found');
    }

    switch (config.method) {
      case 'single':
        return this.calculateSinglePayerSplit(groupOrder, config.payerId!);

      case 'equal':
        return this.calculateEqualSplit(groupOrder);

      case 'individual':
        return this.calculateIndividualSplit(groupOrder, config.itemAssignments!);

      case 'percentage':
        return this.calculatePercentageSplit(groupOrder, config.percentages!);

      default:
        throw new Error('Invalid payment split method');
    }
  }

  private calculateSinglePayerSplit(groupOrder: IGroupOrder, payerId: string): PaymentAssignment[] {
    const participant = groupOrder.participants.find(p => 
      p.userId.toString() === payerId && p.status === 'active'
    );

    if (!participant) {
      throw new Error('Payer not found in active participants');
    }

    return [{
      userId: payerId,
      amount: groupOrder.totals.total,
      breakdown: {
        items: groupOrder.totals.subtotal,
        tax: groupOrder.totals.tax,
        deliveryFee: groupOrder.totals.deliveryFee,
        serviceFee: groupOrder.totals.serviceFee,
        tip: groupOrder.totals.tip
      }
    }];
  }

  private calculateEqualSplit(groupOrder: IGroupOrder): PaymentAssignment[] {
    const activeParticipants = groupOrder.participants.filter(p => p.status === 'active');
    
    if (activeParticipants.length === 0) {
      throw new Error('No active participants found');
    }

    const amountPerPerson = Math.round(groupOrder.totals.total / activeParticipants.length);
    const remainder = groupOrder.totals.total - (amountPerPerson * activeParticipants.length);

    // Distribute fees proportionally
    const itemsPerPerson = Math.round(groupOrder.totals.subtotal / activeParticipants.length);
    const taxPerPerson = Math.round(groupOrder.totals.tax / activeParticipants.length);
    const deliveryPerPerson = Math.round(groupOrder.totals.deliveryFee / activeParticipants.length);
    const servicePerPerson = Math.round(groupOrder.totals.serviceFee / activeParticipants.length);
    const tipPerPerson = Math.round(groupOrder.totals.tip / activeParticipants.length);

    return activeParticipants.map((participant, index) => ({
      userId: participant.userId.toString(),
      amount: amountPerPerson + (index === 0 ? remainder : 0), // First person pays remainder
      breakdown: {
        items: itemsPerPerson,
        tax: taxPerPerson,
        deliveryFee: deliveryPerPerson,
        serviceFee: servicePerPerson,
        tip: tipPerPerson
      }
    }));
  }

  private calculateIndividualSplit(
    groupOrder: IGroupOrder,
    itemAssignments: { [itemId: string]: string[] }
  ): PaymentAssignment[] {
    const assignments = new Map<string, { items: number; fees: number }>();

    // Initialize assignments for all active participants
    groupOrder.participants
      .filter(p => p.status === 'active')
      .forEach(participant => {
        assignments.set(participant.userId.toString(), { items: 0, fees: 0 });
      });

    // Assign item costs
    groupOrder.items.forEach(item => {
      const assignedUsers = itemAssignments[item.itemId] || [item.addedBy.toString()];
      const costPerUser = (item.price * item.quantity) / assignedUsers.length;

      assignedUsers.forEach(userId => {
        const assignment = assignments.get(userId);
        if (assignment) {
          assignment.items += costPerUser;
        }
      });
    });

    // Distribute fees proportionally
    const totalItemCost = groupOrder.totals.subtotal;
    const totalFees = groupOrder.totals.tax + groupOrder.totals.deliveryFee +
                     groupOrder.totals.serviceFee + groupOrder.totals.tip;

    const result: PaymentAssignment[] = [];
    assignments.forEach((amounts, userId) => {
      const proportion = amounts.items / totalItemCost;
      const userTax = Math.round(groupOrder.totals.tax * proportion);
      const userDelivery = Math.round(groupOrder.totals.deliveryFee * proportion);
      const userService = Math.round(groupOrder.totals.serviceFee * proportion);
      const userTip = Math.round(groupOrder.totals.tip * proportion);

      result.push({
        userId,
        amount: Math.round(amounts.items) + userTax + userDelivery + userService + userTip,
        breakdown: {
          items: Math.round(amounts.items),
          tax: userTax,
          deliveryFee: userDelivery,
          serviceFee: userService,
          tip: userTip
        }
      });
    });

    return result;
  }

  private calculatePercentageSplit(
    groupOrder: IGroupOrder,
    percentages: { [userId: string]: number }
  ): PaymentAssignment[] {
    // Validate percentages sum to 100
    const totalPercentage = Object.values(percentages).reduce((sum, pct) => sum + pct, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Percentages must sum to 100%');
    }

    const result: PaymentAssignment[] = [];
    
    Object.entries(percentages).forEach(([userId, percentage]) => {
      const participant = groupOrder.participants.find(p => 
        p.userId.toString() === userId && p.status === 'active'
      );

      if (!participant) {
        throw new Error(`User ${userId} not found in active participants`);
      }

      const proportion = percentage / 100;
      const userAmount = Math.round(groupOrder.totals.total * proportion);
      
      result.push({
        userId,
        amount: userAmount,
        breakdown: {
          items: Math.round(groupOrder.totals.subtotal * proportion),
          tax: Math.round(groupOrder.totals.tax * proportion),
          deliveryFee: Math.round(groupOrder.totals.deliveryFee * proportion),
          serviceFee: Math.round(groupOrder.totals.serviceFee * proportion),
          tip: Math.round(groupOrder.totals.tip * proportion)
        }
      });
    });

    return result;
  }

  async processGroupPayments(sessionId: string, assignments: PaymentAssignment[]): Promise<ProcessingResult> {
    const results: Array<{
      userId: string;
      success: boolean;
      paymentIntentId?: string;
      amount?: number;
      error?: string;
    }> = [];
    const transferGroup = `group_order_${sessionId}`;

    // Get user payment methods
    const User = mongoose.model('User');

    for (const assignment of assignments) {
      try {
        const user = await User.findById(assignment.userId);
        
        if (!user || !user.stripeCustomerId || !user.defaultPaymentMethodId) {
          results.push({
            userId: assignment.userId,
            success: false,
            error: 'No payment method available'
          });
          continue;
        }

        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: assignment.amount,
          currency: 'usd',
          customer: user.stripeCustomerId,
          payment_method: user.defaultPaymentMethodId,
          confirm: true,
          transfer_group: transferGroup,
          metadata: {
            groupOrderSessionId: sessionId,
            userId: assignment.userId,
            type: 'group_order_payment',
            breakdown: JSON.stringify(assignment.breakdown)
          }
        });

        results.push({
          userId: assignment.userId,
          success: true,
          paymentIntentId: paymentIntent.id,
          amount: assignment.amount
        });

      } catch (error) {
        console.error(`Payment failed for user ${assignment.userId}:`, error);
        results.push({
          userId: assignment.userId,
          success: false,
          error: error instanceof Error ? error.message : 'Payment processing failed'
        });
      }
    }

    // Update group order with payment results
    await this.updateGroupOrderPayments(sessionId, results);

    return {
      results,
      successCount: results.filter(r => r.success).length,
      totalCount: results.length
    };
  }

  private async updateGroupOrderPayments(sessionId: string, results: ProcessingResult['results']): Promise<void> {
    const groupOrder = await GroupOrder.findOne({ sessionId });
    
    if (!groupOrder) {
      throw new Error('Group order not found');
    }

    // Update payment assignments with results
    results.forEach(result => {
      const assignment = groupOrder.paymentSplit.assignments.find(a => 
        a.userId.toString() === result.userId
      );

      if (assignment) {
        assignment.status = result.success ? 'completed' : 'failed';
        if (result.paymentIntentId) {
          assignment.paymentIntentId = result.paymentIntentId;
        }
      }
    });

    groupOrder.paymentSplit.completedPayments = results.filter(r => r.success).length;
    groupOrder.paymentSplit.totalPayments = results.length;

    // Update order status if all payments completed
    if (groupOrder.paymentSplit.completedPayments === groupOrder.paymentSplit.totalPayments) {
      groupOrder.status = 'completed';
    }

    await groupOrder.save();
  }

  async refundGroupOrderPayment(sessionId: string, userId: string, reason?: string): Promise<Stripe.Refund> {
    const groupOrder = await GroupOrder.findOne({ sessionId });
    
    if (!groupOrder) {
      throw new Error('Group order not found');
    }

    const assignment = groupOrder.paymentSplit.assignments.find(a => 
      a.userId.toString() === userId && a.status === 'completed'
    );

    if (!assignment || !assignment.paymentIntentId) {
      throw new Error('Payment not found or not completed');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: assignment.paymentIntentId,
        metadata: {
          groupOrderSessionId: sessionId,
          userId,
          refundReason: reason || 'Customer request'
        }
      });

      // Update assignment status
      assignment.status = 'failed'; // Mark as failed after refund
      groupOrder.paymentSplit.completedPayments -= 1;
      
      await groupOrder.save();

      return refund;
    } catch (error) {
      console.error('Error refunding group order payment:', error);
      throw error;
    }
  }

  async createPaymentIntent(sessionId: string, userId: string, amount: number): Promise<Stripe.PaymentIntent> {
    const User = mongoose.model('User');
    const user = await User.findById(userId);

    if (!user || !user.stripeCustomerId) {
      throw new Error('User not found or Stripe customer not set up');
    }

    return await this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: user.stripeCustomerId,
      setup_future_usage: 'off_session',
      metadata: {
        groupOrderSessionId: sessionId,
        userId,
        type: 'group_order_payment_intent'
      }
    });
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    });
  }

  // Get payment summary for a group order
  async getPaymentSummary(sessionId: string): Promise<{
    totalAmount: number;
    assignments: Array<{
      userId: string;
      userName: string;
      amount: number;
      status: string;
      breakdown: any;
    }>;
    paymentStatus: 'pending' | 'partial' | 'completed' | 'failed';
  }> {
    const groupOrder = await GroupOrder.findOne({ sessionId })
      .populate('participants.userId', 'firstName lastName')
      .lean();

    if (!groupOrder) {
      throw new Error('Group order not found');
    }

    const assignments = groupOrder.paymentSplit.assignments.map(assignment => {
      const participant = groupOrder.participants.find(p => 
        p.userId.toString() === assignment.userId.toString()
      );

      return {
        userId: assignment.userId.toString(),
        userName: participant ? `${participant.name}` : 'Unknown User',
        amount: assignment.amount / 100, // Convert to dollars
        status: assignment.status,
        breakdown: {
          items: (assignment.amount * 0.7) / 100, // Approximate breakdown
          fees: (assignment.amount * 0.3) / 100
        }
      };
    });

    let paymentStatus: 'pending' | 'partial' | 'completed' | 'failed' = 'pending';
    
    if (groupOrder.paymentSplit.completedPayments === 0) {
      paymentStatus = 'pending';
    } else if (groupOrder.paymentSplit.completedPayments === groupOrder.paymentSplit.totalPayments) {
      paymentStatus = 'completed';
    } else if (groupOrder.paymentSplit.completedPayments > 0) {
      paymentStatus = 'partial';
    }

    return {
      totalAmount: groupOrder.totals.total / 100,
      assignments,
      paymentStatus
    };
  }
}