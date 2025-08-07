import mongoose from 'mongoose';
import LoyaltyProgram, { ILoyaltyProgram } from '../models/LoyaltyProgram';
import CustomerLoyalty, { ICustomerLoyalty, ILoyaltyVisit } from '../models/CustomerLoyalty';

export interface LoyaltyDiscount {
  discountPercent: number;
  discountAmount: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  timeBonusPercent: number;
  frequencyBonusPercent: number;
  isFirstTime: boolean;
  expiresAt?: Date;
  message: string;
}

export interface LoyaltyCalculationResult {
  isEligible: boolean;
  discount?: LoyaltyDiscount;
  customerLoyalty?: ICustomerLoyalty;
  error?: string;
}

export class LoyaltyService {
  /**
   * Calculate loyalty discount for a customer at a restaurant
   */
  static async calculateDiscount(
    customerId: string,
    restaurantId: string,
    orderAmount: number
  ): Promise<LoyaltyCalculationResult> {
    try {
      // Check if restaurant has loyalty program enabled
      const loyaltyProgram = await LoyaltyProgram.findOne({ 
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        isEnabled: true 
      });

      if (!loyaltyProgram) {
        return { isEligible: false, error: 'Loyalty program not available for this restaurant' };
      }

      // Get or create customer loyalty record
      let customerLoyalty = await CustomerLoyalty.findOne({
        customerId: new mongoose.Types.ObjectId(customerId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId)
      });

      // If first visit, apply first-time discount
      if (!customerLoyalty) {
        const discountPercent = loyaltyProgram.settings.firstTimeDiscountPercent;
        const discountAmount = Math.round((orderAmount * discountPercent / 100) * 100) / 100;

        return {
          isEligible: true,
          discount: {
            discountPercent,
            discountAmount,
            tier: 'bronze',
            timeBonusPercent: 0,
            frequencyBonusPercent: 0,
            isFirstTime: true,
            message: `Welcome! Get ${discountPercent}% off your first order!`
          }
        };
      }

      // Check if customer has visited today (multiple orders in same day = 1 visit)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const hasVisitedToday = customerLoyalty.visits.some(visit => 
        visit.visitDate >= today && visit.visitDate < tomorrow
      );

      // If already visited today, no additional loyalty discount
      if (hasVisitedToday) {
        return {
          isEligible: false,
          error: 'Loyalty discount already applied for today',
          customerLoyalty
        };
      }

      // Calculate time-based discount
      const daysSinceLastVisit = this.getDaysBetween(customerLoyalty.lastVisitDate, new Date());
      const timeBonusPercent = this.getTimeBonusPercent(daysSinceLastVisit, loyaltyProgram.settings.timeBased);

      // Calculate frequency-based bonus
      const frequencyBonusPercent = this.getFrequencyBonusPercent(
        customerLoyalty.totalVisits, 
        loyaltyProgram.settings.frequencyTiers
      );

      // Calculate total discount with cap
      let totalDiscountPercent = timeBonusPercent + frequencyBonusPercent;
      if (totalDiscountPercent > loyaltyProgram.settings.maxDiscountCap) {
        totalDiscountPercent = loyaltyProgram.settings.maxDiscountCap;
      }

      const discountAmount = Math.round((orderAmount * totalDiscountPercent / 100) * 100) / 100;

      // Calculate expiry (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      return {
        isEligible: true,
        discount: {
          discountPercent: totalDiscountPercent,
          discountAmount,
          tier: customerLoyalty.currentTier,
          timeBonusPercent,
          frequencyBonusPercent,
          isFirstTime: false,
          expiresAt,
          message: this.getDiscountMessage(
            customerLoyalty.currentTier,
            totalDiscountPercent,
            timeBonusPercent,
            frequencyBonusPercent
          )
        },
        customerLoyalty
      };

    } catch (error) {
      console.error('Error calculating loyalty discount:', error);
      return { 
        isEligible: false, 
        error: 'Failed to calculate loyalty discount' 
      };
    }
  }

  /**
   * Apply loyalty discount and record visit
   */
  static async applyDiscount(
    customerId: string,
    restaurantId: string,
    orderAmount: number,
    discountAmount: number,
    discountPercent: number
  ): Promise<{ success: boolean; customerLoyalty?: ICustomerLoyalty; error?: string }> {
    try {
      const customerObjectId = new mongoose.Types.ObjectId(customerId);
      const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);

      // Get or create customer loyalty record
      let customerLoyalty = await CustomerLoyalty.findOne({
        customerId: customerObjectId,
        restaurantId: restaurantObjectId
      });

      const loyaltyProgram = await LoyaltyProgram.findOne({ 
        restaurantId: restaurantObjectId,
        isEnabled: true 
      });

      if (!loyaltyProgram) {
        return { success: false, error: 'Loyalty program not available' };
      }

      const visitData: ILoyaltyVisit = {
        visitDate: new Date(),
        orderAmount,
        discountApplied: discountAmount,
        discountPercent,
        tierAtVisit: customerLoyalty?.currentTier || 'bronze',
        timeBonusPercent: 0,
        frequencyBonusPercent: 0
      };

      if (!customerLoyalty) {
        // First-time customer
        customerLoyalty = new CustomerLoyalty({
          customerId: customerObjectId,
          restaurantId: restaurantObjectId,
          totalVisits: 1,
          firstVisitDate: new Date(),
          lastVisitDate: new Date(),
          currentTier: 'bronze',
          hasUsedFirstTimeDiscount: true,
          visits: [visitData],
          totalSpent: orderAmount,
          totalSavings: discountAmount,
          isActive: true
        });
      } else {
        // Check if already visited today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const hasVisitedToday = customerLoyalty.visits.some(visit => 
          visit.visitDate >= today && visit.visitDate < tomorrow
        );

        if (!hasVisitedToday) {
          // New visit (not same day)
          customerLoyalty.totalVisits += 1;
          customerLoyalty.lastVisitDate = new Date();
          
          // Calculate time and frequency bonuses for the visit record
          const daysSinceLastVisit = this.getDaysBetween(customerLoyalty.lastVisitDate, new Date());
          visitData.timeBonusPercent = this.getTimeBonusPercent(daysSinceLastVisit, loyaltyProgram.settings.timeBased);
          visitData.frequencyBonusPercent = this.getFrequencyBonusPercent(
            customerLoyalty.totalVisits - 1, // Previous visit count
            loyaltyProgram.settings.frequencyTiers
          );
        }

        customerLoyalty.visits.push(visitData);
        customerLoyalty.totalSpent += orderAmount;
        customerLoyalty.totalSavings += discountAmount;

        // Update tier based on total visits
        customerLoyalty.currentTier = this.calculateTier(
          customerLoyalty.totalVisits,
          loyaltyProgram.settings.frequencyTiers
        );
      }

      await customerLoyalty.save();

      return { success: true, customerLoyalty };

    } catch (error) {
      console.error('Error applying loyalty discount:', error);
      return { success: false, error: 'Failed to apply loyalty discount' };
    }
  }

  /**
   * Get customer loyalty status
   */
  static async getCustomerLoyaltyStatus(
    customerId: string,
    restaurantId: string
  ): Promise<{ 
    success: boolean; 
    data?: {
      customerLoyalty: ICustomerLoyalty;
      nextTierInfo: any;
      availableDiscount?: LoyaltyDiscount;
    };
    error?: string;
  }> {
    try {
      const customerLoyalty = await CustomerLoyalty.findOne({
        customerId: new mongoose.Types.ObjectId(customerId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId)
      });

      if (!customerLoyalty) {
        // Check if restaurant has loyalty program
        const loyaltyProgram = await LoyaltyProgram.findOne({ 
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          isEnabled: true 
        });

        if (!loyaltyProgram) {
          return { success: false, error: 'Loyalty program not available for this restaurant' };
        }

        // First-time customer
        return {
          success: true,
          data: {
            customerLoyalty: {
              totalVisits: 0,
              currentTier: 'bronze',
              hasUsedFirstTimeDiscount: false,
              totalSpent: 0,
              totalSavings: 0
            } as any,
            nextTierInfo: { tier: 'Silver', visitsRemaining: 6, isMaxTier: false },
            availableDiscount: {
              discountPercent: loyaltyProgram.settings.firstTimeDiscountPercent,
              discountAmount: 0, // Will be calculated at checkout
              tier: 'bronze',
              timeBonusPercent: 0,
              frequencyBonusPercent: 0,
              isFirstTime: true,
              message: `Welcome! Get ${loyaltyProgram.settings.firstTimeDiscountPercent}% off your first order!`
            }
          }
        };
      }

      const nextTierInfo = (customerLoyalty as any).getNextTierInfo();

      return {
        success: true,
        data: {
          customerLoyalty,
          nextTierInfo
        }
      };

    } catch (error) {
      console.error('Error getting customer loyalty status:', error);
      return { success: false, error: 'Failed to get loyalty status' };
    }
  }

  /**
   * Get restaurant loyalty analytics
   */
  static async getRestaurantAnalytics(restaurantId: string) {
    try {
      const pipeline = [
        { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            totalVisits: { $sum: '$totalVisits' },
            totalSpent: { $sum: '$totalSpent' },
            totalSavings: { $sum: '$totalSavings' },
            tierDistribution: {
              $push: '$currentTier'
            }
          }
        }
      ];

      const result = await CustomerLoyalty.aggregate(pipeline);
      
      if (result.length === 0) {
        return {
          totalCustomers: 0,
          totalVisits: 0,
          totalSpent: 0,
          totalSavings: 0,
          tierDistribution: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
        };
      }

      const data = result[0];
      
      // Calculate tier distribution
      const tierCounts = data.tierDistribution.reduce((acc: any, tier: string) => {
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {});

      return {
        totalCustomers: data.totalCustomers,
        totalVisits: data.totalVisits,
        totalSpent: data.totalSpent,
        totalSavings: data.totalSavings,
        averageVisitsPerCustomer: Math.round((data.totalVisits / data.totalCustomers) * 100) / 100,
        averageSpentPerCustomer: Math.round((data.totalSpent / data.totalCustomers) * 100) / 100,
        tierDistribution: {
          bronze: tierCounts.bronze || 0,
          silver: tierCounts.silver || 0,
          gold: tierCounts.gold || 0,
          platinum: tierCounts.platinum || 0
        }
      };

    } catch (error) {
      console.error('Error getting restaurant analytics:', error);
      throw error;
    }
  }

  // Helper methods

  private static getDaysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / oneDay);
  }

  private static getTimeBonusPercent(daysSinceLastVisit: number, timeBased: any): number {
    if (daysSinceLastVisit === 0) return timeBased.within24Hours;
    if (daysSinceLastVisit <= 1) return timeBased.within24Hours;
    if (daysSinceLastVisit <= 3) return timeBased.within2To3Days;
    if (daysSinceLastVisit <= 5) return timeBased.within4To5Days;
    return timeBased.after5Days;
  }

  private static getFrequencyBonusPercent(totalVisits: number, frequencyTiers: any): number {
    if (totalVisits >= frequencyTiers.platinum.minVisits) return frequencyTiers.platinum.bonusPercent;
    if (totalVisits >= frequencyTiers.gold.minVisits) return frequencyTiers.gold.bonusPercent;
    if (totalVisits >= frequencyTiers.silver.minVisits) return frequencyTiers.silver.bonusPercent;
    return frequencyTiers.bronze.bonusPercent;
  }

  private static calculateTier(totalVisits: number, frequencyTiers: any): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (totalVisits >= frequencyTiers.platinum.minVisits) return 'platinum';
    if (totalVisits >= frequencyTiers.gold.minVisits) return 'gold';
    if (totalVisits >= frequencyTiers.silver.minVisits) return 'silver';
    return 'bronze';
  }

  private static getDiscountMessage(
    tier: string,
    totalPercent: number,
    timeBonus: number,
    frequencyBonus: number
  ): string {
    const tierNames = {
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
      platinum: 'Platinum'
    };

    let message = `You're a ${tierNames[tier as keyof typeof tierNames]} member! `;
    
    if (timeBonus > 0 && frequencyBonus > 0) {
      message += `Get ${timeBonus}% for quick return + ${frequencyBonus}% tier bonus = ${totalPercent}% off!`;
    } else if (timeBonus > 0) {
      message += `Get ${timeBonus}% off for your quick return!`;
    } else {
      message += `Get ${totalPercent}% off!`;
    }

    return message;
  }
}