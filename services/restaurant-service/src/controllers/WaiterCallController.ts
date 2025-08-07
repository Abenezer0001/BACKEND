import { Request, Response } from 'express';
import mongoose from 'mongoose';
import WaiterCall, { WaiterCallReason, WaiterCallStatus } from '../models/WaiterCall';
import Table from '../models/Table';
import { body, validationResult, query } from 'express-validator';

export class WaiterCallController {
  // Create a new waiter call
  static async createWaiterCall(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { tableId, reason, additionalInfo, userId, deviceId, isGuest } = req.body;

      // Verify table exists and get table details
      const table = await Table.findById(tableId).populate('venueId');
      if (!table) {
        return res.status(404).json({
          success: false,
          message: 'Table not found'
        });
      }

      // Allow multiple active calls from the same table
      // In real scenarios, customers might need multiple things (assistance, bill, utensils, etc.)
      // We'll let the staff manage and resolve them individually

      // Create the waiter call
      const waiterCall = new WaiterCall({
        tableId,
        tableNumber: table.number,
        restaurantId: table.restaurantId,
        venueId: table.venueId,
        reason,
        additionalInfo,
        userId,
        deviceId,
        isGuest: isGuest || false
      });

      await waiterCall.save();

      // Populate the response with table and venue details
      await waiterCall.populate(['tableId', 'venueId']);

      res.status(201).json({
        success: true,
        message: 'Waiter call created successfully',
        data: waiterCall
      });

    } catch (error) {
      console.error('Error creating waiter call:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all waiter calls for a restaurant (with filtering)
  static async getWaiterCalls(req: Request, res: Response) {
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
        status = WaiterCallStatus.ACTIVE,
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

      const waiterCalls = await WaiterCall.find(query)
        .populate(['tableId', 'venueId', 'resolvedBy'])
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset));

      const totalCount = await WaiterCall.countDocuments(query);

      res.json({
        success: true,
        data: waiterCalls,
        pagination: {
          total: totalCount,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: totalCount > Number(offset) + Number(limit)
        }
      });

    } catch (error) {
      console.error('Error fetching waiter calls:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get active waiter calls count for a restaurant
  static async getActiveCallsCount(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;
      const { venueId } = req.query;

      const query: any = { 
        restaurantId,
        status: WaiterCallStatus.ACTIVE
      };
      
      if (venueId) {
        query.venueId = venueId;
      }

      const activeCount = await WaiterCall.countDocuments(query);

      res.json({
        success: true,
        data: {
          activeCallsCount: activeCount
        }
      });

    } catch (error) {
      console.error('Error fetching active calls count:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Resolve a waiter call
  static async resolveWaiterCall(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { callId } = req.params;
      const { resolvedBy } = req.body;

      const waiterCall = await WaiterCall.findById(callId);
      
      if (!waiterCall) {
        return res.status(404).json({
          success: false,
          message: 'Waiter call not found'
        });
      }

      if (waiterCall.status !== WaiterCallStatus.ACTIVE) {
        return res.status(400).json({
          success: false,
          message: 'Waiter call is not active'
        });
      }

      // Update the call status
      waiterCall.status = WaiterCallStatus.RESOLVED;
      waiterCall.resolvedBy = resolvedBy;
      waiterCall.resolvedAt = new Date();

      await waiterCall.save();

      // Populate the response
      await waiterCall.populate(['tableId', 'venueId', 'resolvedBy']);

      res.json({
        success: true,
        message: 'Waiter call resolved successfully',
        data: waiterCall
      });

    } catch (error) {
      console.error('Error resolving waiter call:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Cancel a waiter call
  static async cancelWaiterCall(req: Request, res: Response) {
    try {
      const { callId } = req.params;

      const waiterCall = await WaiterCall.findById(callId);
      
      if (!waiterCall) {
        return res.status(404).json({
          success: false,
          message: 'Waiter call not found'
        });
      }

      if (waiterCall.status !== WaiterCallStatus.ACTIVE) {
        return res.status(400).json({
          success: false,
          message: 'Waiter call is not active'
        });
      }

      // Update the call status
      waiterCall.status = WaiterCallStatus.CANCELLED;
      await waiterCall.save();

      res.json({
        success: true,
        message: 'Waiter call cancelled successfully',
        data: waiterCall
      });

    } catch (error) {
      console.error('Error cancelling waiter call:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get waiter calls by table ID
  static async getWaiterCallsByTable(req: Request, res: Response) {
    try {
      const { tableId } = req.params;
      const { 
        status = WaiterCallStatus.ACTIVE,
        limit = 50,
        offset = 0
      } = req.query;

      // Build query
      const query: any = { tableId };
      
      if (status) {
        query.status = status;
      }

      const waiterCalls = await WaiterCall.find(query)
        .populate(['tableId', 'venueId', 'resolvedBy'])
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset));

      const totalCount = await WaiterCall.countDocuments(query);

      res.json({
        success: true,
        data: waiterCalls,
        pagination: {
          total: totalCount,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: totalCount > Number(offset) + Number(limit)
        }
      });

    } catch (error) {
      console.error('Error fetching waiter calls by table:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get waiter call by ID
  static async getWaiterCallById(req: Request, res: Response) {
    try {
      const { callId } = req.params;

      const waiterCall = await WaiterCall.findById(callId)
        .populate(['tableId', 'venueId', 'resolvedBy']);

      if (!waiterCall) {
        return res.status(404).json({
          success: false,
          message: 'Waiter call not found'
        });
      }

      res.json({
        success: true,
        data: waiterCall
      });

    } catch (error) {
      console.error('Error fetching waiter call:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Validation rules
  static createWaiterCallValidation = [
    body('tableId')
      .notEmpty()
      .withMessage('Table ID is required')
      .isMongoId()
      .withMessage('Invalid table ID'),
    body('reason')
      .notEmpty()
      .withMessage('Reason is required')
      .isIn(Object.values(WaiterCallReason))
      .withMessage('Invalid reason'),
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

  static getWaiterCallsValidation = [
    query('status')
      .optional()
      .isIn(Object.values(WaiterCallStatus))
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

  static resolveWaiterCallValidation = [
    body('resolvedBy')
      .notEmpty()
      .withMessage('Resolved by field is required')
      .isMongoId()
      .withMessage('Invalid resolved by ID')
  ];

  static getWaiterCallsByTableValidation = [
    query('status')
      .optional()
      .isIn(Object.values(WaiterCallStatus))
      .withMessage('Invalid status'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ];
}

export default WaiterCallController;