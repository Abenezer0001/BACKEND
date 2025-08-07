import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import Order, { PaymentStatus } from '../models/Order';
import Payment, { IPayment } from '../models/Payment';
import { StripeConnectBusinessService } from '../services/StripeConnectBusinessService';

// Extend Express Request type to include rawBody property
interface ExtendedRequest extends Request {
  rawBody?: Buffer | string;
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const stripeConnectService = new StripeConnectBusinessService();

// Create a Stripe checkout session
export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Generate a custom session ID that's more friendly for the frontend
  // Format: session_{timestamp} - defined at the top level for scope
  const customSessionId = `session_${Date.now()}`;
  
  try {
    const { lineItems, orderId, tableId, restaurantId, successUrl, cancelUrl } = req.body;
    
    console.log('🔍 BACKEND: Payment request received:', {
      orderId,
      tableId,
      restaurantId,
      lineItemsCount: lineItems?.length || 0,
      successUrl,
      cancelUrl,
      fullRequestBody: JSON.stringify(req.body, null, 2)
    });
    
    if (!lineItems || lineItems.length === 0) {
      console.error('❌ BACKEND: No line items provided in request');
      res.status(400).json({
        success: false,
        error: {
          message: 'No items provided for checkout'
        }
      });
      return;
    }
    
    console.log('🔍 BACKEND: Raw line items received from frontend:');
    lineItems.forEach((item: any, index: number) => {
      console.log(`Line Item ${index + 1}:`, {
        name: item.price_data?.product_data?.name,
        unit_amount: item.price_data?.unit_amount,
        unit_amount_dollars: (item.price_data?.unit_amount || 0) / 100,
        quantity: item.quantity,
        total_cents: (item.price_data?.unit_amount || 0) * (item.quantity || 0),
        total_dollars: ((item.price_data?.unit_amount || 0) * (item.quantity || 0)) / 100,
        fullItem: JSON.stringify(item, null, 2)
      });
    });
    
    // Validate and clean line items
    const validatedLineItems = lineItems.map((item: any, index: number) => {
      console.log(`🔍 BACKEND: Processing line item ${index + 1} - BEFORE validation:`, {
        name: item.price_data?.product_data?.name,
        originalAmount: item.price_data?.unit_amount,
        originalQuantity: item.quantity
      });
      
      // Ensure unit_amount is a valid integer
      let unitAmount = 0;
      if (item.price_data && item.price_data.unit_amount !== undefined) {
        unitAmount = Math.round(Number(item.price_data.unit_amount));
        if (isNaN(unitAmount) || unitAmount < 0) {
          console.error(`❌ BACKEND: Invalid unit_amount for item: ${item.price_data.product_data?.name}`, {
            originalAmount: item.price_data.unit_amount,
            processedAmount: unitAmount
          });
          throw new Error(`Invalid unit_amount for item: ${item.price_data.product_data?.name || 'Unknown'}`);
        }
      } else {
        console.error(`❌ BACKEND: Missing unit_amount for item: ${item.price_data?.product_data?.name}`);
        throw new Error(`Missing unit_amount for item: ${item.price_data?.product_data?.name || 'Unknown'}`);
      }
      
      // Ensure quantity is valid
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      
      const validatedItem = {
        price_data: {
          currency: item.price_data.currency || 'usd',
          product_data: {
            name: item.price_data.product_data?.name || 'Item',
            description: item.price_data.product_data?.description,
            images: item.price_data.product_data?.images
          },
          unit_amount: unitAmount
        },
        quantity: quantity
      };
      
      console.log(`✅ BACKEND: Line item ${index + 1} - AFTER validation:`, {
        name: validatedItem.price_data.product_data.name,
        unit_amount: validatedItem.price_data.unit_amount,
        unit_amount_dollars: validatedItem.price_data.unit_amount / 100,
        quantity: validatedItem.quantity,
        total_cents: validatedItem.price_data.unit_amount * validatedItem.quantity,
        total_dollars: (validatedItem.price_data.unit_amount * validatedItem.quantity) / 100
      });
      
      return validatedItem;
    });
    
    console.log(`🔍 BACKEND: Total validated line items: ${validatedLineItems.length}`);

    // Set default success and cancel URLs if not provided
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const defaultSuccessUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`;
    
    // Ensure metadata values are strings as required by Stripe
    // Check if tableId is an object and extract its ID
    let tableIdString = '';
    if (tableId) {
      if (typeof tableId === 'object' && tableId !== null) {
        // Extract ID from object (could be in id, _id, or just use toString())
        tableIdString = tableId.id || tableId._id || tableId.toString();
        console.log('Converting tableId object to string:', tableIdString);
      } else {
        // It's already a primitive value, convert to string
        tableIdString = String(tableId);
      }
    }

    // Same for restaurantId and orderId
    const restaurantIdString = restaurantId ? String(restaurantId) : '';
    const orderIdString = orderId ? String(orderId) : '';
    
    console.log('Metadata being sent to Stripe:', {
      tableId: tableIdString,
      restaurantId: restaurantIdString,
      orderId: orderIdString
    });
    
    // Calculate total amount from line items for validation
    const totalAmountCents = validatedLineItems.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);
    const totalAmountDollars = totalAmountCents / 100;
    
    console.log('🧮 Payment Controller Validation:', {
      totalLineItems: validatedLineItems.length,
      totalAmountCents,
      totalAmountDollars,
      lineItemsBreakdown: validatedLineItems.map(item => ({
        name: item.price_data.product_data.name,
        unit_amount: item.price_data.unit_amount,
        quantity: item.quantity,
        total: item.price_data.unit_amount * item.quantity
      }))
    });
    
    // Validate total amount
    if (totalAmountCents <= 0) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid payment amount: $${totalAmountDollars.toFixed(2)}. Total must be greater than $0.`
        }
      });
      return;
    }
    
    if (totalAmountCents > 100000) { // Over $1000
      res.status(400).json({
        success: false,
        error: {
          message: `Payment amount too high: $${totalAmountDollars.toFixed(2)}. Please verify the order total.`
        }
      });
      return;
    }

    console.log('🔍 BACKEND: Sending to Stripe - Complete session data:', {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items_count: validatedLineItems.length,
      metadata: {
        tableId: tableIdString,
        restaurantId: restaurantIdString,
        orderId: orderIdString,
        calculatedTotal: totalAmountCents.toString()
      },
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      line_items_detail: validatedLineItems.map((item, idx) => ({
        index: idx + 1,
        name: item.price_data.product_data.name,
        unit_amount: item.price_data.unit_amount,
        quantity: item.quantity,
        total: item.price_data.unit_amount * item.quantity
      })),
      calculated_total_cents: totalAmountCents,
      calculated_total_dollars: totalAmountDollars
    });

    // Create a Stripe checkout session with properly stringified metadata
    console.log('🚀 BACKEND: Creating Stripe session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: validatedLineItems,
      mode: 'payment',
      metadata: {
        tableId: tableIdString,
        restaurantId: restaurantIdString,
        orderId: orderIdString,
        calculatedTotal: totalAmountCents.toString()
      },
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
    });
    
    console.log('✅ BACKEND: Stripe session created successfully:', {
      id: session.id,
      amount_total: session.amount_total,
      amount_total_dollars: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      payment_status: session.payment_status,
      url: session.url
    });

    console.log(`✅ Stripe session created successfully with ID: ${session.id}`);
    
    // Ensure we have a proper session ID before trying to save
    if (!session.id || typeof session.id !== 'string' || !session.id.startsWith('cs_')) {
      console.error('❌ Invalid Stripe session ID format:', session.id);
      res.status(500).json({
        success: false,
        error: {
          message: 'Invalid session ID returned from Stripe'
        }
      });
      return;
    }
    
    try {
      // Log the generated custom session ID
      console.log(`Using custom session ID: ${customSessionId} for Stripe session: ${session.id}`);
      
      // Store the session information with additional debugging info
      const payment = new Payment({
        stripeSessionId: session.id,
        customSessionId: customSessionId,
        orderId: orderId || null,
        status: 'pending',
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || 'usd',
        createdAt: new Date(),
        metadata: {
          tableId: tableId || null,
          restaurantId: restaurantId || null,
          checkoutUrl: session.url || null
        }
      });
      
      console.log('💾 Saving payment record to database:', { 
        sessionId: session.id,
        orderId,
        amount: session.amount_total ? session.amount_total / 100 : 0 
      });
      
      await payment.save();
      console.log(`✅ Payment record saved successfully for session ${session.id}`);
      
      // Double-check that we can retrieve the payment we just saved
      const savedPayment = await Payment.findOne({ stripeSessionId: session.id });
      if (savedPayment) {
        console.log(`✅ Payment record verified in database for session ${session.id}`);
      } else {
        console.error(`❌ Payment record verification failed for session ${session.id}`);
      }
      
      // Create payment record if it doesn't exist but the session exists on Stripe
      if (!savedPayment && session && session.id) {
        try {
          console.log(`Creating missing payment record for session ${session.id}`);
          
          // Create a new payment record based on the Stripe session
          const newPayment = new Payment({
            stripeSessionId: session.id,
            status: session.payment_status === 'paid' ? 'paid' : 'pending',
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'usd',
            createdAt: new Date(),
            metadata: session.metadata || {}
          });
          
          await newPayment.save();
          console.log(`✅ Missing payment record created for session ${session.id}`);
        } catch (dbError) {
          console.error(`❌ Error creating missing payment record:`, dbError);
          // Continue even if saving fails - we'll still return the Stripe data
        }
      }
      
      // Return the session URL, both the original and custom session IDs
      res.status(200).json({
        success: true,
        url: session.url,
        sessionId: session.id,
        customSessionId: customSessionId,
        orderId: orderId || null
      });
    } catch (dbError) {
      console.error('❌ Error saving payment record:', dbError);
      // We'll still return success since the Stripe session was created
      // But we'll log the error for debugging
      res.status(200).json({
        success: true,
        url: session.url,
        sessionId: session.id,
        customSessionId: customSessionId,
        orderId: orderId || null,
        warning: 'Payment record creation had issues, but checkout can proceed'
      });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create checkout session'
      }
    });
  }
};

// Create a checkout session with platform fee (for businesses with Stripe Connect)
export const createCheckoutSessionWithPlatformFee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lineItems, orderId, tableId, restaurantId, businessId, successUrl, cancelUrl, platformFeePercentage } = req.body;
    
    if (!lineItems || lineItems.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'No items provided for checkout'
        }
      });
      return;
    }

    if (!businessId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Business ID is required for platform fee payments'
        }
      });
      return;
    }

    // Calculate total amount from line items
    const totalAmount = lineItems.reduce((sum: number, item: any) => {
      return sum + (item.price_data?.unit_amount || item.amount || 0) * (item.quantity || 1);
    }, 0);

    // Calculate platform fee
    const feePercentage = platformFeePercentage || 5.0;
    const applicationFeeAmount = Math.round((totalAmount * feePercentage) / 100);

    // Get business Stripe Connect account
    const Business = mongoose.model('Business');
    const business = await Business.findById(businessId);
    
    if (!business || !business.stripeConnectAccount?.accountId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Business Stripe Connect account not found or not set up'
        }
      });
      return;
    }

    if (business.stripeConnectAccount.accountStatus !== 'active') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Business Stripe Connect account is not active'
        }
      });
      return;
    }

    // Set default URLs
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const defaultSuccessUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`;
    
    // Create Stripe session with application fee
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: business.stripeConnectAccount.accountId,
        },
        metadata: {
          tableId: tableId ? String(tableId) : '',
          restaurantId: restaurantId ? String(restaurantId) : '',
          orderId: orderId ? String(orderId) : '',
          businessId: String(businessId),
          platformFeePercentage: feePercentage.toString(),
          applicationFeeAmount: applicationFeeAmount.toString()
        }
      },
      metadata: {
        tableId: tableId ? String(tableId) : '',
        restaurantId: restaurantId ? String(restaurantId) : '',
        orderId: orderId ? String(orderId) : '',
        businessId: String(businessId),
        platformFeePercentage: feePercentage.toString(),
        applicationFeeAmount: applicationFeeAmount.toString()
      },
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
    });

    console.log(`✅ Platform fee checkout session created: ${session.id}, Fee: ${applicationFeeAmount/100} USD`);
    
    // Store payment record
    const payment = new Payment({
      stripeSessionId: session.id,
      orderId: orderId || null,
      status: 'pending',
      amount: session.amount_total ? session.amount_total / 100 : totalAmount / 100,
      currency: session.currency || 'usd',
      metadata: {
        tableId: tableId || null,
        restaurantId: restaurantId || null,
        businessId: businessId,
        platformFeeAmount: applicationFeeAmount,
        platformFeePercentage: feePercentage,
        checkoutUrl: session.url
      }
    });
    
    await payment.save();
    
    res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
      orderId: orderId || null,
      platformFee: {
        amount: applicationFeeAmount / 100,
        percentage: feePercentage,
        businessReceives: (totalAmount - applicationFeeAmount) / 100
      }
    });
  } catch (error) {
    console.error('Error creating platform fee checkout session:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create checkout session'
      }
    });
  }
};

// Check the status of a payment session
export const checkSessionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const orderId = req.query.orderId as string;
    
    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Session ID is required'
        }
      });
      return;
    }
    
    console.log(`Received request to check session status for: ${sessionId}`);
    
    // Check if this is a custom frontend session ID (like session_{timestamp})
    const isCustomSessionId = sessionId.startsWith('session_');
    
    // First check if we have the payment in our database using Stripe's session ID
    let payment: (mongoose.Document<unknown, {}, IPayment> & IPayment & { _id: mongoose.Types.ObjectId }) | null = null;
    
    if (isCustomSessionId) {
      console.log(`Received custom session ID format: ${sessionId}`);
      
      // First try to find payment by custom session ID
      payment = await Payment.findOne({ customSessionId: sessionId });
      
      if (payment) {
        console.log(`Found payment using customSessionId mapping: ${payment.stripeSessionId}`);
      } else if (orderId) {
        // If not found by custom ID, try by order ID
        console.log(`Searching for payment with orderId: ${orderId}`);
        payment = await Payment.findOne({ orderId });
        
        if (payment) {
          console.log(`Found payment using orderId: ${payment.stripeSessionId}`);
        }
      }
      
      // Try to extract timestamp if available
      const timestamp = sessionId.replace('session_', '');
      if (!payment && timestamp) {
        console.log(`Trying to find payment created around timestamp: ${timestamp}`);
        try {
          // Find payments created around this timestamp (within a window)
          const creationTime = new Date(parseInt(timestamp));
          const windowStart = new Date(creationTime.getTime() - 5 * 60 * 1000); // 5 minutes before
          const windowEnd = new Date(creationTime.getTime() + 5 * 60 * 1000);  // 5 minutes after
          
          payment = await Payment.findOne({
            createdAt: {
              $gte: windowStart,
              $lte: windowEnd
            }
          });
          
          if (payment) {
            console.log(`Found payment created around timestamp: ${payment.stripeSessionId}`);
          }
        } catch (parseError) {
          console.error(`Error parsing timestamp ${timestamp}:`, parseError);
          // Continue with other lookup strategies
        }
      }
    } else {
      // Standard lookup by Stripe session ID
      payment = await Payment.findOne({ stripeSessionId: sessionId });
    }

    if (!payment) {
      // If no payment record exists in our database
      console.log(`No payment record found in database for session ID: ${sessionId}`);
      console.log('Will attempt to retrieve directly from Stripe anyway');
      
      // If we have an order ID but couldn't find a payment, check if the order exists
      if (orderId) {
        try {
          // Get the Order model - use type casting to avoid TypeScript errors
          const OrderModel = mongoose.model<any>('Order');
          const order = await OrderModel.findById(orderId);
          if (order && order.paymentStatus === 'paid') {
            // If the order exists and is marked as paid, create a payment record
            console.log(`Order ${orderId} exists and is paid, creating payment record`);
            
            // Create a new payment record
            const newPayment = new Payment({
              orderId,
              status: 'paid',
              amount: order.total,
              currency: 'usd',
              createdAt: order.createdAt,
              updatedAt: new Date()
            });
            
            await newPayment.save();
            payment = newPayment;
            
            // Return early with a success response
            res.status(200).json({
              success: true,
              status: 'paid',
              orderId: orderId,
              message: 'Order payment was already marked as paid'
            });
            return;
          }
        } catch (err) {
          console.error('Error looking up order:', err);
          // Continue with normal flow if order lookup fails
        }
      }
      
      // Instead of failing immediately, we'll try to get the session from Stripe directly
      // This covers cases where the payment record wasn't properly saved in our database
      // but the payment was still processed by Stripe successfully
    }
    
    // Then try to retrieve the session from Stripe if not a custom ID format
    let session: Stripe.Checkout.Session;
    let stripeSessionId = sessionId;

    // Only attempt to retrieve from Stripe if it's a valid Stripe session ID format
    if (isCustomSessionId) {
      // For custom IDs, we can't query Stripe directly
      console.log(`Can't query Stripe with custom ID format: ${sessionId}`);
      
      // If we have a payment record, get the Stripe session ID from it
      if (payment && payment.stripeSessionId) {
        stripeSessionId = payment.stripeSessionId;
        console.log(`Using Stripe session ID from payment record: ${stripeSessionId}`);
      } else {
        // If we don't have a proper Stripe session ID, return appropriate error
        console.log(`No valid Stripe session ID available for custom ID: ${sessionId}`);
        
        // If we have an order ID, provide that in the response
        if (orderId) {
          res.status(404).json({
            success: false,
            error: {
              message: 'Payment session not found, but order ID is available',
              sessionId,
              orderId
            }
          });
        } else {
          res.status(404).json({
            success: false,
            error: {
              message: 'Payment session not found on payment provider',
              sessionId
            }
          });
        }
        return;
      }
    }
    
    // Now try to retrieve the session from Stripe using the proper session ID
    try {
      session = await stripe.checkout.sessions.retrieve(stripeSessionId);
    } catch (stripeError: any) {
      // Handle the case where the session doesn't exist on Stripe
      if (stripeError.type === 'StripeInvalidRequestError' && 
          stripeError.code === 'resource_missing') {
        console.log(`Session ${stripeSessionId} not found on Stripe`);
        
        // Return a more meaningful error instead of a 500
        res.status(404).json({
          success: false,
          error: {
            message: 'Payment session not found on payment provider',
            sessionId: stripeSessionId
          }
        });
        return;
      }
      
      // For other Stripe errors, rethrow
      throw stripeError;
    }
    
    // Create a payment record if the session exists on Stripe but not in our database
    if (!payment && session) {
      try {
        console.log(`Creating missing payment record for Stripe session ${session.id}`);
        
        // Extract any order ID from the session metadata if available
        const sessionOrderId = session.metadata?.orderId as string || orderId;
        
        // Create a new payment record based on the Stripe session
        const newPayment = new Payment({
          stripeSessionId: session.id,
          customSessionId: isCustomSessionId ? sessionId : undefined,
          status: session.payment_status === 'paid' ? 'paid' : 'pending',
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || 'usd',
          createdAt: new Date(),
          paymentIntentId: session.payment_intent as string || null,
          metadata: session.metadata || {},
          orderId: sessionOrderId
        });
        
        await newPayment.save();
        console.log(`✅ Created missing payment record for session ${session.id}`);
        
        // Use the new payment record for the rest of the function
        payment = newPayment;
      } catch (error) {
        console.error('Error creating payment record:', error);
        // Continue with session information regardless of saving error
      }
    }
    
    // If we have a custom session ID, update the mapping in database
    if (isCustomSessionId && payment && !payment.customSessionId) {
      try {
        payment.customSessionId = sessionId;
        await payment.save();
        console.log(`✅ Updated payment record with custom session ID mapping: ${sessionId} -> ${payment.stripeSessionId}`);
      } catch (error) {
        console.error('Error updating payment record with custom session ID:', error);
        // Continue regardless of saving error
      }
    }

    // If we have a payment record in our database, update payment status if it's changed
    if (payment && session.payment_status === 'paid' && payment.status !== 'paid') {
      payment.status = 'paid';
      payment.paymentIntentId = session.payment_intent as string;
      payment.updatedAt = new Date();
      await payment.save();
      console.log(`Payment status updated to PAID for session ${session.id}`);
      
      // Update the associated order if present
      if (payment.orderId) {
        try {
          const OrderModel = mongoose.model<any>('Order');
          const order = await OrderModel.findById(payment.orderId);
          if (order) {
            order.paymentStatus = PaymentStatus.PAID;
            await order.save();
            console.log(`✅ Updated order ${payment.orderId} payment status to PAID`);
          }
        } catch (orderErr) {
          console.error('Error updating order payment status:', orderErr);
          // Continue with response even if order update fails
        }
      }
    }

    // Return the session status with type-safe response object
    const responseObject: Record<string, any> = {
      success: true,
      status: session.payment_status,
      paymentProviderStatus: session.payment_status,
      // Include Stripe session details
      stripeSession: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency
      }
    };
    
    // Conditionally add payment-related fields if payment exists
    if (payment) {
      responseObject.paymentId = payment._id;
      responseObject.paymentDbStatus = payment.status;
      if (payment.orderId) {
        responseObject.orderId = payment.orderId;
      }
    }
    
    // Include customer email if available from Stripe
    if (session.customer_email) {
      responseObject.customerEmail = session.customer_email;
    }
    
    // Send the response to the client
    res.status(200).json(responseObject);
  } catch (error) {
    console.error('Error checking session status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to check session status'
      }
    });
  }
};

// Update order payment status directly
export const updateOrderPaymentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Order ID is required'
        }
      });
      return;
    }
    
    if (!status) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Payment status is required'
        }
      });
      return;
    }
    
    console.log(`Updating payment status for order ${orderId} to ${status}`);
    
    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Order not found'
        }
      });
      return;
    }
    
    // Update the payment status
    order.paymentStatus = status as PaymentStatus;
    await order.save();
    
    res.status(200).json({
      success: true,
      orderId,
      status,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating order payment status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update payment status'
      }
    });
  }
};

// Handle checkout.session.completed event
const handleCheckoutSessionCompleted = async (session: any): Promise<void> => {
  try {
    // Find the payment in our database
    const payment = await Payment.findOne({ stripeSessionId: session.id });
    if (!payment) {
      console.log(`No payment record found in database for session ID: ${session.id}`);
      return;
    }
    
    console.log(`Found payment record for session ${session.id}, updating status to paid`);
    
    // Update payment status
    payment.status = 'paid';
    await payment.save();
    
    // Update order payment status if applicable
    if (payment.orderId) {
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = PaymentStatus.PAID;
        await order.save();
        console.log(`Order ${payment.orderId} payment status updated to PAID`);
      } else {
        console.log(`Order ${payment.orderId} not found`);
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
};

// Handle payment_intent.succeeded event
const handlePaymentIntentSucceeded = async (paymentIntent: any): Promise<void> => {
  try {
    // Find the payment in our database
    const payment = await Payment.findOne({ paymentIntentId: paymentIntent.id });
    if (!payment) {
      console.log(`No payment record found for payment intent ID: ${paymentIntent.id}`);
      return;
    }
    
    // Update payment status
    payment.status = 'paid';
    await payment.save();
    
    // Update order payment status if applicable
    if (payment.orderId) {
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = PaymentStatus.PAID;
        await order.save();
      }
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
};

// Handle payment_intent.payment_failed event
const handlePaymentIntentFailed = async (paymentIntent: any): Promise<void> => {
  try {
    // Find the payment in our database
    const payment = await Payment.findOne({ paymentIntentId: paymentIntent.id });
    if (!payment) {
      console.log(`No payment record found for payment intent ID: ${paymentIntent.id}`);
      return;
    }
    
    // Update payment status
    payment.status = 'failed';
    await payment.save();
    
    // Update order payment status if applicable
    if (payment.orderId) {
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = PaymentStatus.FAILED;
        await order.save();
      }
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
};

// Handle Stripe webhook events
export const handleWebhook = async (req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('🔔 Webhook received at', new Date().toISOString());
    const sig = req.headers['stripe-signature'];
    
    // Log all headers for debugging
    console.log('📝 Webhook headers:', JSON.stringify(req.headers, null, 2));
    
    // Verify the webhook signature
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    console.log(endpointSecret)
    if (!endpointSecret) {
      console.error('❌ Webhook secret is not configured');
      res.status(500).json({
        success: false,
        error: {
          message: 'Webhook secret is not configured'
        }
      });
      return;
    }

    // DEVELOPMENT MODE FALLBACK: If we're in development mode, try to construct event from body directly
    // This is useful for testing with stripe CLI which may not provide the signature correctly
    const isDevelopment = process.env.NODE_ENV === 'development';
    let event;
    let bypassSignatureCheck = false;
    
    // Only consider skipping signature verification in development
    if (isDevelopment && (!sig || sig === 'undefined')) {
      console.warn('⚠️ Development mode detected with missing signature - attempting to bypass signature check');
      bypassSignatureCheck = true;
    }
    
    try {
      // If we're bypassing signature check in development mode, we can try to parse the raw body
      if (bypassSignatureCheck) {
        try {
          console.log('⚠️ Bypassing signature verification in development mode');
          
          // Try to parse the body directly
          if (typeof req.body === 'object' && req.body.type) {
            // Body is already parsed - use it directly
            event = req.body;
            console.log('✅ Successfully parsed webhook event from body:', event.type);
          } else if (Buffer.isBuffer(req.body)) {
            // Parse the buffer as JSON
            const jsonStr = req.body.toString('utf8');
            event = JSON.parse(jsonStr);
            console.log('✅ Successfully parsed webhook event from buffer:', event.type);
          } else if (typeof req.body === 'string') {
            // Parse the string as JSON
            event = JSON.parse(req.body);
            console.log('✅ Successfully parsed webhook event from string:', event.type);
          } else {
            throw new Error('Unable to parse webhook body in development mode');
          }
        } catch (error) {
          console.error('❌ Failed to parse webhook body in development mode:', error);
          res.status(400).json({
            success: false,
            error: {
              message: 'Invalid webhook body format'
            }
          });
          return;
        }
      } else if (!sig) {
        // In production, we require a valid signature
        console.error('❌ Missing Stripe signature in webhook request');
        res.status(400).json({
          success: false,
          error: {
            message: 'Missing Stripe signature'
          }
        });
        return;
      }

      // Ensure we have a valid signature string
      const signature = Array.isArray(sig) ? sig[0] : sig;
      if (!signature) {
        console.error('❌ Signature is empty or invalid format');
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid signature format'
          }
        });
        return;
      }
      
      console.log(`🔑 Webhook signature: ${signature.substring(0, 20)}...`);
      console.log(`🔐 Using webhook secret: ${endpointSecret.substring(0, 10)}...`);
      
      // For raw body handling verification
      const rawBody = req.body;
      
      // Log detailed information about the body for debugging
      if (rawBody === undefined || rawBody === null) {
        console.error('❌ Raw body is undefined or null');
        res.status(400).json({
          success: false,
          error: {
            message: 'Missing request body'
          }
        });
        return;
      }
      
      console.log(`📦 Raw body type: ${typeof rawBody}`);
      
      // Detailed logging based on body type
      if (typeof rawBody === 'string') {
        console.log(`📏 Raw body length: ${rawBody.length} bytes`);
      } else if (Buffer.isBuffer(rawBody)) {
        console.log(`📏 Raw body is Buffer with length: ${rawBody.length} bytes`);
      } else if (typeof rawBody === 'object') {
        console.log('⚠️ Raw body is an object - this may cause signature verification issues');
        console.log(`📋 Object keys: ${Object.keys(rawBody).join(', ')}`);
      } else {
        console.log(`❓ Unexpected raw body type: ${typeof rawBody}`);
      }
      
      // Get the raw body as a string/buffer for Stripe verification
      let stripeRawBody = rawBody;
      
      // No conversion needed if already a buffer (preferred format)
      if (Buffer.isBuffer(rawBody)) {
        console.log('✅ Using raw buffer directly');
        // Keep as is - Stripe can handle buffers directly
      } 
      // Convert string to buffer if needed
      else if (typeof rawBody === 'string') {
        console.log('✅ Using raw string directly');
        // Keep as is - Stripe can handle strings directly
      } 
      // Properly handle raw body for Stripe signature verification
      else if (typeof rawBody === 'object') {
        console.log('⚠️ Raw body is an object - this may cause signature verification issues');
        
        // Configure Express to use the raw-body module or body-parser with { verify: (req, res, buf) => { req.rawBody = buf } }
        // This should be done in your Express app setup
        
        // For now, as a temporary workaround, return a clear error message
        res.status(400).json({
          success: false,
          error: {
            message: 'Webhook signature verification requires raw request body. Make sure body-parser is configured to preserve the raw body.'
          }
        });
        return;
      }
      
      // Log a preview of the body content
      if (typeof stripeRawBody === 'string') {
        console.log(`🔍 Body preview: ${stripeRawBody.substring(0, 50)}...`);
      } else if (Buffer.isBuffer(stripeRawBody)) {
        console.log(`🔍 Body preview (buffer): ${stripeRawBody.toString('utf8').substring(0, 50)}...`);
      }
      
      // Verify the signature
      console.log('🔐 Verifying Stripe signature...');
      
      // Check for rawBody added by our middleware
      let payload = req.rawBody || stripeRawBody;
      
      // If we have the original Buffer from the middleware, use it directly
      if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
        console.log('✅ Using preserved raw body buffer from middleware');
        
        // Now we can safely call constructEvent with the raw buffer
        event = stripe.webhooks.constructEvent(
          req.rawBody,
          signature,
          endpointSecret
        );
      } 
      // Otherwise fall back to the previous approach
      else {
        // Make sure stripeRawBody is in the correct format for constructEvent
        // Stripe accepts string or Buffer for the payload parameter
        if (typeof stripeRawBody !== 'string' && !Buffer.isBuffer(stripeRawBody)) {
          console.error('❌ Invalid payload format for signature verification');
          res.status(400).json({
            success: false,
            error: {
              message: 'Invalid payload format for signature verification'
            }
          });
          return;
        }
        
        // Use the processed body as a fallback
        console.log('⚠️ Falling back to processed body - this may cause verification issues');
        event = stripe.webhooks.constructEvent(
          stripeRawBody as string | Buffer,
          signature,
          endpointSecret
        );
      }
      
      console.log(`✅ Signature verified successfully! Event type: ${event.type}`);
      
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed: ${err.message}`);
      res.status(400).json({
        success: false,
        error: {
          message: `Webhook signature verification failed: ${err.message}`
        }
      });
      return;
    }

    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to process webhook'
      }
    });
  }
};
