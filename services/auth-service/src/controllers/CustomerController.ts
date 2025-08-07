import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import User, { IUser, UserRole, findCustomersByRestaurantId } from '../models/user.model';
import mongoose from 'mongoose';

export class CustomerController {
  /**
   * Get customers associated with a restaurant
   * Restaurant admins can only see customers for their restaurant
   * System admins can see customers for any restaurant
   */
  async getCustomersByRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      let restaurantIds: string[] = [];
      
      console.log(`[CustomerController] User ${user?.userId} with role ${user?.role} is fetching customers`);

      // For restaurant admins, get all restaurants in their business
      if (user?.role === 'restaurant_admin') {
        if (!user.businessId) {
          console.log(`[CustomerController] Restaurant admin ${user.userId} has no associated business`);
          res.status(403).json({ message: 'You are not associated with any business' });
          return;
        }
        
        try {
          // Get all restaurants for this business
          const Restaurant = require('../../../restaurant-service/src/models/Restaurant').default;
          const restaurants = await Restaurant.find({ businessId: user.businessId }).select('_id');
          restaurantIds = restaurants.map((r: any) => r._id.toString());
          
          console.log(`[CustomerController] Found ${restaurantIds.length} restaurants for business ${user.businessId}`);
          
          if (restaurantIds.length === 0) {
            console.log(`[CustomerController] No restaurants found for business ${user.businessId}`);
            res.status(200).json([]);
            return;
          }
        } catch (error) {
          console.error('[CustomerController] Error fetching restaurants for business:', error);
          res.status(500).json({ message: 'Error fetching business restaurants' });
          return;
        }
      } else if (user?.role === 'system_admin') {
        // System admins can see customers for any restaurant, but must specify which one
        const restaurantId = req.query.restaurantId as string;
        if (!restaurantId) {
          console.log('[CustomerController] System admin did not provide restaurantId query parameter');
          res.status(400).json({ message: 'Restaurant ID is required as a query parameter' });
          return;
        }
        restaurantIds = [restaurantId];
      } else {
        console.log(`[CustomerController] Unauthorized access attempt by user with role: ${user?.role || 'none'}`);
        res.status(403).json({ message: 'Unauthorized: Only restaurant admins and system admins can access customer data' });
        return;
      }

      console.log(`[CustomerController] Fetching customers for restaurant IDs: ${restaurantIds.join(', ')}`);
      
      // Find customers for all specified restaurants
      const customers = await User.find({
        restaurantId: { $in: restaurantIds },
        role: UserRole.CUSTOMER
      }).select('-password -passwordResetToken').lean();
      
      console.log(`[CustomerController] Found ${customers.length} customers for restaurants: ${restaurantIds.join(', ')}`);
      res.status(200).json(customers);
    } catch (error) {
      console.error('[CustomerController] Error fetching customers:', error);
      res.status(500).json({ message: 'Error fetching customers', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Get a customer by ID
   * Restaurant admins can only see customers for their restaurant
   * System admins can see any customer
   */
  async getCustomerById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const customerId = req.params.id;
      
      if (!customerId) {
        res.status(400).json({ message: 'Customer ID is required' });
        return;
      }
      
      console.log(`[CustomerController] Fetching customer with ID: ${customerId}`);
      const customer = await User.findOne({ _id: customerId, role: UserRole.CUSTOMER });
      
      if (!customer) {
        console.log(`[CustomerController] Customer with ID ${customerId} not found`);
        res.status(404).json({ message: 'Customer not found' });
        return;
      }
      
      // Check if the user is authorized to see this customer
      if (user?.role === 'restaurant_admin') {
        if (!user.restaurantId || !customer.restaurantId || 
            user.restaurantId.toString() !== customer.restaurantId.toString()) {
          console.log(`[CustomerController] Restaurant admin ${user.userId} attempted to access customer from another restaurant`);
          res.status(403).json({ message: 'You are not authorized to view this customer' });
          return;
        }
      } else if (user?.role !== 'system_admin') {
        console.log(`[CustomerController] Unauthorized access attempt by user with role: ${user?.role || 'none'}`);
        res.status(403).json({ message: 'Unauthorized: Only restaurant admins and system admins can access customer data' });
        return;
      }
      
      console.log(`[CustomerController] Successfully retrieved customer: ${customer._id}`);
      res.status(200).json(customer);
    } catch (error) {
      console.error('[CustomerController] Error fetching customer:', error);
      res.status(500).json({ message: 'Error fetching customer', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Update a customer's details
   * Restaurant admins can only update customers for their restaurant
   * System admins can update any customer
   */
  async updateCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const user = req.user;
      const customerId = req.params.id;
      const updateData = req.body;
      
      // Prevent changing the role from customer
      if (updateData.role && updateData.role !== UserRole.CUSTOMER) {
        await session.abortTransaction();
        res.status(400).json({ message: 'Cannot change customer role' });
        return;
      }

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.password;
      delete updateData._id;
      
      console.log(`[CustomerController] Updating customer with ID: ${customerId}`);
      const customer = await User.findOne({ _id: customerId, role: UserRole.CUSTOMER });
      
      if (!customer) {
        await session.abortTransaction();
        console.log(`[CustomerController] Customer with ID ${customerId} not found`);
        res.status(404).json({ message: 'Customer not found' });
        return;
      }
      
      // Check if the user is authorized to update this customer
      if (user?.role === 'restaurant_admin') {
        if (!user.restaurantId || !customer.restaurantId || 
            user.restaurantId.toString() !== customer.restaurantId.toString()) {
          await session.abortTransaction();
          console.log(`[CustomerController] Restaurant admin ${user.userId} attempted to update customer from another restaurant`);
          res.status(403).json({ message: 'You are not authorized to update this customer' });
          return;
        }
        
        // Restaurant admins cannot change the restaurant ID
        if (updateData.restaurantId && updateData.restaurantId.toString() !== customer.restaurantId.toString()) {
          await session.abortTransaction();
          res.status(403).json({ message: 'Restaurant admins cannot change customer restaurant assignment' });
          return;
        }
      } else if (user?.role !== 'system_admin') {
        await session.abortTransaction();
        console.log(`[CustomerController] Unauthorized update attempt by user with role: ${user?.role || 'none'}`);
        res.status(403).json({ message: 'Unauthorized: Only restaurant admins and system admins can update customer data' });
        return;
      }
      
      // Update the customer
      const updatedCustomer = await User.findByIdAndUpdate(
        customerId, 
        { $set: updateData },
        { new: true, session }
      );
      
      await session.commitTransaction();
      console.log(`[CustomerController] Successfully updated customer: ${updatedCustomer?._id}`);
      res.status(200).json(updatedCustomer);
    } catch (error) {
      await session.abortTransaction();
      console.error('[CustomerController] Error updating customer:', error);
      res.status(500).json({ message: 'Error updating customer', error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      session.endSession();
    }
  }
}
