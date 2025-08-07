import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { IRatingCache } from '../models/Review';

export class RatingNotificationService {
  private io: Server | null = null;

  constructor(io?: Server) {
    this.io = io || null;
  }

  setSocketServer(io: Server): void {
    this.io = io;
  }

  async broadcastRatingUpdate(
    menuItemId: string, 
    newRatingSummary: IRatingCache['aggregatedData']
  ): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for rating notifications');
      return;
    }

    try {
      // Notify users viewing this menu item
      this.io.to(`menu-item-${menuItemId}`).emit('rating-updated', {
        menuItemId,
        ratingSummary: newRatingSummary,
        timestamp: new Date().toISOString()
      });

      // Notify restaurant dashboard
      const MenuItem = mongoose.model('MenuItem');
      const menuItem = await MenuItem.findById(menuItemId);
      
      if (menuItem) {
        this.io.to(`restaurant-${menuItem.restaurantId}`).emit('menu-rating-changed', {
          menuItemId,
          itemName: menuItem.name,
          newAverage: newRatingSummary.average,
          newCount: newRatingSummary.count,
          trend: newRatingSummary.recentTrend,
          timestamp: new Date().toISOString()
        });

        // Notify admin dashboards
        this.io.to(`admin-${menuItem.restaurantId}`).emit('rating-analytics-update', {
          menuItemId,
          itemName: menuItem.name,
          aggregatedData: newRatingSummary,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`Rating update broadcasted for menu item ${menuItemId}`);
    } catch (error) {
      console.error('Error broadcasting rating update:', error);
    }
  }

  async broadcastRestaurantRatingUpdate(
    restaurantId: string,
    newRatingSummary: IRatingCache['aggregatedData']
  ): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for rating notifications');
      return;
    }

    try {
      // Notify restaurant discovery views
      this.io.to('restaurant-discovery').emit('restaurant-rating-updated', {
        restaurantId,
        ratingSummary: newRatingSummary,
        timestamp: new Date().toISOString()
      });

      // Notify specific restaurant views
      this.io.to(`restaurant-${restaurantId}`).emit('overall-rating-updated', {
        restaurantId,
        ratingSummary: newRatingSummary,
        timestamp: new Date().toISOString()
      });

      console.log(`Restaurant rating update broadcasted for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error broadcasting restaurant rating update:', error);
    }
  }

  async notifyNewReview(
    restaurantId: string,
    reviewData: {
      menuItemId: string;
      itemName: string;
      rating: number;
      comment: string;
      userName: string;
      verifiedPurchase: boolean;
    }
  ): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for rating notifications');
      return;
    }

    try {
      // Notify restaurant staff
      this.io.to(`restaurant-staff-${restaurantId}`).emit('new-review-received', {
        ...reviewData,
        timestamp: new Date().toISOString()
      });

      // Notify admin dashboard
      this.io.to(`admin-${restaurantId}`).emit('new-review-notification', {
        ...reviewData,
        timestamp: new Date().toISOString(),
        requiresAttention: reviewData.rating <= 2 // Flag low ratings for attention
      });

      console.log(`New review notification sent for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error sending new review notification:', error);
    }
  }

  async notifyRatingMilestone(
    restaurantId: string,
    milestoneData: {
      menuItemId: string;
      itemName: string;
      milestone: string;
      currentCount: number;
      currentAverage: number;
    }
  ): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized for rating notifications');
      return;
    }

    try {
      // Notify restaurant admin
      this.io.to(`admin-${restaurantId}`).emit('rating-milestone-achieved', {
        ...milestoneData,
        timestamp: new Date().toISOString()
      });

      console.log(`Rating milestone notification sent for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error sending rating milestone notification:', error);
    }
  }

  // Join socket rooms for rating updates
  setupSocketRooms(socket: any): void {
    socket.on('join-menu-item', (menuItemId: string) => {
      socket.join(`menu-item-${menuItemId}`);
      console.log(`Socket ${socket.id} joined menu-item-${menuItemId}`);
    });

    socket.on('leave-menu-item', (menuItemId: string) => {
      socket.leave(`menu-item-${menuItemId}`);
      console.log(`Socket ${socket.id} left menu-item-${menuItemId}`);
    });

    socket.on('join-restaurant', (restaurantId: string) => {
      socket.join(`restaurant-${restaurantId}`);
      console.log(`Socket ${socket.id} joined restaurant-${restaurantId}`);
    });

    socket.on('leave-restaurant', (restaurantId: string) => {
      socket.leave(`restaurant-${restaurantId}`);
      console.log(`Socket ${socket.id} left restaurant-${restaurantId}`);
    });

    socket.on('join-restaurant-discovery', () => {
      socket.join('restaurant-discovery');
      console.log(`Socket ${socket.id} joined restaurant-discovery`);
    });

    socket.on('join-admin-dashboard', (restaurantId: string) => {
      socket.join(`admin-${restaurantId}`);
      console.log(`Socket ${socket.id} joined admin-${restaurantId}`);
    });

    socket.on('join-restaurant-staff', (restaurantId: string) => {
      socket.join(`restaurant-staff-${restaurantId}`);
      console.log(`Socket ${socket.id} joined restaurant-staff-${restaurantId}`);
    });
  }
}