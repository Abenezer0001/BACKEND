import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { HTTP_STATUS } from '../constants/httpStatus';

/**
 * Middleware to check validation results
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }));
    
    logger.warn('Validation error:', { errors: errorMessages });
    return res.status(400).json({ errors: errorMessages });
  }
  next();
};

/**
 * Validator for checking if a string is a valid MongoDB ObjectId
 */
export const isValidObjectId = (value: string): boolean => {
  return Types.ObjectId.isValid(value);
};

/**
 * Factory function to create validation middleware for request body
 * @param requiredFields Array of fields that must be present in the request body
 */
export const validateRequestBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.body) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          status: 'error',
          message: 'Request body is required'
        });
        return;
      }

      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          status: 'error',
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Validation error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error during validation'
      });
    }
  };
};

/**
 * Validate Order creation request
 */
export const validateCreateOrder = validateRequestBody([
  'restaurantId',
  'items',
  'status',
  'paymentStatus'
]);

/**
 * Validate Order update request
 */
export const validateUpdateOrder = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check if there's at least one field to update
    const updateableFields = [
      'status',
      'paymentStatus',
      'items',
      'tableId',
      'tableNumber',
      'estimatedPreparationTime',
      'cancellationReason'
    ];

    const hasUpdateField = updateableFields.some(field => field in req.body);

    if (!hasUpdateField) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'At least one field to update is required'
      });
      return;
    }

    // Validate status if provided
    if (req.body.status && !['pending', 'accepted', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'].includes(req.body.status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Invalid order status value'
      });
      return;
    }

    // Validate payment status if provided
    if (req.body.paymentStatus && !['pending', 'paid', 'failed', 'refunded'].includes(req.body.paymentStatus)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Invalid payment status value'
      });
      return;
    }

    // Additional validation for items if provided
    if (req.body.items) {
      if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          status: 'error',
          message: 'Items must be a non-empty array'
        });
        return;
      }

      // Check if all items have required fields
      const invalidItems = req.body.items.some((item: any) => 
        !item.menuItem || !item.quantity || typeof item.quantity !== 'number' || !item.price
      );

      if (invalidItems) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          status: 'error',
          message: 'Each item must have menuItem, quantity, and price'
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Order validation error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error during order validation'
    });
  }
};

/**
 * Validation rules for getting orders by restaurant
 */
export const validateGetOrdersByRestaurant = [
  param('restaurantId')
    .exists().withMessage('Restaurant ID is required')
    .isString().withMessage('Restaurant ID must be a string')
    .custom(isValidObjectId).withMessage('Invalid restaurant ID format'),
  
  validateRequest
]; 