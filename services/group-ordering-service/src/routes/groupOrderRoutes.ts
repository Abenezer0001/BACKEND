import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { GroupOrder, IGroupOrder, IGroupOrderItem } from '../models/GroupOrder';
import { v4 as uuidv4 } from 'uuid';
import { authenticateOptional } from '../../../auth-service/src/middleware/auth';

const router = Router();

// Utility function to generate unique invite code
const generateInviteCode = (): string => {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (code.length < 6);
  return code;
};

// Utility function to validate ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * POST /api/group-orders/create
 * Create a new group order session
 */
router.post('/create', authenticateOptional, async (req: Request, res: Response) => {
  try {
    console.log('📋 Creating group order session:', req.body);
    
    const {
      restaurantId,
      tableId,
      paymentStructure = 'equal_split',
      maxParticipants = 8,
      spendingLimitRequired = false,
      sessionDuration = 3600, // 1 hour default
      settings = {},
      deliveryInfo
    } = req.body;

    // Validate required fields
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID is required'
      });
    }

    if (!isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid restaurant ID format'
      });
    }

    // Generate unique session ID and invite code
    const sessionId = uuidv4();
    const inviteCode = generateInviteCode();
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + sessionDuration * 1000);
    
    // Create group order using the model
    const groupOrder = new GroupOrder({
      sessionId,
      inviteCode,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      tableId: tableId ? new mongoose.Types.ObjectId(tableId) : undefined,
      createdBy: (req as any).user?.userId ? new mongoose.Types.ObjectId((req as any).user.userId) : new mongoose.Types.ObjectId(),
      status: 'active',
      expiresAt,
      maxParticipants,
      participants: [],
      items: [],
      totals: {
        subtotal: 0,
        tax: 0,
        deliveryFee: 0,
        serviceFee: 0,
        tip: 0,
        total: 0
      },
      paymentStructure,
      paymentSplit: {
        method: paymentStructure === 'equal_split' ? 'equal' : 'individual',
        assignments: [],
        completedPayments: 0,
        totalPayments: 0
      },
      spendingLimits: [],
      spendingLimitRequired,
      deliveryInfo: deliveryInfo || undefined,
      settings: {
        allowItemModification: settings.allowItemModification ?? true,
        requireApprovalForItems: settings.requireApprovalForItems ?? false,
        allowAnonymousParticipants: settings.allowAnonymousParticipants ?? true
      },
      version: 0
    });

    // Save to database
    const savedGroupOrder = await groupOrder.save();
    
    console.log('✅ Group order created successfully:', {
      id: savedGroupOrder._id,
      sessionId,
      inviteCode,
      restaurantId,
      tableId
    });

    // Return the created group order
    res.status(201).json({
      success: true,
      message: 'Group order session created successfully',
      data: {
        groupOrderId: savedGroupOrder._id,
        sessionId,
        inviteCode,
        expiresAt,
        maxParticipants,
        paymentStructure,
        settings: savedGroupOrder.settings
      }
    });

  } catch (error: any) {
    console.error('❌ Error creating group order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group order session',
      error: error.message
    });
  }
});

/**
 * POST /api/group-orders/join
 * Join an existing group order using invite code
 */
router.post('/join', authenticateOptional, async (req: Request, res: Response) => {
  try {
    console.log('👥 Joining group order:', req.body);
    
    const { inviteCode, userName, userEmail } = req.body;
    
    // Get userId from authenticated user or request body
    const userId = (req as any).user?.userId || req.body.userId;
    
    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: 'Invite code is required'
      });
    }

    if (!userName) {
      return res.status(400).json({
        success: false,
        message: 'User name is required'
      });
    }

    // Find group order by invite code
    const groupOrder = await GroupOrder.findOne({ 
      inviteCode: inviteCode.toUpperCase(),
      status: 'active'
    });

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Group order not found or has expired'
      });
    }

    // Check if session has expired
    if (groupOrder.isExpired()) {
      // Update status to expired
      groupOrder.status = 'expired';
      await groupOrder.save();
      
      return res.status(400).json({
        success: false,
        message: 'Group order session has expired'
      });
    }

    // Add participant to group order
    try {
      const participant = groupOrder.addParticipant(
        userName,
        userEmail,
        userId ? new mongoose.Types.ObjectId(userId) : undefined
      );

      // Save the updated group order
      await groupOrder.save();

      console.log('✅ User joined group order successfully:', {
        groupOrderId: groupOrder._id,
        participantId: participant.participantId,
        userName,
        inviteCode
      });

      // Return updated group order data
      res.status(200).json({
        success: true,
        message: 'Successfully joined group order',
        data: {
          groupOrderId: groupOrder._id,
          participantId: participant.participantId,
          participant: {
            participantId: participant.participantId,
            name: participant.name,
            email: participant.email,
            isAnonymous: participant.isAnonymous,
            joinedAt: participant.joinedAt,
            spendingLimit: participant.spendingLimit,
            currentSpent: participant.currentSpent
          },
          groupOrder: {
            _id: groupOrder._id,
            inviteCode: groupOrder.inviteCode,
            restaurantId: groupOrder.restaurantId,
            tableId: groupOrder.tableId,
            status: groupOrder.status,
            expiresAt: groupOrder.expiresAt,
            maxParticipants: groupOrder.maxParticipants,
            participants: groupOrder.participants,
            paymentStructure: groupOrder.paymentStructure,
            spendingLimitRequired: groupOrder.spendingLimitRequired,
            settings: groupOrder.settings
          }
        }
      });

    } catch (participantError: any) {
      console.error('❌ Error adding participant:', participantError);
      return res.status(400).json({
        success: false,
        message: participantError.message || 'Failed to join group order'
      });
    }

  } catch (error: any) {
    console.error('❌ Error joining group order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join group order',
      error: error.message
    });
  }
});

/**
 * GET /api/group-orders/validate-join-code
 * Validate a join code without joining
 */
router.get('/validate-join-code', async (req: Request, res: Response) => {
  try {
    const { code, joinCode } = req.query;
    const joinCodeValue = (joinCode || code) as string;

    if (!joinCodeValue || typeof joinCodeValue !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Join code is required'
      });
    }

    const groupOrder = await GroupOrder.findOne({
      inviteCode: joinCodeValue.toUpperCase(),
      status: 'active'
    });

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired join code',
        data: {
          isValid: false
        }
      });
    }

    // Check if expired
    if (groupOrder.isExpired()) {
      groupOrder.status = 'expired';
      await groupOrder.save();

      return res.status(400).json({
        success: false,
        message: 'Group order session has expired',
        data: {
          isValid: false
        }
      });
    }

    // Check if group is full
    const activeParticipants = groupOrder.participants.filter(p => p.status === 'active');
    const isFull = activeParticipants.length >= groupOrder.maxParticipants;

    res.status(200).json({
      success: true,
      message: 'Join code is valid',
      data: {
        isValid: true,
        groupOrder: {
          _id: groupOrder._id,
          restaurantName: 'Restaurant Name', // TODO: populate from restaurant
          tableNumber: 'Table', // TODO: populate from table
          participantCount: activeParticipants.length,
          status: groupOrder.status,
          expiresAt: groupOrder.expiresAt
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error validating join code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate join code',
      error: error.message
    });
  }
});

/**
 * GET /api/group-orders/:groupOrderId
 * Get group order details by ID
 */
router.get('/:groupOrderId', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { groupOrderId } = req.params;
    
    if (!isValidObjectId(groupOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group order ID format'
      });
    }

    const groupOrder = await GroupOrder.findById(groupOrderId);

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Group order not found'
      });
    }

    // Check if expired and update status
    if (groupOrder.isExpired() && groupOrder.status === 'active') {
      groupOrder.status = 'expired';
      await groupOrder.save();
    }

    res.status(200).json({
      success: true,
      data: {
        groupOrder: {
          _id: groupOrder._id,
          sessionId: groupOrder.sessionId,
          inviteCode: groupOrder.inviteCode,
          restaurantId: groupOrder.restaurantId,
          tableId: groupOrder.tableId,
          status: groupOrder.status,
          expiresAt: groupOrder.expiresAt,
          maxParticipants: groupOrder.maxParticipants,
          participants: groupOrder.participants,
          items: groupOrder.items,
          totals: groupOrder.totals,
          paymentStructure: groupOrder.paymentStructure,
          paymentSplit: groupOrder.paymentSplit,
          spendingLimits: groupOrder.spendingLimits,
          spendingLimitRequired: groupOrder.spendingLimitRequired,
          deliveryInfo: groupOrder.deliveryInfo,
          settings: groupOrder.settings,
          createdAt: groupOrder.createdAt,
          updatedAt: groupOrder.updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching group order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group order',
      error: error.message
    });
  }
});

/**
 * POST /api/group-orders/:groupOrderId/leave
 * Leave a group order
 */
router.post('/:groupOrderId/leave', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { groupOrderId } = req.params;
    const { participantId } = req.body;

    if (!isValidObjectId(groupOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group order ID format'
      });
    }

    if (!participantId || !isValidObjectId(participantId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid participant ID is required'
      });
    }

    const groupOrder = await GroupOrder.findById(groupOrderId);

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Group order not found'
      });
    }

    // Remove participant from group order
    groupOrder.removeParticipant(new mongoose.Types.ObjectId(participantId));
    await groupOrder.save();

    console.log('✅ User left group order successfully:', {
      groupOrderId,
      participantId
    });

    res.status(200).json({
      success: true,
      message: 'Successfully left group order',
      data: {
        groupOrderId: groupOrder._id,
        participants: groupOrder.participants.filter(p => p.status === 'active')
      }
    });

  } catch (error: any) {
    console.error('❌ Error leaving group order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave group order',
      error: error.message
    });
  }
});

/**
 * PUT /api/group-orders/:groupOrderId/spending-limits
 * Update spending limits for the group order
 */
router.put('/:groupOrderId/spending-limits', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { groupOrderId } = req.params;
    const { spendingLimitRequired, participantLimits } = req.body;

    if (!isValidObjectId(groupOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group order ID format'
      });
    }

    const groupOrder = await GroupOrder.findById(groupOrderId);

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Group order not found'
      });
    }

    // Update global spending limit requirement
    if (typeof spendingLimitRequired === 'boolean') {
      groupOrder.spendingLimitRequired = spendingLimitRequired;
    }

    // Update individual participant limits
    if (participantLimits && Array.isArray(participantLimits)) {
      for (const limitData of participantLimits) {
        if (limitData.participantId && typeof limitData.limit === 'number') {
          groupOrder.updateSpendingLimit(
            new mongoose.Types.ObjectId(limitData.participantId),
            limitData.limit
          );
        }
      }
    }

    await groupOrder.save();

    res.status(200).json({
      success: true,
      message: 'Spending limits updated successfully',
      data: {
        spendingLimitRequired: groupOrder.spendingLimitRequired,
        spendingLimits: groupOrder.spendingLimits,
        participants: groupOrder.participants
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating spending limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update spending limits',
      error: error.message
    });
  }
});

/**
 * PUT /api/group-orders/:groupOrderId/spending-limits/:participantId
 * Update spending limit for a specific participant
 */
router.put('/:groupOrderId/spending-limits/:participantId', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { groupOrderId, participantId } = req.params;
    const { limit } = req.body;

    if (!isValidObjectId(groupOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group order ID format'
      });
    }

    if (!isValidObjectId(participantId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid participant ID format'
      });
    }

    if (typeof limit !== 'number' || limit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid spending limit is required'
      });
    }

    const groupOrder = await GroupOrder.findById(groupOrderId);

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Group order not found'
      });
    }

    // Update spending limit for the participant
    groupOrder.updateSpendingLimit(new mongoose.Types.ObjectId(participantId), limit);
    await groupOrder.save();

    const updatedParticipant = groupOrder.participants.find(p => 
      p.participantId.toString() === participantId
    );

    res.status(200).json({
      success: true,
      message: 'Participant spending limit updated successfully',
      data: {
        participantId,
        spendingLimit: limit,
        participant: updatedParticipant
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating participant spending limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update participant spending limit',
      error: error.message
    });
  }
});

/**
 * POST /api/group-orders/:groupOrderId/add-items
 * Add items to a group order
 */
router.post('/:groupOrderId/add-items', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { groupOrderId } = req.params;
    const { items } = req.body;

    if (!isValidObjectId(groupOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group order ID format'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required and must not be empty'
      });
    }

    const groupOrder = await GroupOrder.findById(groupOrderId);

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Group order not found'
      });
    }

    if (groupOrder.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add items to inactive group order'
      });
    }

    // Check if expired
    if (groupOrder.isExpired()) {
      groupOrder.status = 'expired';
      await groupOrder.save();
      
      return res.status(400).json({
        success: false,
        message: 'Group order session has expired'
      });
    }

    // Get userId from authenticated user
    const userId = (req as any).user?.userId;

    // Add items to the group order
    const addedItems: IGroupOrderItem[] = [];
    for (const item of items) {
      const { menuItemId, quantity = 1, price, customizations = [], specialRequests = '' } = item;

      if (!menuItemId) {
        return res.status(400).json({
          success: false,
          message: 'menuItemId is required for each item'
        });
      }

      if (!isValidObjectId(menuItemId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid menuItemId format'
        });
      }

      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid price is required for each item'
        });
      }

      if (typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity (>= 1) is required for each item'
        });
      }

      // Create item with unique ID
      const itemId = uuidv4();
      const newItem = {
        itemId,
        menuItemId: new mongoose.Types.ObjectId(menuItemId),
        name: item.name || 'Menu Item',
        price,
        quantity,
        customizations: Array.isArray(customizations) ? customizations : [],
        addedBy: userId ? new mongoose.Types.ObjectId(userId) : new mongoose.Types.ObjectId(),
        addedAt: new Date(),
        lastModified: new Date(),
        modifiedBy: userId ? new mongoose.Types.ObjectId(userId) : new mongoose.Types.ObjectId()
      };

      groupOrder.items.push(newItem as any);
      addedItems.push(newItem);

      // Update participant's current spent if we can identify them
      if (userId) {
        const participant = groupOrder.participants.find(p => 
          p.userId?.toString() === userId.toString()
        );
        if (participant) {
          participant.currentSpent += price * quantity;
          participant.lastActivity = new Date();
        }
      }
    }

    // Recalculate totals
    groupOrder.totals.subtotal = groupOrder.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    groupOrder.totals.total = groupOrder.totals.subtotal + groupOrder.totals.tax + 
                              groupOrder.totals.deliveryFee + groupOrder.totals.serviceFee + 
                              groupOrder.totals.tip;

    await groupOrder.save();

    console.log('✅ Items added to group order successfully:', {
      groupOrderId,
      itemCount: addedItems.length,
      totalValue: addedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    });

    res.status(200).json({
      success: true,
      message: `Successfully added ${addedItems.length} item(s) to group order`,
      data: {
        groupOrderId: groupOrder._id,
        addedItems: addedItems.map(item => ({
          itemId: item.itemId,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          customizations: item.customizations
        })),
        totals: groupOrder.totals,
        participants: groupOrder.participants
      }
    });

  } catch (error: any) {
    console.error('❌ Error adding items to group order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add items to group order',
      error: error.message
    });
  }
});

/**
 * PUT /api/group-orders/:groupOrderId/payment-structure
 * Update payment structure for the group order
 */
router.put('/:groupOrderId/payment-structure', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { groupOrderId } = req.params;
    const { paymentStructure } = req.body;

    if (!isValidObjectId(groupOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group order ID format'
      });
    }

    const validPaymentStructures = ['pay_all', 'equal_split', 'pay_own', 'custom_split'];
    if (!validPaymentStructures.includes(paymentStructure)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment structure. Must be one of: ' + validPaymentStructures.join(', ')
      });
    }

    const groupOrder = await GroupOrder.findById(groupOrderId);

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Group order not found'
      });
    }

    // Update payment structure
    groupOrder.paymentStructure = paymentStructure;
    
    // Update payment split method based on structure
    switch (paymentStructure) {
      case 'pay_all':
        groupOrder.paymentSplit.method = 'single';
        break;
      case 'equal_split':
        groupOrder.paymentSplit.method = 'equal';
        break;
      case 'pay_own':
        groupOrder.paymentSplit.method = 'individual';
        break;
      case 'custom_split':
        groupOrder.paymentSplit.method = 'percentage';
        break;
    }

    await groupOrder.save();

    res.status(200).json({
      success: true,
      message: 'Payment structure updated successfully',
      data: {
        paymentStructure: groupOrder.paymentStructure,
        paymentSplit: groupOrder.paymentSplit
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating payment structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment structure',
      error: error.message
    });
  }
});

/**
 * POST /api/group-orders/:sessionId/submit
 * Submit/finalize the group order
 */
router.post('/:sessionId/submit', authenticateOptional, async (req: Request, res: Response) => {
  try {
    console.log('🚀 Submitting group order:', req.params.sessionId);
    
    const { sessionId } = req.params;
    const {
      finalDeliveryInfo,
      paymentConfirmation,
      orderNotes
    } = req.body;

    // Find group order by sessionId
    const groupOrder = await GroupOrder.findOne({ sessionId });

    if (!groupOrder) {
      return res.status(404).json({
        success: false,
        message: 'Group order not found'
      });
    }

    // Check if order is in a valid state for submission
    if (groupOrder.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot submit order in ${groupOrder.status} status`
      });
    }

    // Check if order has items
    if (!groupOrder.items || groupOrder.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit empty order'
      });
    }

    // Update delivery info if provided
    if (finalDeliveryInfo) {
      groupOrder.deliveryInfo = {
        address: finalDeliveryInfo.address,
        instructions: finalDeliveryInfo.instructions,
        scheduledFor: finalDeliveryInfo.scheduledFor,
        contactPhone: finalDeliveryInfo.contactPhone
      };
    }

    // Generate order number
    const orderNumber = `GROUP-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;

    // Update group order status to submitted
    groupOrder.status = 'submitted';
    groupOrder.orderNumber = orderNumber;
    groupOrder.submittedAt = new Date();
    groupOrder.submittedBy = (req as any).user?.userId || groupOrder.createdBy;
    
    if (orderNotes) {
      groupOrder.notes = orderNotes;
    }

    // Calculate final totals
    groupOrder.calculateTotals();

    // Save the updated group order
    await groupOrder.save();

    // TODO: Here you would typically:
    // 1. Create individual orders in the order service
    // 2. Process payments if not already processed
    // 3. Send notifications to restaurant and participants
    // 4. Trigger any webhook notifications

    console.log('✅ Group order submitted successfully:', {
      groupOrderId: groupOrder._id,
      sessionId: groupOrder.sessionId,
      orderNumber,
      totalAmount: groupOrder.totals.total,
      participantCount: groupOrder.participants.length
    });

    // Prepare response data
    const participantOrders = groupOrder.participants.map(participant => {
      const participantItems = groupOrder.items.filter(item => 
        item.addedBy.toString() === participant.participantId.toString()
      );
      
      const participantTotal = participantItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      return {
        userId: participant.participantId,
        userName: participant.name,
        orderItems: participantItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        amountPaid: participantTotal,
        paymentStatus: 'completed' // Assuming payment is handled separately
      };
    });

    res.status(200).json({
      success: true,
      message: 'Group order submitted successfully',
      data: {
        groupOrderId: groupOrder._id.toString(),
        orderNumber,
        status: 'submitted',
        restaurantOrderId: `REST-ORD-${Math.floor(Math.random() * 900000) + 100000}`,
        estimatedDelivery: finalDeliveryInfo?.scheduledFor || new Date(Date.now() + 45 * 60000), // 45 mins from now
        trackingInfo: {
          trackingNumber: `TRK${Math.floor(Math.random() * 900000000) + 100000000}`,
          trackingUrl: `https://track.inseat.com/TRK${Math.floor(Math.random() * 900000000) + 100000000}`
        },
        orderSummary: {
          totalItems: groupOrder.items.length,
          totalQuantity: groupOrder.items.reduce((sum, item) => sum + item.quantity, 0),
          participants: groupOrder.participants.length,
          totalAmount: groupOrder.totals.total,
          breakdown: {
            subtotal: groupOrder.totals.subtotal,
            tax: groupOrder.totals.tax,
            deliveryFee: groupOrder.totals.deliveryFee,
            serviceFee: groupOrder.totals.serviceFee,
            tip: groupOrder.totals.tip
          }
        },
        participantOrders,
        notifications: {
          restaurantNotified: true,
          participantsNotified: true,
          deliveryScheduled: true
        },
        submittedAt: groupOrder.submittedAt,
        submittedBy: groupOrder.submittedBy
      }
    });

  } catch (error: any) {
    console.error('❌ Error submitting group order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit group order',
      error: error.message
    });
  }
});

export default router;
