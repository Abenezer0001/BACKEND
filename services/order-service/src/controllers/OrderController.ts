import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order, { IOrder, OrderStatus, PaymentStatus } from '../models/Order';
import KafkaProducerService from '../services/KafkaProducerService';
import WebSocketService from '../services/WebSocketService';
import axios from 'axios'; // Added for inventory service integration
import { INVENTORY_SERVICE_BASE_URL } from '../config/inventoryService'; // Added for inventory service URL
import { GrubTechWebhookService } from '../services/GrubTechWebhookService';
import { JWTPayload } from '../../../auth-service/src/types/auth.types';
import { LoyaltyService } from '../../../loyalty-service/src/services/LoyaltyService';

// Create a custom User interface for order service that extends JWTPayload
interface OrderServiceUser extends JWTPayload {
  id: string;           // Alias for userId for backward compatibility
  email?: string;       // Add email property that OrderController needs
  restaurantIds?: string[];
}

// AuthenticatedRequest with our custom User interface
interface AuthenticatedRequest extends Request {
  user?: OrderServiceUser;
}

export class OrderController {
  private wsService: typeof WebSocketService;

  constructor(wsService: typeof WebSocketService) {
    this.wsService = wsService;
  }

  // Create a new order
  public async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orderData = req.body;
      
      // Map serviceFee to service_charge if sent from frontend
      if (orderData.serviceFee !== undefined && orderData.service_charge === undefined) {
        orderData.service_charge = orderData.serviceFee;
        console.log('Mapped serviceFee to service_charge:', orderData.service_charge);
      }
      
      console.log('Creating order with request user:', JSON.stringify(req.user, null, 2));
      console.log('Initial order data:', JSON.stringify(orderData, null, 2));
      
      // Ensure user information is properly set based on authentication type
      if (req.user) {
        // Get user ID from token payload - check multiple possible field names
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const userEmail = req.user.email;
        
        if (!userId) {
          console.error('Critical error: No user ID found in token payload!');
          res.status(401).json({ 
            error: 'Authentication error',
            details: 'User ID missing from authentication token'
          });
          return;
        }
        
        console.log(`Processing order for user: ${userId}, role: ${userRole}, email: ${userEmail}`);
        
        // Check if this is a guest user (ID starts with "device_")
        const isGuestUser = typeof userId === 'string' && userId.startsWith('device_');
        
        if (isGuestUser) {
          // For guest users, set both userId and deviceId to the device identifier
          orderData.userId = userId;
          orderData.deviceId = userId;
          orderData.isGuest = true;
          console.log(`Setting guest user info - userId and deviceId: ${userId}`);
        } else {
          // For regular users (credential/Google), set userId and ensure deviceId is not set
          orderData.userId = userId;
          // Remove deviceId if it was included in the payload
          if (orderData.deviceId) {
            delete orderData.deviceId;
            console.log('Removing deviceId for authenticated non-guest user');
          }
          orderData.isGuest = false;
          console.log(`Setting regular user userId: ${userId}`);
        }
      } else {
        console.error('Critical error: No user found in request! This should not happen with authenticateUser middleware.');
        res.status(401).json({ 
          error: 'Authentication required',
          details: 'No user information found in request'
        });
        return;
      }
      
      // Double-check userId is not null after our changes
      if (!orderData.userId) {
        console.error('Critical error: userId is still null after our attempt to set it!');
        res.status(400).json({ 
          error: 'User identification error',
          details: 'Cannot determine user ID for order creation'
        });
        return;
      }
      
      console.log('Final order data before save:', JSON.stringify({
        userId: orderData.userId,
        deviceId: orderData.deviceId,
        restaurantId: orderData.restaurantId,
        items: orderData.items?.length || 0
      }, null, 2));
      
      // Validate required fields
      if (!orderData.restaurantId || !orderData.items || orderData.items.length === 0) {
        res.status(400).json({ error: 'Missing required fields: restaurantId or items' });
        return;
      }
      
      // Calculate subtotal from items if not provided
      if (!orderData.subtotal) {
        let subtotal = 0;
        if (orderData.items && orderData.items.length > 0) {
          subtotal = orderData.items.reduce((total: number, item: any) => {
            // Calculate item subtotal including modifiers
            let itemTotal = item.price * item.quantity;
            
            // Add modifier prices if any
            if (item.modifiers && item.modifiers.length > 0) {
              const modifierTotal = item.modifiers.reduce((modTotal: number, mod: any) => {
                if (mod.selections && mod.selections.length > 0) {
                  return modTotal + mod.selections.reduce((selTotal: number, sel: any) => {
                    return selTotal + (sel.price * sel.quantity);
                  }, 0);
                }
                return modTotal;
              }, 0);
              
              itemTotal += modifierTotal;
            }
            
            return total + itemTotal;
          }, 0);
        }
        
        // Set calculated values
        orderData.subtotal = subtotal;
        orderData.tax = 0; // Tax disabled per user request
        
        // Calculate loyalty discount if customer is authenticated (not guest)
        let loyaltyDiscountAmount = 0;
        if (orderData.userId && !orderData.isGuest) {
          try {
            console.log('Calculating loyalty discount for user:', orderData.userId);
            const loyaltyResult = await LoyaltyService.calculateDiscount(
              orderData.userId,
              orderData.restaurantId,
              subtotal
            );
            
            if (loyaltyResult.isEligible && loyaltyResult.discount) {
              loyaltyDiscountAmount = loyaltyResult.discount.discountAmount;
              orderData.loyaltyDiscount = {
                applied: true,
                discountPercent: loyaltyResult.discount.discountPercent,
                discountAmount: loyaltyDiscountAmount,
                tier: loyaltyResult.discount.tier,
                timeBonusPercent: loyaltyResult.discount.timeBonusPercent,
                frequencyBonusPercent: loyaltyResult.discount.frequencyBonusPercent,
                isFirstTime: loyaltyResult.discount.isFirstTime
              };
              console.log('Loyalty discount applied:', loyaltyDiscountAmount);
            }
          } catch (loyaltyError) {
            console.error('Error calculating loyalty discount:', loyaltyError);
            // Continue without loyalty discount if calculation fails
          }
        }
        
        // Calculate service charge - use provided value or fetch from restaurant settings
        let serviceChargeAmount = 0;
        
        // If service charge is already provided by frontend, use it
        if (typeof orderData.service_charge === 'number' && orderData.service_charge >= 0) {
          serviceChargeAmount = orderData.service_charge;
          console.log('Using service charge provided by frontend:', serviceChargeAmount);
        } else {
          // Otherwise, calculate based on restaurant settings
          try {
            console.log('=== SERVICE CHARGE CALCULATION DEBUG ===');
            console.log('Restaurant ID:', orderData.restaurantId);
            console.log('Subtotal for calculation:', subtotal);
            console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
          
          // Try multiple possible endpoints for restaurant service
          const possibleUrls = [
            `http://localhost:3001/api/restaurants/${orderData.restaurantId}`,
            `http://localhost:3000/api/restaurants/${orderData.restaurantId}`,
            `http://localhost:4000/api/restaurants/${orderData.restaurantId}`
          ];
          
          let restaurant: any = null;
          let successUrl: string | null = null;
          
          for (const url of possibleUrls) {
            try {
              console.log(`Trying restaurant API URL: ${url}`);
              
              const restaurantResponse = await axios.get(url, {
                headers: {
                  'Authorization': req.headers.authorization || ''
                },
                timeout: 5000 // 5 second timeout
              });
              
              console.log(`✅ Success! Restaurant API Response Status: ${restaurantResponse.status}`);
              restaurant = restaurantResponse.data;
              successUrl = url;
              break;
            } catch (urlError: unknown) {
              const errorMessage = urlError instanceof Error ? urlError.message : 'Unknown error';
              console.log(`❌ Failed to fetch from ${url}:`, errorMessage);
              continue;
            }
          }
          
          if (!restaurant) {
            throw new Error('Could not fetch restaurant data from any available endpoint');
          }
          
          console.log(`Successfully fetched restaurant data from: ${successUrl}`);
          console.log('Restaurant API Response Data:', JSON.stringify(restaurant, null, 2));
          console.log('Service charge settings from restaurant:', restaurant.service_charge);
          
          // Check if service charge is configured and enabled
          if (restaurant.service_charge && 
              restaurant.service_charge.enabled === true && 
              typeof restaurant.service_charge.percentage === 'number' && 
              restaurant.service_charge.percentage > 0) {
            
            const percentage = restaurant.service_charge.percentage;
            // Use more precise calculation and round to 2 decimal places
            serviceChargeAmount = parseFloat((subtotal * (percentage / 100)).toFixed(2));
            
            console.log(`✅ Service charge calculation: ${subtotal} * (${percentage}/100) = ${serviceChargeAmount}`);
            console.log(`✅ Service charge applied: ${percentage}% = $${serviceChargeAmount}`);
          } else {
            console.log('❌ Service charge not enabled or not properly configured for restaurant');
            console.log('service_charge object:', restaurant.service_charge);
            if (restaurant.service_charge) {
              console.log('service_charge.enabled:', restaurant.service_charge.enabled, '(type:', typeof restaurant.service_charge.enabled, ')');
              console.log('service_charge.percentage:', restaurant.service_charge.percentage, '(type:', typeof restaurant.service_charge.percentage, ')');
            }
            console.log('Required: enabled=true (boolean) and percentage>0 (number)');
          }
          console.log('=== END SERVICE CHARGE DEBUG ===');
        } catch (serviceChargeError: unknown) {
          console.error('=== SERVICE CHARGE ERROR ===');
          console.error('Error fetching restaurant service charge settings:', serviceChargeError);
          if (serviceChargeError && typeof serviceChargeError === 'object' && 'response' in serviceChargeError) {
            const axiosError = serviceChargeError as any;
            console.error('Error response status:', axiosError.response?.status);
            console.error('Error response data:', axiosError.response?.data);
          }
          const errorMessage = serviceChargeError instanceof Error ? serviceChargeError.message : 'Unknown error';
          console.error('Error message:', errorMessage);
          
          // As a fallback, try to fetch restaurant directly from database
          try {
            console.log('🔄 Attempting database fallback for restaurant data...');
            const { default: Restaurant } = await import('../../../restaurant-service/src/models/Restaurant');
            const restaurantFromDb = await Restaurant.findById(orderData.restaurantId);
            
            if (restaurantFromDb && restaurantFromDb.service_charge && 
                restaurantFromDb.service_charge.enabled === true && 
                typeof restaurantFromDb.service_charge.percentage === 'number' && 
                restaurantFromDb.service_charge.percentage > 0) {
              
              const percentage = restaurantFromDb.service_charge.percentage;
              serviceChargeAmount = parseFloat((subtotal * (percentage / 100)).toFixed(2));
              
              console.log(`✅ Database fallback successful! Service charge: ${percentage}% = $${serviceChargeAmount}`);
            } else {
              console.log('❌ Database fallback: Service charge not properly configured in database');
            }
          } catch (dbError: unknown) {
            const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
            console.error('❌ Database fallback also failed:', errorMessage);
          }
          
          console.error('=== END SERVICE CHARGE ERROR ===');
        }
        } // Close the else block for restaurant settings calculation
        
        // Ensure service charge is properly set and logged for debugging
        orderData.service_charge = serviceChargeAmount;
        console.log(`💰 FINAL SERVICE CHARGE BEING SAVED: ${orderData.service_charge}`);
        console.log(`💰 Total calculation: subtotal(${subtotal}) + service_charge(${serviceChargeAmount}) + tip(${orderData.tip || 0}) - loyalty(${loyaltyDiscountAmount})`);
        orderData.total = subtotal + serviceChargeAmount + (orderData.tip || 0) - loyaltyDiscountAmount;
        console.log(`💰 FINAL TOTAL: ${orderData.total}`);
      }
      
      // Set default status values if not provided
      orderData.status = orderData.status || OrderStatus.PENDING;
      orderData.paymentStatus = orderData.paymentStatus || PaymentStatus.PENDING;
      
      // URGENT FIX: Transform modifier string names to ObjectIds
      if (orderData.items && orderData.items.length > 0) {
        const mongoose = require('mongoose');
        
        for (const item of orderData.items) {
          if (item.modifiers && item.modifiers.length > 0) {
            for (const modifier of item.modifiers) {
              // If groupId is a string, try to create a mock ObjectId for now
              if (typeof modifier.groupId === 'string' && modifier.groupId !== '') {
                // Generate a deterministic ObjectId based on the string
                const hash = require('crypto').createHash('md5').update(modifier.groupId).digest('hex');
                modifier.groupId = new mongoose.Types.ObjectId(hash.substring(0, 24));
              }
              
              // Fix optionId in selections
              if (modifier.selections && modifier.selections.length > 0) {
                for (const selection of modifier.selections) {
                  if (typeof selection.optionId === 'string' && selection.optionId !== '') {
                    // Generate a deterministic ObjectId based on the string
                    const hash = require('crypto').createHash('md5').update(selection.optionId).digest('hex');
                    selection.optionId = new mongoose.Types.ObjectId(hash.substring(0, 24));
                  }
                }
              }
            }
          }
        }
      }
      
      // Log final order data before saving
      console.log('=== FINAL ORDER DATA BEFORE SAVING ===');
      console.log('Service charge in orderData:', orderData.service_charge);
      console.log('Total in orderData:', orderData.total);
      console.log('Subtotal in orderData:', orderData.subtotal);
      console.log('Tip in orderData:', orderData.tip);
      console.log('userId in orderData:', orderData.userId);
      console.log('=== END FINAL ORDER DATA ===');
      
      // Create and save the order
      const order = new Order(orderData);
      
      // Log order data right before save
      console.log('=== ORDER MODEL DATA BEFORE SAVE ===');
      console.log('Service charge in order model:', order.service_charge);
      console.log('Total in order model:', order.total);
      console.log('UserId in order model:', order.userId);
      console.log('=== END ORDER MODEL DATA ===');
      
      const savedOrder = await order.save();
      
      // Log saved order data to verify what was actually saved
      console.log('=== SAVED ORDER DATA VERIFICATION ===');  
      console.log('Service charge in saved order:', savedOrder.service_charge);
      console.log('Total in saved order:', savedOrder.total);
      console.log('UserId in saved order:', savedOrder.userId);
      console.log('=== END SAVED ORDER VERIFICATION ===');
      
      // Check if this is a guest user (has isGuest flag or ID starts with "device_")
      const isGuestUserId = savedOrder.isGuest || 
                          (typeof savedOrder.userId === 'string' && 
                           savedOrder.userId.toString().startsWith('device_'));
      
      console.log(`Order saved with userId: ${savedOrder.userId}, isGuestUserId: ${isGuestUserId}`);
      
      let populatedOrder;
      
      try {
        // Try to populate with everything, but catch any errors that might occur
        const populateQuery = Order.findById(savedOrder._id);
        
        // Only try to populate userId if it's not a guest user ID
        if (!isGuestUserId) {
          populateQuery.populate({ path: 'userId', select: 'firstName lastName email' });
        }
        
        // Always try to populate tableId
        populateQuery.populate('tableId', 'number name');
        
        // Execute the query
        populatedOrder = await populateQuery.exec();
        
        console.log('Order populated successfully');
      } catch (populateError) {
        // If populate fails, just use the saved order without population
        console.error('Error populating order:', populateError);
        populatedOrder = savedOrder;
      }
      
      if (populatedOrder) {
        console.log('Notifying WebSocket clients about new order...');
        // Notify connected clients about the new order via WebSocket
        try {
          this.wsService.notifyNewOrder(populatedOrder);
          console.log('WebSocket notification sent successfully');
        } catch (wsError) {
          console.error('Error sending WebSocket notification:', wsError);
        }

        // Publish order created event to Kafka
        try {
          await KafkaProducerService.publishOrderCreated(populatedOrder);
          console.log('Kafka event published successfully');
        } catch (kafkaError) {
          console.error('Error publishing to Kafka:', kafkaError);
        }

        // Send order to GrubTech webhook if configured
        try {
          if (GrubTechWebhookService.validateWebhookConfig()) {
            console.log('Sending order to GrubTech webhook...');
            
            // Fetch restaurant and business data for webhook payload
            const restaurantData = await this.fetchRestaurantWithBusiness(populatedOrder.restaurantId);
            const userData = await this.fetchUserData(populatedOrder.userId, populatedOrder.isGuest);
            
            await GrubTechWebhookService.sendOrderToGrubTech(
              populatedOrder,
              restaurantData?.business || { name: 'Unknown Business', _id: 'unknown' },
              userData
            );
            console.log('GrubTech webhook sent successfully');
          } else {
            console.log('GrubTech webhook not configured, skipping...');
          }
        } catch (webhookError) {
          console.error('Error sending to GrubTech webhook:', webhookError);
          // Don't fail the order creation if webhook fails
        }
      }
      
      res.status(201).json(populatedOrder);
    } catch (error: any) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: 'Error creating order', details: error.message });
    }
  }

  // Get all orders with optional filtering
  public async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      // Check if user is authenticated
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Extract query parameters for filtering
      const { 
        restaurantId, 
        status, 
        orderType, 
        paymentStatus,
        startDate,
        endDate,
        tableId,
        tableNumber,
        userId,
        page = '1',
        limit = '50',
        sort = '-createdAt' // Default sort by creation date desc
      } = req.query;
      
      // Build query object
      const query: any = {};
      
      // Role-based scoping
      if (user.role === 'restaurant_admin') {
        // Restaurant admin can only see orders from their business restaurants
        if (!user.businessId) {
          res.status(403).json({ error: 'Restaurant admin user must be associated with a business' });
          return;
        }

        // Import Restaurant model dynamically to avoid circular dependencies
        const { default: Restaurant } = await import('../../../restaurant-service/src/models/Restaurant');
        
        // Get all restaurants for this business
        const businessRestaurants = await Restaurant.find({ businessId: user.businessId }).select('_id');
        const restaurantIds = businessRestaurants.map(r => r._id);

        if (restaurantIds.length === 0) {
          res.status(200).json({
            orders: [],
            total: 0,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: 0
          });
          return;
        }

        // Filter by business restaurants
        query.restaurantId = { $in: restaurantIds };

        // If restaurantId is provided in query, validate it belongs to the business
        if (restaurantId) {
          const requestedRestaurantId = new mongoose.Types.ObjectId(restaurantId as string);
          const isValidRestaurant = restaurantIds.some(id => id.equals(requestedRestaurantId));
          
          if (!isValidRestaurant) {
            res.status(403).json({ error: 'Access denied - restaurant does not belong to your business' });
            return;
          }
          
          query.restaurantId = requestedRestaurantId;
        }
      } else if (user.role === 'system_admin') {
        // System admin can see all orders, apply restaurantId filter if provided
        if (restaurantId) {
          query.restaurantId = new mongoose.Types.ObjectId(restaurantId as string);
        }
      } else if (user.role === 'kitchen_staff') {
        // Kitchen staff can see orders from their assigned restaurants
        console.log('Kitchen staff user accessing orders:', user);
        
        // For now, allow kitchen staff to see all restaurants (can be restricted later)
        // In production, you'd check user.restaurantId or user.assignedRestaurants
        if (restaurantId) {
          query.restaurantId = new mongoose.Types.ObjectId(restaurantId as string);
        }
        
        // Optional: Add kitchen staff specific filtering if user has assigned restaurants
        // if (user.restaurantId) {
        //   query.restaurantId = new mongoose.Types.ObjectId(user.restaurantId);
        // } else if (user.assignedRestaurants && user.assignedRestaurants.length > 0) {
        //   query.restaurantId = { $in: user.assignedRestaurants.map(id => new mongoose.Types.ObjectId(id)) };
        // }
      } else {
        // Regular customers can only see their own orders
        const currentUserId = user.userId || user.id;
        if (!currentUserId) {
          res.status(403).json({ error: 'User ID not found in authentication token' });
          return;
        }
        
        console.log('🔍 Customer order filtering - User ID:', currentUserId);
        query.userId = new mongoose.Types.ObjectId(currentUserId);
        
        // Optional: Filter by table if provided (for better security)
        if (tableId) {
          query.tableId = new mongoose.Types.ObjectId(tableId as string);
          console.log('🔍 Customer order filtering - Table ID:', tableId);
        }
      }
      
      if (status) {
        // Handle multiple status values (e.g., ?status=new&status=preparing)
        if (Array.isArray(status)) {
          query.status = { $in: status };
        } else {
          query.status = status;
        }
      }
      
      if (orderType) {
        query.orderType = orderType;
      }
      
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }
      
      if (tableId) {
        query.tableId = new mongoose.Types.ObjectId(tableId as string);
      }
      
      if (tableNumber) {
        query.tableNumber = tableNumber;
      }
      
      if (userId) {
        // Check if userId is a device ID or valid ObjectId
        const isDeviceId = typeof userId === 'string' && userId.startsWith('device_');
        if (isDeviceId) {
          query.userId = userId; // Use as string for device IDs
        } else if (mongoose.Types.ObjectId.isValid(userId as string)) {
        query.userId = new mongoose.Types.ObjectId(userId as string);
        } else {
          query.userId = userId; // Use as string for other cases
        }
      }
      
      // Add date range filter if provided
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate as string);
        }
      }
      
      // Setup pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;
      
      // Get total count for pagination
      const total = await Order.countDocuments(query);
      
      // Execute query with pagination - separate handling for population
      let orders;
      try {
        // Try to populate userId field, but catch errors for invalid ObjectIds
        orders = await Order.find(query)
          .sort(sort as any)
        .skip(skip)
        .limit(limitNum)
          .populate('tableId', 'number name')
        .exec();
          
        // Manually handle userId population for valid ObjectIds only
        const ordersWithUserInfo = await Promise.all(
          orders.map(async (order) => {
            const orderObj = order.toObject();
            
            // Only try to populate userId if it's a valid ObjectId
            if (order.userId && mongoose.Types.ObjectId.isValid(order.userId.toString())) {
              try {
                const populatedOrder = await Order.findById(order._id)
                  .populate('userId', 'firstName lastName email')
                  .populate('tableId', 'number name')
                  .exec();
                
                if (populatedOrder) {
                  return populatedOrder.toObject();
                }
              } catch (populateError) {
                console.warn(`Failed to populate userId for order ${order._id}:`, populateError);
              }
            }
            
            return orderObj;
          })
        );
        
        orders = ordersWithUserInfo;
      } catch (error) {
        console.warn('Error with population, fetching without userId population:', error);
        // Fallback: fetch without userId population
        orders = await Order.find(query)
          .sort(sort as any)
          .skip(skip)
          .limit(limitNum)
          .populate('tableId', 'number name')
          .exec();
      }
      
      res.status(200).json({
        data: orders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Error fetching orders', details: error.message });
    }
  }

  // Get order by ID
  public async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid order ID format' });
        return;
      }
      
      // First fetch the order without userId population
      const order = await Order.findById(id)
        .populate('tableId', 'number name')
        .populate({
          path: 'items.menuItem',
          select: 'name price image'
        });
      
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Only populate userId if it's a valid ObjectId
      let finalOrder = order.toObject();
      if (order.userId && mongoose.Types.ObjectId.isValid(order.userId.toString())) {
        try {
          const populatedOrder = await Order.findById(id)
            .populate('userId', 'firstName lastName email')
            .populate('tableId', 'number name')
            .populate({
              path: 'items.menuItem',
              select: 'name price image'
            });
          
          if (populatedOrder) {
            finalOrder = populatedOrder.toObject();
          }
        } catch (populateError) {
          console.warn(`Failed to populate userId for order ${id}:`, populateError);
          // Continue with unpopulated order
        }
      }
      
      res.status(200).json(finalOrder);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Error fetching order', details: error.message });
    }
  }

  // Get orders by restaurant
  public async getByRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { status } = req.query;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurant ID' });
        return;
      }

      const query: any = { restaurantId: new mongoose.Types.ObjectId(restaurantId) };

      // Add status filter if provided
      if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();

      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Error getting orders by restaurant:', error);
      res.status(500).json({ error: 'Failed to get orders', details: error.message });
    }
  }

  // Get live orders for KDS (last 8 orders with active statuses)
  public async getLiveOrdersForKDS(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurant ID' });
        return;
      }

      // Define active order statuses for KDS
      const activeStatuses = [
        OrderStatus.PENDING,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY
      ];

      const query = {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        status: { $in: activeStatuses }
      };

      let orders;
      try {
        // Fetch last 8 active orders
        orders = await Order.find(query)
          .sort({ createdAt: -1 })
          .limit(8)
          .populate('tableId', 'number name')
          .exec();

        // Handle userId population carefully for mixed user types
        const ordersWithUserInfo = await Promise.all(
          orders.map(async (order) => {
            const orderObj = order.toObject();
            
            // Only try to populate userId if it's a valid ObjectId
            if (order.userId && mongoose.Types.ObjectId.isValid(order.userId.toString())) {
              try {
                const populatedOrder = await Order.findById(order._id)
                  .populate('userId', 'firstName lastName email')
                  .populate('tableId', 'number name')
                  .exec();
                
                if (populatedOrder) {
                  return populatedOrder.toObject();
                }
              } catch (populateError) {
                console.warn(`Failed to populate userId for order ${order._id}:`, populateError);
              }
            }
            
            return orderObj;
          })
        );

        orders = ordersWithUserInfo;
      } catch (error) {
        console.warn('Error with population, fetching without userId population:', error);
        // Fallback: fetch without userId population
        orders = await Order.find(query)
          .sort({ createdAt: -1 })
          .limit(8)
          .populate('tableId', 'number name')
          .exec();
      }

      res.status(200).json({
        orders,
        total: orders.length,
        restaurantId
      });
    } catch (error: any) {
      console.error('Error getting live orders for KDS:', error);
      res.status(500).json({ error: 'Failed to get live orders', details: error.message });
    }
  }

  // Update order status
  public async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Log request information for debugging
      console.log('Order status update request:');
      console.log('- Order ID:', id);
      console.log('- Request body:', JSON.stringify(req.body));
      console.log('- User:', req.user?.id, req.user?.role);
      console.log('- Valid statuses:', Object.values(OrderStatus));
      
      // Extract status from various possible locations in the payload
      const { status, orderStatus, newStatus } = req.body;
      
      // Determine which status value to use (priority order)
      const rawStatus = status || orderStatus || newStatus;
      
      if (!rawStatus) {
        console.error('No status value found in request body');
        res.status(400).json({ 
          error: 'Missing status field', 
          message: 'Please provide a status value in the request body',
          receivedPayload: req.body,
          validFields: ['status', 'orderStatus', 'newStatus'],
          validValues: Object.values(OrderStatus)
        });
        return;
      }
      
      // Normalize status to uppercase string for case-insensitive comparison
      const normalizedStatus = String(rawStatus).toUpperCase();
      console.log('Normalized status:', normalizedStatus);
      
      // Check if normalized status is a valid enum value
      if (!Object.values(OrderStatus).includes(normalizedStatus as OrderStatus)) {
        console.error('Invalid status value:', normalizedStatus);
        res.status(400).json({ 
          error: 'Invalid order status value', 
          receivedValue: normalizedStatus,
          validValues: Object.values(OrderStatus)
        });
        return;
      }
      
      // Validate order ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('Invalid order ID format:', id);
        res.status(400).json({ error: 'Invalid order ID format' });
        return;
      }
      
      // Find the order
      const order = await Order.findById(id);
      if (!order) {
        console.error('Order not found:', id);
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      console.log('Found order:', order._id, 'Current status:', order.status);
      
      // Store previous status for event tracking
      const previousStatus = order.status;
      
      // Update status with normalized value
      order.status = normalizedStatus as OrderStatus;
      
      // Set estimated prep time if status changed to PREPARING
      if (normalizedStatus === OrderStatus.PREPARING && !order.estimatedPreparationTime) {
        // Default to 15 minutes if not specified
        order.estimatedPreparationTime = 15;
      }
      
      // Save the updated order
      console.log('Saving order with new status:', normalizedStatus);
      const updatedOrder = await order.save();

      // ---- BEGIN Stock Deduction Integration ----
      if (status === OrderStatus.COMPLETED && updatedOrder && updatedOrder.items && updatedOrder.restaurantId) {
        const itemsToDeduct = updatedOrder.items.map(item => ({
          menuItemId: item.menuItem.toString(), // Ensure it's a string
          quantitySold: item.quantity,
        }));

        if (itemsToDeduct.length > 0) {
          const inventoryServiceUrl = `${INVENTORY_SERVICE_BASE_URL}/stock/deduct-for-sale`;
          try {
            console.log(`Attempting stock deduction for order ${updatedOrder._id} at URL: ${inventoryServiceUrl}`);
            const inventoryResponse = await axios.post(inventoryServiceUrl, {
              items: itemsToDeduct,
              restaurantId: updatedOrder.restaurantId.toString(),
              orderId: updatedOrder._id.toString(),
              // userId: updatedOrder.userId?.toString() // Optional: if you have userId and inventory service uses it
            });
            console.log(`Stock deduction for order ${updatedOrder._id} successful:`, inventoryResponse.data.message);
          } catch (error: any) {
            console.error(`Error calling inventory service for stock deduction for order ${updatedOrder._id}:`, error.response ? error.response.data : error.message);
            // For MVP, log and continue. In a real system, consider retry mechanisms or marking the order for later reconciliation.
          }
        } else {
          console.log(`No items to deduct for order ${updatedOrder._id}. Skipping stock deduction.`);
        }
      }
      // ---- END Stock Deduction Integration ----
      
      try {
        // Fetch populated order for response and notifications
        // Use more careful population to avoid device ID issues
        const populateQuery = Order.findById(updatedOrder._id);
        
        // Only try to populate userId if it's a valid ObjectId
        if (updatedOrder.userId && mongoose.Types.ObjectId.isValid(updatedOrder.userId)) {
          populateQuery.populate('userId', 'firstName lastName email');
        }
        
        // Always try to populate tableId
        populateQuery.populate('tableId', 'number name');
        
        // Execute the query
        const populatedOrder = await populateQuery.exec();
        
        if (populatedOrder) {
          console.log('Order populated successfully, sending notifications');
          
          // Notify connected clients about the order update via WebSocket
          try {
            this.wsService.notifyOrderUpdated(populatedOrder);
            console.log('WebSocket notification sent');
          } catch (wsError) {
            console.error('WebSocket notification error:', wsError);
            // Continue even if WebSocket fails - don't block the response
          }
          
          // Publish order status changed event to Kafka
          try {
            await KafkaProducerService.publishOrderStatusChanged(populatedOrder, previousStatus);
            console.log('Kafka event published');
          } catch (kafkaError) {
            console.error('Kafka event error:', kafkaError);
            // Continue even if Kafka fails - don't block the response
          }
          
          console.log('Returning populated order');
          res.status(200).json(populatedOrder);
        } else {
          // Fallback to unpopulated order if population fails
          console.log('Returning unpopulated order (population failed)');
          res.status(200).json(updatedOrder);
        }
      } catch (populateError) {
        // If population fails, return the unpopulated order
        console.error('Error populating order:', populateError);
        res.status(200).json(updatedOrder);
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      
      // Handle specific error types
      if (error.name === 'CastError' && error.path === '_id') {
        if (error.value && typeof error.value === 'string' && error.value.startsWith('device_')) {
          console.error('Device ID authentication error. The userId appears to be a device ID:', error.value);
          res.status(400).json({ 
            error: 'Device authentication error',
            message: 'Cannot update order with device authentication',
            details: 'Please use admin authentication for this operation'
          });
          return;
        }
      }
      
      // Return detailed error information
      res.status(500).json({ 
        error: 'Error updating order status', 
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      });
    }
  }

  // Update payment status
  public async updatePaymentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;
      
      if (!Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
        res.status(400).json({ error: 'Invalid payment status value' });
        return;
      }
      
      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      // Store previous payment status for event
      const previousPaymentStatus = order.paymentStatus;
      
      // Update payment status
      order.paymentStatus = paymentStatus as PaymentStatus;
      
      // Apply loyalty discount when payment is successful
      if (paymentStatus === PaymentStatus.PAID && 
          order.loyaltyDiscount?.applied && 
          order.userId && 
          !order.isGuest) {
        try {
          console.log('Applying loyalty discount for paid order:', id);
          const loyaltyResult = await LoyaltyService.applyDiscount(
            order.userId.toString(),
            order.restaurantId.toString(),
            order.subtotal,
            order.loyaltyDiscount.discountAmount,
            order.loyaltyDiscount.discountPercent
          );
          
          if (loyaltyResult.success) {
            console.log('Loyalty discount successfully applied and visit recorded');
          } else {
            console.error('Failed to apply loyalty discount:', loyaltyResult.error);
          }
        } catch (loyaltyError) {
          console.error('Error applying loyalty discount:', loyaltyError);
          // Don't fail the payment update if loyalty fails
        }
      }
      
      const updatedOrder = await order.save();
      
      // Fetch populated order for response and notifications
      const populatedOrder = await Order.findById(updatedOrder._id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();
      
      if (populatedOrder) {
        // Notify connected clients about the order update via WebSocket
        this.wsService.notifyOrderUpdated(populatedOrder);

        // Publish payment status changed event to Kafka
        await KafkaProducerService.publishPaymentStatusChanged(
          populatedOrder,
          previousPaymentStatus
        );
      }
      
      res.status(200).json(populatedOrder);
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ error: 'Error updating payment status', details: error.message });
    }
  }

  // Cancel order
  public async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body; // Optional cancellation reason
      
      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      // Check if order can be cancelled (not already delivered/completed)
      const nonCancellableStatuses = [
        OrderStatus.DELIVERED, 
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED
      ];
      
      if (nonCancellableStatuses.includes(order.status as OrderStatus)) {
        res.status(400).json({ 
          error: `Cannot cancel order in ${order.status} status`
        });
        return;
      }
      
      // Store previous status for event
      const previousStatus = order.status;
      
      // Update order
      order.status = OrderStatus.CANCELLED;
      if (reason) {
        order.cancellationReason = reason;
      }
      
      const cancelledOrder = await order.save();
      
      // Fetch populated order for response and notifications
      const populatedOrder = await Order.findById(cancelledOrder._id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();
      
      if (populatedOrder) {
        // Notify connected clients about the order cancellation via WebSocket
        this.wsService.notifyOrderCancellation(populatedOrder);

        // Publish order cancelled event to Kafka
        await KafkaProducerService.publishOrderCancelled(populatedOrder);
      }
      
      res.status(200).json(populatedOrder);
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ error: 'Error cancelling order', details: error.message });
    }
  }

  // Get orders by table
  public async getByTable(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { restaurantId, tableNumber } = req.params;
      
      if (!restaurantId || !tableNumber) {
        res.status(400).json({ error: 'Restaurant ID and table number are required' });
        return;
      }
      
      // Find orders for this table
      const orders = await Order.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        tableNumber,
        status: { $nin: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] } // Only get active orders for a table
      })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email')
      .exec();
      
      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Error fetching orders by table:', error);
      res.status(500).json({ error: 'Error fetching orders by table', details: error.message });
    }
  }
  
  // Get orders for the currently authenticated user
  public async getMyOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      const userId = req.user.id;
      const userEmail = req.user.email;
      const userRole = req.user.role;
      
      // Get additional context from query parameters for session-based filtering
      const { tableId, deviceId, restaurantId } = req.query;
      
      // Cast query parameters to strings for proper type handling
      const tableIdStr = tableId as string;
      const deviceIdStr = deviceId as string;
      const restaurantIdStr = restaurantId as string;
      
      console.log(`=== MY ORDERS API DEBUG ===`);
      console.log(`Authenticated user: ${userId}, email: ${userEmail}, role: ${userRole}`);
      console.log(`Query params - tableId: ${tableIdStr}, deviceId: ${deviceIdStr}, restaurantId: ${restaurantIdStr}`);
      
      // Check if this is a guest user ID (starts with "device_")
      const isGuestId = typeof userId === 'string' && userId.startsWith('device_');
      console.log(`Is guest ID: ${isGuestId}`);
      
      let query: any = {};
      
      if (isGuestId || userRole === 'guest') {
        // For guest users, use device-based filtering with additional session context
        console.log('Using guest/device ID filtering for orders');
        
        const baseUserQuery = {
          $or: [
            { deviceId: userId },
            { userId: userId },
            { isGuest: true, userId: userId }
          ]
        };
        
        // Add session-specific filters for guests
        query = { ...baseUserQuery };
        
        // CRITICAL FIX: Add table-based filtering for current session
        if (tableIdStr) {
          query.tableId = mongoose.Types.ObjectId.isValid(tableIdStr) 
            ? new mongoose.Types.ObjectId(tableIdStr) 
            : tableIdStr;
          console.log(`Added table filter for guest: ${tableIdStr}`);
        }
        
        // Add device-based filtering if different from userId
        if (deviceIdStr && deviceIdStr !== userId) {
          query.$or.push({ deviceId: deviceIdStr });
          console.log(`Added additional device filter: ${deviceIdStr}`);
        }
        
        console.log('Guest user query:', JSON.stringify(query, null, 2));
      } else {
        // For regular authenticated users, search by ObjectId with session context
        console.log('Using authenticated user ID filtering for orders');
        
        if (mongoose.Types.ObjectId.isValid(userId)) {
          query = {
            $or: [
              { userId: new mongoose.Types.ObjectId(userId) },
              { userId: userId } // Also check string representation for edge cases
            ]
          };
        } else {
          // If not a valid ObjectId, treat as string
          query = { userId: userId };
        }
        
        // CRITICAL FIX: Add table-based filtering for current session (authenticated users)
        if (tableIdStr) {
          query.tableId = mongoose.Types.ObjectId.isValid(tableIdStr) 
            ? new mongoose.Types.ObjectId(tableIdStr) 
            : tableIdStr;
          console.log(`Added table filter for authenticated user: ${tableIdStr}`);
        }
        
        console.log('Authenticated user query:', JSON.stringify(query, null, 2));
      }
      
      // Add restaurant filter if provided (additional security)
      if (restaurantIdStr && mongoose.Types.ObjectId.isValid(restaurantIdStr)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantIdStr);
        console.log(`Added restaurant filter: ${restaurantIdStr}`);
      }
      
      // CRITICAL FIX: Add time-based filtering to only show recent orders (last 24 hours)
      // This prevents old orders from appearing in current sessions
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: twentyFourHoursAgo };
      console.log(`Added time filter - orders after: ${twentyFourHoursAgo.toISOString()}`);
      
      console.log('Final order query:', JSON.stringify(query, null, 2));
      
      // Execute the query
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('restaurantId', 'name')
        .populate('tableId', 'number')
        .exec();
      
      console.log(`Query returned ${orders.length} orders for user ${userId}`);
      console.log(`Orders found:`, orders.map(o => ({ 
        id: o._id, 
        orderNumber: o.orderNumber, 
        tableId: o.tableId, 
        userId: o.userId,
        deviceId: o.deviceId,
        createdAt: o.createdAt 
      })));
      console.log(`=== END MY ORDERS DEBUG ===`);
      
      // For guest users, avoid populating userId to prevent cast errors
      if (!isGuestId && userRole !== 'guest') {
        // Only populate userId for non-guest users
        try {
          const populatedOrders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('restaurantId', 'name')
            .populate('tableId', 'number')
            .populate('userId', 'firstName lastName email')
            .exec();
          
          console.log(`Populated orders for authenticated user`);
          res.status(200).json(populatedOrders);
        } catch (populateError) {
          console.error('Error populating userId, returning unpopulated orders:', populateError);
          res.status(200).json(orders);
        }
      } else {
        // For guest users, return orders without userId population
        console.log(`Returning orders for guest user without userId population`);
        res.status(200).json(orders);
      }
    } catch (error: any) {
      console.error('Error fetching user orders:', error);
      res.status(500).json({ error: 'Error fetching user orders', details: error.message });
    }
  }

  // Get orders by user
  public async getByUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // Check if this is a guest user ID (starts with "device_")
      const isGuestId = userId.startsWith('device_');
      
      // Create the filter query based on user ID type
      let query: any = {};
      if (isGuestId) {
        // For guest users, search by deviceId and userId fields (don't convert to ObjectId)
        query = {
          $or: [
            { deviceId: userId },
            { userId: userId },
            { isGuest: true, userId: userId }
          ]
        };
        console.log(`Looking for orders with guest userId: ${userId}, query:`, JSON.stringify(query));
      } else if (mongoose.Types.ObjectId.isValid(userId)) {
        // For registered users, convert to ObjectId
        query = { userId: new mongoose.Types.ObjectId(userId) };
        console.log(`Looking for orders with registered userId: ${userId}`);
      } else {
        // Invalid ID format for non-guest users
        console.error(`Invalid user ID format: ${userId}`);
        res.status(400).json({ error: 'Invalid user ID format' });
        return;
      }
      
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('restaurantId', 'name') // Populate restaurant name
        .populate('tableId', 'number') // Populate table number if exists
        .exec();
      
      console.log(`Found ${orders.length} orders for user ${userId}`);
      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Error fetching user orders:', error);
      res.status(500).json({ error: 'Error fetching user orders', details: error.message });
    }
  }

  // Update order details (items, special instructions, etc.)
  public async updateDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Don't allow updating status or payment status via this endpoint
      delete updates.status;
      delete updates.paymentStatus;
      
      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      // Don't allow updating completed or cancelled orders
      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        res.status(400).json({ error: `Cannot update ${order.status} order` });
        return;
      }
      
      // Calculate new totals if items are being updated
      if (updates.items) {
        let subtotal = 0;
        updates.items.forEach((item: any) => {
          // Calculate item subtotal
          let itemSubtotal = item.price * item.quantity;
          
          // Add modifier prices
          if (item.modifiers && item.modifiers.length > 0) {
            item.modifiers.forEach((mod: any) => {
              if (mod.selections && mod.selections.length > 0) {
                mod.selections.forEach((sel: any) => {
                  itemSubtotal += sel.price * sel.quantity;
                });
              }
            });
          }
          
          // Set item subtotal
          item.subtotal = itemSubtotal;
          
          // Add to order subtotal
          subtotal += itemSubtotal;
        });
        
        // Update order totals
        updates.subtotal = subtotal;
        updates.tax = 0; // Tax disabled per user request
        
        // Calculate service charge based on restaurant settings
        let serviceChargeAmount = 0;
        try {
          console.log('=== UPDATE SERVICE CHARGE CALCULATION DEBUG ===');
          console.log('Restaurant ID:', order.restaurantId);
          console.log('Subtotal for calculation:', subtotal);
          
          // Try multiple possible endpoints for restaurant service
          const possibleUrls = [
            `http://localhost:3001/api/restaurants/${order.restaurantId}`,
            `http://localhost:3000/api/restaurants/${order.restaurantId}`,
            `http://localhost:4000/api/restaurants/${order.restaurantId}`
          ];
          
          let restaurant: any = null;
          let successUrl: string | null = null;
          
          for (const url of possibleUrls) {
            try {
              console.log(`Trying restaurant API URL: ${url}`);
              
              const restaurantResponse = await axios.get(url, {
                headers: {
                  'Authorization': req.headers.authorization || ''
                },
                timeout: 5000 // 5 second timeout
              });
              
              console.log(`✅ Success! Restaurant API Response Status: ${restaurantResponse.status}`);
              restaurant = restaurantResponse.data;
              successUrl = url;
              break;
            } catch (urlError: unknown) {
              const errorMessage = urlError instanceof Error ? urlError.message : 'Unknown error';
              console.log(`❌ Failed to fetch from ${url}:`, errorMessage);
              continue;
            }
          }
          
          if (!restaurant) {
            throw new Error('Could not fetch restaurant data from any available endpoint');
          }
          
          console.log(`Successfully fetched restaurant data from: ${successUrl}`);
          console.log('Service charge settings from restaurant:', restaurant.service_charge);
          
          // Check if service charge is configured and enabled
          if (restaurant.service_charge && 
              restaurant.service_charge.enabled === true && 
              typeof restaurant.service_charge.percentage === 'number' && 
              restaurant.service_charge.percentage > 0) {
            
            const percentage = restaurant.service_charge.percentage;
            serviceChargeAmount = parseFloat((subtotal * (percentage / 100)).toFixed(2));
            
            console.log(`✅ Service charge recalculated: ${percentage}% = $${serviceChargeAmount}`);
          } else {
            console.log('❌ Service charge not enabled or not configured for restaurant during update');
          }
          console.log('=== END UPDATE SERVICE CHARGE DEBUG ===');
        } catch (serviceChargeError: unknown) {
          console.error('=== UPDATE SERVICE CHARGE ERROR ===');
          console.error('Error fetching restaurant service charge settings during update:', serviceChargeError);
          if (serviceChargeError && typeof serviceChargeError === 'object' && 'response' in serviceChargeError) {
            const axiosError = serviceChargeError as any;
            console.error('Error response status:', axiosError.response?.status);
            console.error('Error response data:', axiosError.response?.data);
          }
          
          // As a fallback, try to fetch restaurant directly from database
          try {
            console.log('🔄 Attempting database fallback for restaurant data during update...');
            const { default: Restaurant } = await import('../../../restaurant-service/src/models/Restaurant');
            const restaurantFromDb = await Restaurant.findById(order.restaurantId);
            
            if (restaurantFromDb && restaurantFromDb.service_charge && 
                restaurantFromDb.service_charge.enabled === true && 
                typeof restaurantFromDb.service_charge.percentage === 'number' && 
                restaurantFromDb.service_charge.percentage > 0) {
              
              const percentage = restaurantFromDb.service_charge.percentage;
              serviceChargeAmount = parseFloat((subtotal * (percentage / 100)).toFixed(2));
              
              console.log(`✅ Database fallback successful during update! Service charge: ${percentage}% = $${serviceChargeAmount}`);
            } else {
              console.log('❌ Database fallback: Service charge not properly configured, keeping existing value');
              serviceChargeAmount = order.service_charge || 0;
            }
          } catch (dbError: unknown) {
            const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
            console.error('❌ Database fallback also failed during update:', errorMessage);
            serviceChargeAmount = order.service_charge || 0;
          }
          
          console.error('=== END UPDATE SERVICE CHARGE ERROR ===');
        }
        
        updates.service_charge = serviceChargeAmount;
        // Calculate loyalty discount amount if applied to existing order
        const loyaltyDiscountAmount = (order.loyaltyDiscount?.applied && order.loyaltyDiscount?.discountAmount) ? order.loyaltyDiscount.discountAmount : 0;
        updates.total = subtotal + serviceChargeAmount + (updates.tip || order.tip || 0) - loyaltyDiscountAmount;
      }
      
      // Apply updates
      Object.assign(order, updates);
      
      // Save and populate the updated order
      const updatedOrder = await order.save();
      const populatedOrder = await Order.findById(updatedOrder._id)
        .populate('userId', 'firstName lastName email')
        .populate('tableId', 'number name')
        .exec();
      
      if (populatedOrder) {
        // Notify via WebSocket
        this.wsService.notifyOrderUpdated(populatedOrder);

        // Publish to Kafka
        await KafkaProducerService.publishOrderUpdated(populatedOrder);
      }
      
      res.status(200).json(populatedOrder);
    } catch (error: any) {
      console.error('Error updating order details:', error);
      res.status(500).json({ error: 'Error updating order details', details: error.message });
    }
  }

  // Send alert about an order
  public async sendAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { message } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid order ID' });
        return;
      }

      if (!message) {
        res.status(400).json({ error: 'Alert message is required' });
        return;
      }

      const order = await Order.findById(id);

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Send WebSocket notification with the alert
      this.wsService.notifyOrderAlert(
        order.restaurantId.toString(),
        id,
        message
      );

      res.status(200).json({
        success: true,
        message: 'Alert sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending order alert:', error);
      res.status(500).json({ error: 'Failed to send order alert', details: error.message });
    }
  }

  // Update individual item status within an order
  public async updateItemStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId, itemId } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        res.status(400).json({ error: 'Invalid order ID' });
        return;
      }

      if (!status) {
        res.status(400).json({ error: 'Item status is required' });
        return;
      }

      // Valid item statuses (can be extended as needed)
      const validItemStatuses = ['pending', 'preparing', 'ready', 'served'];
      if (!validItemStatuses.includes(status)) {
        res.status(400).json({ 
          error: 'Invalid item status', 
          validStatuses: validItemStatuses 
        });
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Find the item in the order
      const itemIndex = order.items.findIndex(item => item._id?.toString() === itemId);
      if (itemIndex === -1) {
        res.status(404).json({ error: 'Item not found in order' });
        return;
      }

      // Update the item status
      order.items[itemIndex].status = status;
      
      // Check if all items are served to update order status
      const allItemsServed = order.items.every(item => item.status === 'served');
      if (allItemsServed && order.status !== OrderStatus.COMPLETED) {
        order.status = OrderStatus.READY;
      }

      const updatedOrder = await order.save();

      // Populate the order for response
      let populatedOrder;
      try {
        const populateQuery = Order.findById(updatedOrder._id);
        
        if (updatedOrder.userId && mongoose.Types.ObjectId.isValid(updatedOrder.userId.toString())) {
          populateQuery.populate('userId', 'firstName lastName email');
        }
        
        populateQuery.populate('tableId', 'number name');
        populatedOrder = await populateQuery.exec();
      } catch (populateError) {
        console.warn('Error populating order:', populateError);
        populatedOrder = updatedOrder;
      }

      if (populatedOrder) {
        // Notify via WebSocket with item status change
        try {
          this.wsService.notifyItemStatusChange(
            populatedOrder.restaurantId.toString(),
            orderId,
            itemId,
            status
          );
        } catch (wsError) {
          console.error('WebSocket notification error:', wsError);
        }
      }

      res.status(200).json({
        success: true,
        order: populatedOrder,
        updatedItem: {
          itemId,
          status,
          itemName: order.items[itemIndex].name
        }
      });
    } catch (error: any) {
      console.error('Error updating item status:', error);
      res.status(500).json({ error: 'Failed to update item status', details: error.message });
    }
  }

  // Helper method to fetch restaurant with business data
  private async fetchRestaurantWithBusiness(restaurantId: any): Promise<any> {
    try {
      // Import Restaurant model dynamically to avoid circular dependencies
      const { default: Restaurant } = await import('../../../restaurant-service/src/models/Restaurant');
      const { default: Business } = await import('../../../restaurant-service/src/models/Business');
      
      const restaurant = await Restaurant.findById(restaurantId).populate('businessId');
      
      if (restaurant && restaurant.businessId) {
        return {
          restaurant,
          business: restaurant.businessId
        };
      }
      
      // Fallback: get business separately if populate failed
      if (restaurant) {
        const business = await Business.findById(restaurant.businessId);
        return {
          restaurant,
          business
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching restaurant with business:', error);
      return null;
    }
  }

  // Helper method to fetch user data for webhook
  private async fetchUserData(userId: any, isGuest?: boolean): Promise<any> {
    try {
      // Skip user lookup for guest users
      if (isGuest || (typeof userId === 'string' && userId.startsWith('device_'))) {
        return null;
      }

      // Import User model dynamically to avoid circular dependencies
      const { default: User } = await import('../../../auth-service/src/models/user.model');
      
      if (mongoose.Types.ObjectId.isValid(userId)) {
        const user = await User.findById(userId).select('firstName lastName email phoneNumber');
        
        if (user) {
          return {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
            email: user.email,
            phone: user.phoneNumber
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }
}

export default OrderController;
