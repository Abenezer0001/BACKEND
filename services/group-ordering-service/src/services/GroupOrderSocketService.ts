import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { GroupOrder, IGroupOrder, IGroupOrderItem } from '../models/GroupOrder';
import { PaymentSplitService } from './PaymentSplitService';

export interface AddCartItemData {
  sessionId: string;
  userId: string;
  item: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    customizations?: any[];
  };
  version: number;
}

export interface UpdatePaymentSplitData {
  sessionId: string;
  userId: string;
  splitConfig: {
    method: 'single' | 'equal' | 'individual' | 'percentage';
    payerId?: string;
    itemAssignments?: { [itemId: string]: string[] };
    percentages?: { [userId: string]: number };
  };
}

export interface SpendingLimitCheckData {
  sessionId: string;
  userId: string;
  itemCost: number;
}

export class GroupOrderSocketService {
  private io: Server;
  private paymentSplitService: PaymentSplitService;

  constructor(io: Server) {
    this.io = io;
    this.paymentSplitService = new PaymentSplitService();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected to group ordering service: ${socket.id}`);

      // Join group order room
      socket.on('join-group-order', async (data: { sessionId: string; userId: string }) => {
        try {
          socket.join(data.sessionId);

          // Broadcast user joined
          socket.to(data.sessionId).emit('user-joined', {
            userId: data.userId,
            timestamp: new Date().toISOString()
          });

          // Send current order state
          const groupOrder = await GroupOrder.findOne({ sessionId: data.sessionId })
            .populate('participants.userId', 'firstName lastName')
            .populate('items.menuItemId', 'name description price')
            .lean();

          socket.emit('order-state', groupOrder);

          console.log(`Socket ${socket.id} joined group order ${data.sessionId}`);
        } catch (error) {
          console.error('Error joining group order:', error);
          socket.emit('error', { message: 'Failed to join group order' });
        }
      });

      // Leave group order room
      socket.on('leave-group-order', (data: { sessionId: string; userId: string }) => {
        socket.leave(data.sessionId);
        
        socket.to(data.sessionId).emit('user-left', {
          userId: data.userId,
          timestamp: new Date().toISOString()
        });

        console.log(`Socket ${socket.id} left group order ${data.sessionId}`);
      });

      // Handle cart item operations
      socket.on('add-cart-item', async (data: AddCartItemData) => {
        try {
          const result = await this.addCartItem(data);

          if (result) {
            // Broadcast to all participants
            this.io.to(data.sessionId).emit('cart-updated', {
              operation: 'item-added',
              item: result.item,
              addedBy: data.userId,
              newTotals: result.totals,
              version: result.version,
              timestamp: new Date().toISOString()
            });
          }

        } catch (error) {
          console.error('Error adding cart item:', error);
          socket.emit('operation-error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: 'add-cart-item'
          });
        }
      });

      // Handle item updates
      socket.on('update-cart-item', async (data: {
        sessionId: string;
        userId: string;
        itemId: string;
        updates: Partial<IGroupOrderItem>;
        version: number;
      }) => {
        try {
          const result = await this.updateCartItem(data);

          if (result) {
            this.io.to(data.sessionId).emit('cart-updated', {
              operation: 'item-updated',
              item: result.item,
              updatedBy: data.userId,
              newTotals: result.totals,
              version: result.version,
              timestamp: new Date().toISOString()
            });
          }

        } catch (error) {
          console.error('Error updating cart item:', error);
          socket.emit('operation-error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: 'update-cart-item'
          });
        }
      });

      // Handle item removal
      socket.on('remove-cart-item', async (data: {
        sessionId: string;
        userId: string;
        itemId: string;
        version: number;
      }) => {
        try {
          const result = await this.removeCartItem(data);

          if (result) {
            this.io.to(data.sessionId).emit('cart-updated', {
              operation: 'item-removed',
              itemId: data.itemId,
              removedBy: data.userId,
              newTotals: result.totals,
              version: result.version,
              timestamp: new Date().toISOString()
            });
          }

        } catch (error) {
          console.error('Error removing cart item:', error);
          socket.emit('operation-error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: 'remove-cart-item'
          });
        }
      });

      // Handle payment split updates
      socket.on('update-payment-split', async (data: UpdatePaymentSplitData) => {
        try {
          const assignments = await this.calculatePaymentSplit(data.sessionId, data.splitConfig);

          this.io.to(data.sessionId).emit('payment-split-updated', {
            assignments,
            method: data.splitConfig.method,
            updatedBy: data.userId,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error updating payment split:', error);
          socket.emit('operation-error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: 'update-payment-split'
          });
        }
      });

      // Handle real-time spending limit checks
      socket.on('check-spending-limit', async (data: SpendingLimitCheckData) => {
        try {
          const result = await this.checkSpendingLimit(data.sessionId, data.userId, data.itemCost);

          socket.emit('spending-limit-check', {
            allowed: result.allowed,
            message: result.message,
            currentSpending: result.currentSpending,
            limit: result.limit
          });

        } catch (error) {
          console.error('Error checking spending limit:', error);
          socket.emit('operation-error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: 'check-spending-limit'
          });
        }
      });

      // Handle participant management
      socket.on('join-as-participant', async (data: {
        sessionId: string;
        userId: string;
        userName: string;
        userEmail?: string;
      }) => {
        try {
          const groupOrder = await GroupOrder.findOne({ sessionId: data.sessionId });
          
          if (!groupOrder) {
            socket.emit('operation-error', { message: 'Group order not found' });
            return;
          }

          const participant = {
            userId: new mongoose.Types.ObjectId(data.userId),
            name: data.userName,
            email: data.userEmail,
            joinedAt: new Date(),
            status: 'active' as const,
            lastActivity: new Date()
          };
          groupOrder.participants.push(participant);

          await groupOrder.save();

          // Notify all participants
          this.io.to(data.sessionId).emit('participant-joined', {
            participant: {
              userId: data.userId,
              name: data.userName,
              email: data.userEmail,
              joinedAt: participant.joinedAt
            },
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error joining as participant:', error);
          socket.emit('operation-error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: 'join-as-participant'
          });
        }
      });

      // Handle order submission
      socket.on('submit-group-order', async (data: {
        sessionId: string;
        userId: string;
        deliveryInfo?: {
          address: string;
          instructions?: string;
          scheduledFor?: Date;
        };
      }) => {
        try {
          const result = await this.submitGroupOrder(data.sessionId, data.userId, data.deliveryInfo);

          if (result) {
            this.io.to(data.sessionId).emit('order-submitted', {
              orderId: result.orderId,
              submittedBy: data.userId,
              totalAmount: result.totalAmount,
              paymentAssignments: result.paymentAssignments,
              timestamp: new Date().toISOString()
            });
          }

        } catch (error) {
          console.error('Error submitting group order:', error);
          socket.emit('operation-error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: 'submit-group-order'
          });
        }
      });

      // Handle order cancellation
      socket.on('cancel-group-order', async (data: {
        sessionId: string;
        userId: string;
        reason?: string;
      }) => {
        try {
          await this.cancelGroupOrder(data.sessionId, data.userId, data.reason);

          this.io.to(data.sessionId).emit('order-cancelled', {
            cancelledBy: data.userId,
            reason: data.reason,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error cancelling group order:', error);
          socket.emit('operation-error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: 'cancel-group-order'
          });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected from group ordering service: ${socket.id}`);
      });
    });
  }

  private async addCartItem(data: AddCartItemData) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        const groupOrder = await GroupOrder.findOne({
          sessionId: data.sessionId,
          version: data.version
        }).session(session);

        if (!groupOrder) {
          throw new Error('Order version conflict - please refresh');
        }

        if (groupOrder.status !== 'active') {
          throw new Error('Cannot modify submitted or cancelled order');
        }

        // Check spending limit
        const spendingCheck = await this.checkSpendingLimit(
          data.sessionId,
          data.userId,
          data.item.price * data.item.quantity
        );

        if (!spendingCheck.allowed) {
          throw new Error(spendingCheck.message);
        }

        // Add item to cart
        const newItem = {
          itemId: new mongoose.Types.ObjectId().toString(),
          menuItemId: new mongoose.Types.ObjectId(data.item.menuItemId),
          name: data.item.name,
          price: data.item.price,
          quantity: data.item.quantity,
          customizations: data.item.customizations || [],
          addedBy: new mongoose.Types.ObjectId(data.userId),
          addedAt: new Date(),
          lastModified: new Date(),
          modifiedBy: new mongoose.Types.ObjectId(data.userId)
        };
        groupOrder.items.push(newItem);

        await groupOrder.save({ session });

        return {
          item: newItem,
          totals: groupOrder.totals,
          version: groupOrder.version
        };
      });
    } finally {
      await session.endSession();
    }
  }

  private async updateCartItem(data: {
    sessionId: string;
    userId: string;
    itemId: string;
    updates: Partial<IGroupOrderItem>;
    version: number;
  }) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        const groupOrder = await GroupOrder.findOne({
          sessionId: data.sessionId,
          version: data.version
        }).session(session);

        if (!groupOrder) {
          throw new Error('Order version conflict - please refresh');
        }

        if (groupOrder.status !== 'active') {
          throw new Error('Cannot modify submitted or cancelled order');
        }

        // Check if user can modify this item
        const item = groupOrder.items.find(i => i.itemId === data.itemId);
        if (!item) {
          throw new Error('Item not found');
        }

        if (!groupOrder.settings.allowItemModification && 
            item.addedBy.toString() !== data.userId) {
          throw new Error('Only the person who added the item can modify it');
        }

        // Update item
        Object.assign(item, data.updates);
        const updatedItem = item;

        await groupOrder.save({ session });

        return {
          item: updatedItem,
          totals: groupOrder.totals,
          version: groupOrder.version
        };
      });
    } finally {
      await session.endSession();
    }
  }

  private async removeCartItem(data: {
    sessionId: string;
    userId: string;
    itemId: string;
    version: number;
  }) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        const groupOrder = await GroupOrder.findOne({
          sessionId: data.sessionId,
          version: data.version
        }).session(session);

        if (!groupOrder) {
          throw new Error('Order version conflict - please refresh');
        }

        if (groupOrder.status !== 'active') {
          throw new Error('Cannot modify submitted or cancelled order');
        }

        // Check if user can remove this item
        const item = groupOrder.items.find(i => i.itemId === data.itemId);
        if (!item) {
          throw new Error('Item not found');
        }

        if (item.addedBy.toString() !== data.userId) {
          throw new Error('Only the person who added the item can remove it');
        }

        // Remove item
        groupOrder.items = groupOrder.items.filter(i => i.itemId !== data.itemId);
        await groupOrder.save({ session });

        return {
          totals: groupOrder.totals,
          version: groupOrder.version
        };
      });
    } finally {
      await session.endSession();
    }
  }

  private async calculatePaymentSplit(sessionId: string, splitConfig: any) {
    const groupOrder = await GroupOrder.findOne({ sessionId });
    if (!groupOrder) {
      throw new Error('Group order not found');
    }

    return await this.paymentSplitService.calculatePaymentSplit(sessionId, splitConfig);
  }

  private async checkSpendingLimit(sessionId: string, userId: string, itemCost: number) {
    const groupOrder = await GroupOrder.findOne({ sessionId });
    
    if (!groupOrder) {
      throw new Error('Group order not found');
    }

    if (!groupOrder.settings.spendingLimitRequired) {
      return { allowed: true, message: 'No spending limit set', currentSpending: 0, limit: 0 };
    }

    const userLimit = groupOrder.spendingLimits.find(
      limit => limit.userId.toString() === userId && limit.isActive
    );

    if (!userLimit) {
      return { allowed: true, message: 'No spending limit set for user', currentSpending: 0, limit: 0 };
    }

    const currentSpending = groupOrder.items
      .filter(item => item.addedBy.toString() === userId)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const newTotal = currentSpending + itemCost;

    return {
      allowed: newTotal <= userLimit.limit,
      message: newTotal > userLimit.limit 
        ? `Would exceed spending limit of $${userLimit.limit / 100}` 
        : 'Within spending limit',
      currentSpending: currentSpending / 100,
      limit: userLimit.limit / 100
    };
  }

  private async submitGroupOrder(sessionId: string, userId: string, deliveryInfo?: any) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        const groupOrder = await GroupOrder.findOne({ sessionId }).session(session);
        
        if (!groupOrder) {
          throw new Error('Group order not found');
        }

        if (groupOrder.createdBy.toString() !== userId) {
          throw new Error('Only the order creator can submit the order');
        }

        if (groupOrder.status !== 'active') {
          throw new Error('Order has already been submitted or cancelled');
        }

        if (groupOrder.items.length === 0) {
          throw new Error('Cannot submit empty order');
        }

        // Update delivery info if provided
        if (deliveryInfo) {
          groupOrder.deliveryInfo = deliveryInfo;
        }

        // Mark as submitted
        groupOrder.status = 'submitted';
        await groupOrder.save({ session });

        // Create individual order record
        const Order = mongoose.model('Order');
        const orderData = {
          orderNumber: `GROUP-${Date.now()}`,
          restaurantId: groupOrder.restaurantId,
          userId: groupOrder.createdBy,
          items: groupOrder.items.map(item => ({
            menuItem: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            customizations: item.customizations,
            subtotal: item.price * item.quantity
          })),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          subtotal: groupOrder.totals.subtotal,
          tax: groupOrder.totals.tax,
          tip: groupOrder.totals.tip,
          service_charge: groupOrder.totals.serviceFee,
          total: groupOrder.totals.total,
          orderType: 'DELIVERY',
          deliveryAddress: {
            street: groupOrder.deliveryInfo.address,
            additionalInfo: groupOrder.deliveryInfo.instructions
          },
          metadata: {
            groupOrderId: groupOrder._id,
            sessionId: groupOrder.sessionId,
            participantCount: groupOrder.participants.length
          }
        };

        const order = new Order(orderData);
        await order.save({ session });

        return {
          orderId: order._id,
          totalAmount: groupOrder.totals.total,
          paymentAssignments: groupOrder.paymentSplit.assignments
        };
      });
    } finally {
      await session.endSession();
    }
  }

  private async cancelGroupOrder(sessionId: string, userId: string, reason?: string) {
    const groupOrder = await GroupOrder.findOne({ sessionId });
    
    if (!groupOrder) {
      throw new Error('Group order not found');
    }

    if (groupOrder.createdBy.toString() !== userId) {
      throw new Error('Only the order creator can cancel the order');
    }

    if (groupOrder.status !== 'active') {
      throw new Error('Cannot cancel submitted or already cancelled order');
    }

    groupOrder.status = 'cancelled';
    await groupOrder.save();
  }

  // Broadcast system messages
  async broadcastSystemMessage(sessionId: string, message: {
    type: 'info' | 'warning' | 'error';
    title: string;
    content: string;
  }): Promise<void> {
    this.io.to(sessionId).emit('system-message', {
      ...message,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast order status updates
  async broadcastOrderStatus(sessionId: string, status: {
    orderStatus: string;
    paymentStatus: string;
    estimatedTime?: number;
  }): Promise<void> {
    this.io.to(sessionId).emit('order-status-update', {
      ...status,
      timestamp: new Date().toISOString()
    });
  }
}