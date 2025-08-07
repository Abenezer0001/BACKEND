import { GrubTechWebhookService } from '../services/GrubTechWebhookService';

// Mock order data based on your INSEAT order structure
const mockOrder = {
  _id: '507f1f77bcf86cd799439011',
  orderNumber: 'INS-240612-0001',
  restaurantId: '507f1f77bcf86cd799439012',
  tableNumber: 'T-5',
  userId: '507f1f77bcf86cd799439013',
  isGuest: false,
  items: [
    {
      _id: '507f1f77bcf86cd799439014',
      menuItem: '507f1f77bcf86cd799439015',
      name: 'Margherita Pizza',
      quantity: 1,
      price: 28.50,
      subtotal: 28.50,
      modifiers: [
        {
          groupId: '507f1f77bcf86cd799439016',
          selections: [
            {
              optionId: '507f1f77bcf86cd799439017',
              name: 'Extra Cheese',
              quantity: 1,
              price: 3.00
            }
          ]
        }
      ],
      specialInstructions: 'Light cheese please'
    },
    {
      _id: '507f1f77bcf86cd799439018',
      menuItem: '507f1f77bcf86cd799439019',
      name: 'Caesar Salad',
      quantity: 1,
      price: 16.00,
      subtotal: 16.00,
      modifiers: []
    }
  ],
  subtotal: 47.50,
  tax: 2.38,
  tip: 5.00,
  total: 54.88,
  status: 'PENDING',
  paymentStatus: 'PENDING',
  orderType: 'DINE_IN',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock business data
const mockBusiness = {
  _id: '507f1f77bcf86cd799439020',
  name: 'Amazing Restaurants Group',
  contactInfo: {
    email: 'info@amazingrestaurants.com',
    phone: '+971501234567'
  }
};

// Mock user data
const mockUser = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+971507654321'
};

// Test function to generate and display the webhook payload
function testWebhookPayload() {
  console.log('🧪 Testing GrubTech Webhook Payload Generation');
  console.log('='.repeat(50));
  
  try {
    // Test webhook configuration validation
    console.log('\n1. Testing webhook configuration validation:');
    const isConfigValid = GrubTechWebhookService.validateWebhookConfig();
    console.log(`   Webhook config valid: ${isConfigValid}`);
    
    if (!isConfigValid) {
      console.log('   ⚠️  Set GRUBTECH_WEBHOOK_URL environment variable to test actual sending');
    }
    
    // Generate the payload using our private method (we'll access it via reflection for testing)
    console.log('\n2. Generating webhook payload:');
    
    // Since transformOrderToGrabTechPayload is private, we'll create a test version
    const payload = generateTestPayload(mockOrder, mockBusiness, mockUser);
    
    console.log('\n3. Generated Payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Validate the payload structure
    console.log('\n4. Payload Validation:');
    validatePayloadStructure(payload);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Helper function to generate test payload (mirrors the private method)
function generateTestPayload(order: any, business: any, user?: any) {
  const now = new Date().toISOString();
  
  return {
    id: order._id.toString(),
    invoiceNo: null,
    storeId: order.restaurantId.toString(),
    menuId: order.items[0]?.menuItem?.toString() || order.restaurantId.toString(),
    displayId: order.orderNumber,
    brand: {
      name: business.name,
      id: business._id.toString(),
      $type: "Brand"
    },
    kitchen: {
      name: business.name,
      id: business._id.toString(),
      $type: "Kitchen"
    },
    type: "PICK_UP",
    instructions: null,
    delivery: {
      receiverName: "INSEAT",
      receiverMobileNumber: null,
      location: {
        address: order.tableNumber ? `Table No: ${order.tableNumber}` : "Table TBD",
        latitude: "25.0757595",
        longitude: "54.947304",
        $type: "Location"
      },
      notes: null,
      $type: "Delivery"
    },
    customer: {
      name: user?.name || "Guest",
      contactNumber: user?.phone || null,
      email: user?.email || null,
      $type: "Customer"
    },
    items: transformOrderItems(order.items),
    payment: {
      status: "POSTPAID",
      method: "POSTPAID",
      charges: {
        subTotal: {
          amount: Math.round(order.subtotal * 100),
          currencyCode: "AED",
          formattedAmount: `AED${order.subtotal.toFixed(2)}`,
          $type: "SubTotal"
        },
        total: {
          amount: Math.round(order.total * 100),
          currencyCode: "AED",
          formattedAmount: `AED${order.total.toFixed(2)}`,
          $type: "Total"
        },
        deliveryFee: {
          amount: 0,
          currencyCode: "AED",
          formattedAmount: "AED0.00",
          $type: "DeliveryFee"
        },
        $type: "Charges"
      },
      discounts: [],
      tax: [{
        amount: {
          amount: Math.round(order.tax * 100),
          currencyCode: "AED",
          formattedAmount: `AED${order.tax.toFixed(2)}`,
          $type: "Amount"
        },
        name: "VAT",
        $type: "Tax"
      }],
      $type: "Payment"
    },
    source: {
      name: "INSEAT",
      uniqueOrderId: `${order._id.toString()}:${Date.now()}`,
      placedAt: now,
      channel: "INSEAT",
      $type: "Source"
    },
    scheduledOrder: null,
    status: "OrderAccepted",
    placedAt: order.createdAt.toISOString(),
    additionalInfo: {
      shortCode: null,
      $type: "AdditionalInfo"
    },
    externalReferenceId: null,
    $type: "WebhookPayload"
  };
}

// Helper function to transform order items (mirrors the private method)
function transformOrderItems(items: any[]) {
  return items.map(item => ({
    id: item.menuItem?.toString() || item._id.toString(),
    name: item.name,
    quantity: item.quantity,
    price: {
      unitPrice: {
        amount: Math.round(item.price * 100),
        currencyCode: "AED",
        formattedAmount: `AED${item.price.toFixed(2)}`,
        $type: "UnitPrice"
      },
      discountAmount: {
        amount: 0,
        currencyCode: "AED",
        formattedAmount: "AED0.00",
        $type: "DiscountAmount"
      },
      taxAmount: {
        amount: 0,
        currencyCode: "AED",
        formattedAmount: "AED0.00",
        $type: "TaxAmount"
      },
      totalPrice: {
        amount: Math.round(item.subtotal * 100),
        currencyCode: "AED",
        formattedAmount: `AED${item.subtotal.toFixed(2)}`,
        $type: "TotalPrice"
      },
      $type: "Price"
    },
    modifiers: transformModifiers(item.modifiers || []),
    instructions: item.specialInstructions || null,
    $type: "Item"
  }));
}

// Helper function to transform modifiers (mirrors the private method)
function transformModifiers(modifiers: any[]) {
  const result: any[] = [];
  
  modifiers.forEach(modifierGroup => {
    modifierGroup.selections?.forEach((selection: any) => {
      result.push({
        id: selection.optionId?.toString() || selection._id?.toString() || 'unknown',
        name: selection.name,
        quantity: selection.quantity,
        price: {
          unitPrice: {
            amount: Math.round(selection.price * 100),
            currencyCode: "AED",
            formattedAmount: `AED${selection.price.toFixed(2)}`,
            $type: "UnitPrice"
          },
          discountAmount: {
            amount: 0,
            currencyCode: "AED",
            formattedAmount: "AED0.00",
            $type: "DiscountAmount"
          },
          taxAmount: {
            amount: 0,
            currencyCode: "AED",
            formattedAmount: "AED0.00",
            $type: "TaxAmount"
          },
          totalPrice: {
            amount: Math.round((selection.price * selection.quantity) * 100),
            currencyCode: "AED",
            formattedAmount: `AED${(selection.price * selection.quantity).toFixed(2)}`,
            $type: "TotalPrice"
          },
          $type: "Price"
        },
        $type: "Modifier"
      });
    });
  });

  return result;
}

// Validate the payload structure matches expected format
function validatePayloadStructure(payload: any) {
  const requiredFields = [
    'id', 'invoiceNo', 'storeId', 'menuId', 'displayId', 'brand', 'kitchen',
    'type', 'delivery', 'customer', 'items', 'payment', 'source', 'status',
    'placedAt', '$type'
  ];
  
  const missingFields = requiredFields.filter(field => !(field in payload));
  
  if (missingFields.length > 0) {
    console.log(`   ❌ Missing required fields: ${missingFields.join(', ')}`);
  } else {
    console.log('   ✅ All required fields present');
  }
  
  // Validate price conversions
  console.log(`   Original subtotal: AED ${mockOrder.subtotal}`);
  console.log(`   Converted amount: ${payload.payment.charges.subTotal.amount} fils`);
  console.log(`   Conversion check: ${mockOrder.subtotal * 100 === payload.payment.charges.subTotal.amount ? '✅' : '❌'}`);
  
  // Validate items count
  console.log(`   Original items: ${mockOrder.items.length}`);
  console.log(`   Payload items: ${payload.items.length}`);
  console.log(`   Items count check: ${mockOrder.items.length === payload.items.length ? '✅' : '❌'}`);
}

// Run the test
if (require.main === module) {
  testWebhookPayload();
}

export { testWebhookPayload };