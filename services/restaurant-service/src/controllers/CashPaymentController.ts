import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CashPaymentRequest, { CashPaymentStatus } from '../models/CashPaymentRequest';
import Table from '../models/Table';
import { body, validationResult, query } from 'express-validator';

export class CashPaymentController {
  // Create a new cash payment request
  static async createCashPaymentRequest(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { tableId, totalAmount, orderIds, additionalInfo, userId, deviceId, isGuest } = req.body;

      // Verify table exists and get table details
      const table = await Table.findById(tableId).populate('venueId');
      if (!table) {
        return res.status(404).json({
          success: false,
          message: 'Table not found'
        });
      }

      // Note: We allow multiple cash payment requests for the same table
      // This enables customers to pay for different order sessions separately
      // Previous logic that prevented multiple requests has been removed to support this use case

      // Create the cash payment request
      const cashPaymentRequest = new CashPaymentRequest({
        tableId,
        tableNumber: table.number,
        restaurantId: table.restaurantId,
        venueId: table.venueId,
        totalAmount,
        orderIds: orderIds || [],
        additionalInfo,
        userId,
        deviceId,
        isGuest: isGuest || false
      });

      await cashPaymentRequest.save();

      // Populate the response with table and venue details
      await cashPaymentRequest.populate(['tableId', 'venueId', 'orderIds']);

      res.status(201).json({
        success: true,
        message: 'Cash payment request created successfully',
        data: cashPaymentRequest
      });

    } catch (error) {
      console.error('Error creating cash payment request:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all cash payment requests for a restaurant (with filtering)
  static async getCashPaymentRequests(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { restaurantId } = req.params;
      const { 
        status = CashPaymentStatus.PENDING,
        venueId,
        limit = 50,
        offset = 0
      } = req.query;

      // Build query
      const query: any = { restaurantId };
      
      if (status) {
        query.status = status;
      }
      
      if (venueId) {
        query.venueId = venueId;
      }

      const requests = await CashPaymentRequest.find(query)
        .populate(['tableId', 'venueId', 'collectedBy', 'orderIds'])
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset));

      const totalCount = await CashPaymentRequest.countDocuments(query);

      res.json({
        success: true,
        data: requests,
        pagination: {
          total: totalCount,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: totalCount > Number(offset) + Number(limit)
        }
      });

    } catch (error) {
      console.error('Error fetching cash payment requests:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get active cash payment requests count for a restaurant
  static async getActiveCashPaymentCount(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;
      const { venueId } = req.query;

      const query: any = { 
        restaurantId,
        status: CashPaymentStatus.PENDING
      };
      
      if (venueId) {
        query.venueId = venueId;
      }

      const activeCount = await CashPaymentRequest.countDocuments(query);

      res.json({
        success: true,
        data: {
          activeCashPaymentCount: activeCount
        }
      });

    } catch (error) {
      console.error('Error fetching active cash payment count:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Mark cash payment as collected
  static async collectCashPayment(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { requestId } = req.params;
      const { collectedBy } = req.body;

      const request = await CashPaymentRequest.findById(requestId);
      
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Cash payment request not found'
        });
      }

      if (request.status !== CashPaymentStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: 'Cash payment request is not pending'
        });
      }

      // Update the request status
      request.status = CashPaymentStatus.COLLECTED;
      request.collectedBy = collectedBy;
      request.collectedAt = new Date();

      await request.save();

      // Populate the response
      await request.populate(['tableId', 'venueId', 'collectedBy', 'orderIds']);

      res.json({
        success: true,
        message: 'Cash payment collected successfully',
        data: request
      });

    } catch (error) {
      console.error('Error collecting cash payment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Cancel a cash payment request
  static async cancelCashPaymentRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;

      const request = await CashPaymentRequest.findById(requestId);
      
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Cash payment request not found'
        });
      }

      if (request.status !== CashPaymentStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: 'Cash payment request is not pending'
        });
      }

      // Update the request status
      request.status = CashPaymentStatus.CANCELLED;
      await request.save();

      res.json({
        success: true,
        message: 'Cash payment request cancelled successfully',
        data: request
      });

    } catch (error) {
      console.error('Error cancelling cash payment request:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get cash payment request by ID
  static async getCashPaymentRequestById(req: Request, res: Response) {
    try {
      const { requestId } = req.params;

      const request = await CashPaymentRequest.findById(requestId)
        .populate(['tableId', 'venueId', 'collectedBy', 'orderIds']);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Cash payment request not found'
        });
      }

      res.json({
        success: true,
        data: request
      });

    } catch (error) {
      console.error('Error fetching cash payment request:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all cash payment requests by table ID (for customer UI)
  static async getCashPaymentRequestByTable(req: Request, res: Response) {
    try {
      const { tableId } = req.params;
      const { userId, deviceId } = req.query; // Get user/device identifiers from query params
      const user = (req as any).user; // Get authenticated user if available

      console.log('=== CASH PAYMENT RETRIEVAL DEBUG ===');
      console.log('Cash payment request lookup:', {
        tableId,
        queryUserId: userId,
        queryDeviceId: deviceId,
        authenticatedUser: user?.userId || user?.id,
        userRole: user?.role
      });

      // Build base query for table and status
      const query: any = {
        tableId,
        status: { $in: [CashPaymentStatus.PENDING, CashPaymentStatus.COLLECTED] }
      };

      // CRITICAL FIX: More comprehensive user/device-based filtering
      // Try multiple matching strategies to find relevant payment requests
      const userFilters: any[] = [];

      // Get the current user ID from authenticated user or query params
      const currentUserId = user?.userId || user?.id || userId;
      console.log('Current user ID for matching:', currentUserId);

      // 1. If user is authenticated, match by authenticated user ID
      if (user && (user.userId || user.id)) {
        const authUserId = user.userId || user.id;
        userFilters.push({ userId: authUserId });
        console.log('Added authenticated user filter:', authUserId);
        
        // Also match if the authenticated user ID was stored as deviceId for guest sessions
        if (typeof authUserId === 'string' && authUserId.startsWith('device_')) {
          userFilters.push({ deviceId: authUserId });
          console.log('Added authenticated device filter:', authUserId);
        }
      }

      // 2. If userId provided in query params, match by that too
      if (userId) {
        userFilters.push({ userId: userId });
        console.log('Added query userId filter:', userId);
        
        // If userId looks like a device ID, also check deviceId field
        if (typeof userId === 'string' && userId.startsWith('device_')) {
          userFilters.push({ deviceId: userId });
          console.log('Added query userId as deviceId filter:', userId);
        }
      }

      // 3. If deviceId provided, match by deviceId
      if (deviceId) {
        userFilters.push({ deviceId: deviceId });
        userFilters.push({ userId: deviceId }); // Also check if deviceId was stored as userId
        console.log('Added deviceId filters:', deviceId);
      }

      // 4. CRITICAL FIX: Add comprehensive guest user matching
      // For device-based sessions, we need to match both userId and deviceId fields
      if (currentUserId && typeof currentUserId === 'string' && currentUserId.startsWith('device_')) {
        userFilters.push(
          { userId: currentUserId },
          { deviceId: currentUserId },
          { isGuest: true, userId: currentUserId },
          { isGuest: true, deviceId: currentUserId }
        );
        console.log('Added comprehensive device-based filters for:', currentUserId);
      }

      // Apply user filters using $or to match any of the criteria
      if (userFilters.length > 0) {
        query.$or = userFilters;
        console.log('Applied user filters with $or:', JSON.stringify(userFilters, null, 2));
      } else {
        // ENHANCED: For development/debugging, still search but log warning
        console.log('WARNING: No user identification provided, searching all requests for table (development mode)');
      }

      console.log('Final cash payment query:', JSON.stringify(query, null, 2));

      const requests = await CashPaymentRequest.find(query)
        .populate(['tableId', 'venueId', 'collectedBy', 'orderIds'])
        .sort({ createdAt: -1 }); // Get most recent first

      console.log(`Found ${requests.length} cash payment requests`);
      
      // Enhanced debugging: Log details of found requests
      if (requests.length > 0) {
        console.log('Cash payment requests found:');
        requests.forEach((req, index) => {
          console.log(`  [${index}] ID: ${req._id}, userId: ${req.userId}, deviceId: ${req.deviceId}, status: ${req.status}, createdAt: ${req.createdAt}`);
        });
      }
      
      console.log('=== END CASH PAYMENT RETRIEVAL DEBUG ===');

      if (!requests || requests.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No cash payment requests found for this table and user',
          debug: {
            tableId,
            searchedUserId: currentUserId,
            appliedFilters: userFilters.length
          }
        });
      }

      res.json({
        success: true,
        data: requests, // Return array of filtered requests
        debug: {
          totalFound: requests.length,
          searchedUserId: currentUserId
        }
      });

    } catch (error) {
      console.error('Error fetching cash payment request by table:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Validation rules
  static createCashPaymentRequestValidation = [
    body('tableId')
      .notEmpty()
      .withMessage('Table ID is required')
      .isMongoId()
      .withMessage('Invalid table ID'),
    body('totalAmount')
      .notEmpty()
      .withMessage('Total amount is required')
      .isNumeric()
      .withMessage('Total amount must be a number')
      .custom((value) => {
        if (value <= 0) {
          throw new Error('Total amount must be greater than 0');
        }
        return true;
      }),
    body('orderIds')
      .optional()
      .isArray()
      .withMessage('Order IDs must be an array'),
    body('orderIds.*')
      .optional()
      .isMongoId()
      .withMessage('Invalid order ID'),
    body('additionalInfo')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Additional info must be less than 500 characters'),
    body('userId')
      .optional()
      .custom((value) => {
        if (!value) return true;
        return mongoose.Types.ObjectId.isValid(value) || 
               (typeof value === 'string' && value.startsWith('device_'));
      })
      .withMessage('Invalid user ID'),
    body('deviceId')
      .optional()
      .isString()
      .withMessage('Device ID must be a string'),
    body('isGuest')
      .optional()
      .isBoolean()
      .withMessage('isGuest must be a boolean')
  ];

  static getCashPaymentRequestsValidation = [
    query('status')
      .optional()
      .isIn(Object.values(CashPaymentStatus))
      .withMessage('Invalid status'),
    query('venueId')
      .optional()
      .isMongoId()
      .withMessage('Invalid venue ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ];

  static collectCashPaymentValidation = [
    body('collectedBy')
      .notEmpty()
      .withMessage('Collected by field is required')
      .isMongoId()
      .withMessage('Invalid collected by ID')
  ];

  static getCashPaymentRequestByTableValidation = [
    query('userId')
      .optional()
      .custom((value) => {
        if (!value) return true;
        return mongoose.Types.ObjectId.isValid(value) || 
               (typeof value === 'string' && value.startsWith('device_'));
      })
      .withMessage('Invalid user ID format'),
    query('deviceId')
      .optional()
      .isString()
      .withMessage('Device ID must be a string')
  ];
}

export default CashPaymentController;