import { Server } from 'socket.io';
import mongoose from 'mongoose';

export interface TipNotificationData {
  amount: number;
  customer?: string;
  source: string;
  rating?: number;
  feedback?: string;
  tableNumber?: string;
}

export interface TipRefundData {
  amount: number;
  refundReason: string;
  originalDate: Date;
}

export class TipNotificationService {
  private io: Server | null = null;

  constructor(io?: Server) {
    this.io = io || null;
  }

  setSocketServer(io: Server): void {
    this.io = io;
  }

  async notifyTipReceived(staffId: string, tipData: TipNotificationData): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for tip notifications');
      return;
    }

    try {
      // Notify the specific staff member
      this.io.to(`staff-${staffId}`).emit('tip-received', {
        ...tipData,
        timestamp: new Date().toISOString()
      });

      // Get staff details for restaurant notification
      const Staff = mongoose.model('Staff');
      const staff = await Staff.findById(staffId);
      
      if (staff) {
        // Notify restaurant management
        this.io.to(`restaurant-admin-${staff.restaurantId}`).emit('staff-tip-received', {
          staffId,
          staffName: `${staff.firstName} ${staff.lastName}`,
          amount: tipData.amount / 100, // Convert to dollars
          source: tipData.source,
          tableNumber: tipData.tableNumber,
          timestamp: new Date().toISOString()
        });

        // Notify other staff members (for team morale and transparency)
        this.io.to(`restaurant-staff-${staff.restaurantId}`).emit('team-tip-received', {
          staffName: `${staff.firstName} ${staff.lastName}`,
          amount: tipData.amount / 100,
          source: tipData.source,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`Tip notification sent to staff ${staffId}`);
    } catch (error) {
      console.error('Error sending tip notification:', error);
    }
  }

  async notifyTipRefund(staffId: string, refundData: TipRefundData): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for tip notifications');
      return;
    }

    try {
      // Notify the specific staff member
      this.io.to(`staff-${staffId}`).emit('tip-refunded', {
        ...refundData,
        amount: refundData.amount / 100, // Convert to dollars
        timestamp: new Date().toISOString()
      });

      console.log(`Tip refund notification sent to staff ${staffId}`);
    } catch (error) {
      console.error('Error sending tip refund notification:', error);
    }
  }

  async notifyPayoutCompleted(staffId: string, payoutData: {
    amount: number;
    payoutId: string;
    estimatedArrival: Date;
  }): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for tip notifications');
      return;
    }

    try {
      this.io.to(`staff-${staffId}`).emit('payout-completed', {
        ...payoutData,
        amount: payoutData.amount / 100, // Convert to dollars
        timestamp: new Date().toISOString()
      });

      console.log(`Payout notification sent to staff ${staffId}`);
    } catch (error) {
      console.error('Error sending payout notification:', error);
    }
  }

  async notifyDailyTipSummary(staffId: string, summaryData: {
    totalTips: number;
    tipCount: number;
    topTip: number;
    averageTip: number;
    date: string;
  }): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for tip notifications');
      return;
    }

    try {
      this.io.to(`staff-${staffId}`).emit('daily-tip-summary', {
        ...summaryData,
        totalTips: summaryData.totalTips / 100,
        topTip: summaryData.topTip / 100,
        averageTip: summaryData.averageTip / 100,
        timestamp: new Date().toISOString()
      });

      console.log(`Daily tip summary sent to staff ${staffId}`);
    } catch (error) {
      console.error('Error sending daily tip summary:', error);
    }
  }

  async notifyTipPoolDistribution(restaurantId: string, distributionData: {
    totalAmount: number;
    participantCount: number;
    distributionMethod: string;
    participants: Array<{
      staffId: string;
      name: string;
      amount: number;
      percentage: number;
    }>;
  }): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for tip notifications');
      return;
    }

    try {
      // Notify all participants
      distributionData.participants.forEach(participant => {
        this.io!.to(`staff-${participant.staffId}`).emit('tip-pool-distributed', {
          personalAmount: participant.amount / 100,
          personalPercentage: participant.percentage,
          totalPoolAmount: distributionData.totalAmount / 100,
          participantCount: distributionData.participantCount,
          distributionMethod: distributionData.distributionMethod,
          timestamp: new Date().toISOString()
        });
      });

      // Notify restaurant management
      this.io.to(`restaurant-admin-${restaurantId}`).emit('tip-pool-distribution-complete', {
        ...distributionData,
        totalAmount: distributionData.totalAmount / 100,
        participants: distributionData.participants.map(p => ({
          ...p,
          amount: p.amount / 100
        })),
        timestamp: new Date().toISOString()
      });

      console.log(`Tip pool distribution notifications sent for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error sending tip pool distribution notifications:', error);
    }
  }

  async notifyHighTipAlert(restaurantId: string, alertData: {
    staffId: string;
    staffName: string;
    amount: number;
    source: string;
    threshold: number;
  }): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for tip notifications');
      return;
    }

    try {
      // Notify restaurant management of unusually high tip
      this.io.to(`restaurant-admin-${restaurantId}`).emit('high-tip-alert', {
        ...alertData,
        amount: alertData.amount / 100,
        threshold: alertData.threshold / 100,
        timestamp: new Date().toISOString()
      });

      console.log(`High tip alert sent for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error sending high tip alert:', error);
    }
  }

  async notifyAccountStatusChange(staffId: string, statusData: {
    oldStatus: string;
    newStatus: string;
    reason?: string;
  }): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for tip notifications');
      return;
    }

    try {
      this.io.to(`staff-${staffId}`).emit('account-status-changed', {
        ...statusData,
        timestamp: new Date().toISOString()
      });

      console.log(`Account status change notification sent to staff ${staffId}`);
    } catch (error) {
      console.error('Error sending account status change notification:', error);
    }
  }

  // Socket room management
  setupSocketRooms(socket: any): void {
    socket.on('join-staff-room', (staffId: string) => {
      socket.join(`staff-${staffId}`);
      console.log(`Socket ${socket.id} joined staff-${staffId}`);
    });

    socket.on('leave-staff-room', (staffId: string) => {
      socket.leave(`staff-${staffId}`);
      console.log(`Socket ${socket.id} left staff-${staffId}`);
    });

    socket.on('join-restaurant-admin', (restaurantId: string) => {
      socket.join(`restaurant-admin-${restaurantId}`);
      console.log(`Socket ${socket.id} joined restaurant-admin-${restaurantId}`);
    });

    socket.on('join-restaurant-staff', (restaurantId: string) => {
      socket.join(`restaurant-staff-${restaurantId}`);
      console.log(`Socket ${socket.id} joined restaurant-staff-${restaurantId}`);
    });

    socket.on('join-tip-customer', (sessionId: string) => {
      socket.join(`tip-session-${sessionId}`);
      console.log(`Socket ${socket.id} joined tip-session-${sessionId}`);
    });
  }

  // Customer-facing tip notifications
  async notifyTipProcessing(sessionId: string, data: {
    status: 'processing' | 'succeeded' | 'failed';
    amount?: number;
    staffName?: string;
    error?: string;
  }): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for tip notifications');
      return;
    }

    try {
      this.io.to(`tip-session-${sessionId}`).emit('tip-status-update', {
        ...data,
        amount: data.amount ? data.amount / 100 : undefined,
        timestamp: new Date().toISOString()
      });

      console.log(`Tip processing notification sent for session ${sessionId}`);
    } catch (error) {
      console.error('Error sending tip processing notification:', error);
    }
  }
}