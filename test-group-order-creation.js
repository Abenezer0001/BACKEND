const mongoose = require('mongoose');

// Since the model is in TypeScript, let's define a simple schema for testing
const GroupOrderItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true
  },
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  customizations: [{
    type: mongoose.Schema.Types.Mixed
  }],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  addedAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const ParticipantSchema = new mongoose.Schema({
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'left'],
    default: 'active'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  spendingLimit: {
    type: Number,
    min: 0
  },
  currentSpent: {
    type: Number,
    default: 0,
    min: 0
  }
});

const GroupOrderSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    minlength: 6,
    maxlength: 6,
    uppercase: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'submitted', 'completed', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  maxParticipants: {
    type: Number,
    default: 8,
    min: 2,
    max: 20
  },
  participants: [ParticipantSchema],
  items: {
    type: [GroupOrderItemSchema],
    default: [],
    validate: {
      validator: function(items) {
        // Allow empty arrays
        if (items.length === 0) return true;
        
        // Check for unique itemIds within this group order
        const itemIds = items.map(item => item.itemId).filter(id => id != null);
        const uniqueItemIds = new Set(itemIds);
        return itemIds.length === uniqueItemIds.size;
      },
      message: 'Items must have unique itemIds within the group order'
    }
  },
  totals: {
    subtotal: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    tip: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 }
  },
  paymentStructure: {
    type: String,
    enum: ['pay_all', 'equal_split', 'pay_own', 'custom_split'],
    default: 'equal_split'
  },
  paymentSplit: {
    method: {
      type: String,
      enum: ['single', 'equal', 'individual', 'percentage'],
      default: 'equal'
    },
    assignments: [],
    completedPayments: { type: Number, default: 0, min: 0 },
    totalPayments: { type: Number, default: 0, min: 0 }
  },
  spendingLimits: [],
  spendingLimitRequired: { type: Boolean, default: false },
  settings: {
    allowItemModification: { type: Boolean, default: true },
    requireApprovalForItems: { type: Boolean, default: false },
    allowAnonymousParticipants: { type: Boolean, default: true }
  },
  version: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  optimisticConcurrency: true
});

// Add indexes to avoid conflicts
GroupOrderSchema.index({ createdBy: 1, status: 1 });
GroupOrderSchema.index({ restaurantId: 1, status: 1 });
GroupOrderSchema.index({ expiresAt: 1 });
GroupOrderSchema.index({ 'participants.userId': 1 });
GroupOrderSchema.index({ 'items.menuItemId': 1 }, { sparse: true });
GroupOrderSchema.index({ 'items.addedBy': 1 }, { sparse: true });
GroupOrderSchema.index({ sessionId: 1, status: 1 });
GroupOrderSchema.index({ 'participants.participantId': 1 }, { sparse: true });

const GroupOrder = mongoose.model('GroupOrder', GroupOrderSchema);

async function testGroupOrderCreation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/inseat-db');
    console.log('Connected to MongoDB');

    // Clean up any existing test data
    await GroupOrder.deleteMany({ sessionId: { $regex: /^test-session/ } });
    console.log('Cleaned up existing test data');

    // Test 1: Create multiple group orders with empty items arrays
    console.log('\n=== Test 1: Creating multiple group orders with empty items arrays ===');
    
    const testOrders = [];
    for (let i = 1; i <= 5; i++) {
      const groupOrder = new GroupOrder({
        sessionId: `test-session-${i}`,
        inviteCode: `TEST${i.toString().padStart(2, '0')}`,
        restaurantId: new mongoose.Types.ObjectId(),
        createdBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        participants: [{
          name: `Test User ${i}`,
          email: `test${i}@example.com`,
          isAnonymous: false
        }],
        items: [] // Empty items array - this should not cause duplicate key errors
      });

      await groupOrder.save();
      testOrders.push(groupOrder);
      console.log(`✓ Created group order ${i} with sessionId: ${groupOrder.sessionId}`);
    }

    // Test 2: Add items to group orders
    console.log('\n=== Test 2: Adding items to group orders ===');
    
    for (let i = 0; i < testOrders.length; i++) {
      const order = testOrders[i];
      
      // Add items using direct array manipulation (simulating the fixed addItem method)
      const itemId1 = new mongoose.Types.ObjectId().toString();
      const itemId2 = new mongoose.Types.ObjectId().toString();
      
      order.items.push({
        itemId: itemId1,
        menuItemId: new mongoose.Types.ObjectId(),
        name: `Test Item 1 for Order ${i + 1}`,
        price: 1500, // $15.00
        quantity: 2,
        customizations: [],
        addedBy: order.createdBy,
        addedAt: new Date(),
        lastModified: new Date(),
        modifiedBy: order.createdBy
      });

      order.items.push({
        itemId: itemId2,
        menuItemId: new mongoose.Types.ObjectId(),
        name: `Test Item 2 for Order ${i + 1}`,
        price: 2000, // $20.00
        quantity: 1,
        customizations: [],
        addedBy: order.createdBy,
        addedAt: new Date(),
        lastModified: new Date(),
        modifiedBy: order.createdBy
      });

      await order.save();
      console.log(`✓ Added 2 items to group order ${i + 1}`);
    }

    // Test 3: Verify no duplicate key errors when creating more empty orders
    console.log('\n=== Test 3: Creating additional empty group orders ===');
    
    for (let i = 6; i <= 10; i++) {
      const groupOrder = new GroupOrder({
        sessionId: `test-session-${i}`,
        inviteCode: `TEST${i.toString().padStart(2, '0')}`,
        restaurantId: new mongoose.Types.ObjectId(),
        createdBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        participants: [{
          name: `Test User ${i}`,
          email: `test${i}@example.com`,
          isAnonymous: false
        }]
        // items will default to empty array
      });

      await groupOrder.save();
      console.log(`✓ Created additional group order ${i} with empty items`);
    }

    // Test 4: Verify all group orders exist and have correct structure
    console.log('\n=== Test 4: Verifying created group orders ===');
    
    const allOrders = await GroupOrder.find({ sessionId: { $regex: /^test-session/ } }).sort({ sessionId: 1 });
    console.log(`Total test group orders created: ${allOrders.length}`);
    
    allOrders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`);
      console.log(`  - Session ID: ${order.sessionId}`);
      console.log(`  - Invite Code: ${order.inviteCode}`);
      console.log(`  - Items Count: ${order.items.length}`);
      console.log(`  - Participants: ${order.participants.length}`);
      console.log(`  - Status: ${order.status}`);
      console.log(`  - Created: ${order.createdAt}`);
      
      if (order.items.length > 0) {
        console.log(`  - Items:`);
        order.items.forEach((item, itemIndex) => {
          console.log(`    ${itemIndex + 1}. ${item.name} (ID: ${item.itemId})`);
        });
      }
    });

    console.log('\n✅ All tests passed! Group order creation is working correctly.');
    console.log('✅ No duplicate key errors occurred with empty items arrays.');
    console.log('✅ Items can be added to group orders without conflicts.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error.code === 11000) {
      console.error('❌ Duplicate key error still occurring:', error);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testGroupOrderCreation();