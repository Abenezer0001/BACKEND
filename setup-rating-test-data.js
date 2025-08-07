#!/usr/bin/env node

/**
 * Setup Rating Test Data Script
 * Creates sample data for testing the enhanced rating system
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat';

console.log('🚀 Setting up rating test data...');

async function createTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define schemas (simplified versions)
    const userSchema = new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      password: String,
      role: { type: String, default: 'customer' },
      isVerified: { type: Boolean, default: true }
    });

    const restaurantSchema = new mongoose.Schema({
      name: String,
      description: String,
      address: String,
      phone: String,
      email: String,
      isActive: { type: Boolean, default: true }
    });

    const menuItemSchema = new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
      restaurantId: mongoose.Schema.Types.ObjectId,
      category: String,
      isAvailable: { type: Boolean, default: true }
    });

    const orderSchema = new mongoose.Schema({
      orderNumber: String,
      userId: mongoose.Schema.Types.ObjectId,
      restaurantId: mongoose.Schema.Types.ObjectId,
      items: [{
        menuItem: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        price: Number
      }],
      totalAmount: Number,
      paymentStatus: { type: String, default: 'PAID' },
      orderStatus: { type: String, default: 'completed' },
      createdAt: { type: Date, default: Date.now }
    });

    // Create models
    const User = mongoose.model('User', userSchema);
    const Restaurant = mongoose.model('Restaurant', restaurantSchema);
    const MenuItem = mongoose.model('MenuItem', menuItemSchema);
    const Order = mongoose.model('Order', orderSchema);

    // Clear existing test data
    console.log('🧹 Clearing existing test data...');
    await User.deleteMany({ email: { $regex: /test|demo/ } });
    await Restaurant.deleteMany({ name: { $regex: /Test|Demo/ } });
    await MenuItem.deleteMany({ name: { $regex: /Test|Demo/ } });
    await Order.deleteMany({ orderNumber: { $regex: /TEST/ } });

    // Create test users
    console.log('👥 Creating test users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUsers = await User.create([
      {
        firstName: 'John',
        lastName: 'Customer',
        email: 'customer@test.com',
        password: hashedPassword,
        role: 'customer'
      },
      {
        firstName: 'Jane',
        lastName: 'Admin',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'restaurant_admin'
      },
      {
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'customer2@test.com',
        password: hashedPassword,
        role: 'customer'
      }
    ]);

    console.log(`✅ Created ${testUsers.length} test users`);

    // Create test restaurant
    console.log('🏪 Creating test restaurant...');
    const testRestaurant = await Restaurant.create({
      name: 'Demo Italian Restaurant',
      description: 'Authentic Italian cuisine for testing',
      address: '123 Test Street, Demo City',
      phone: '+1-555-0123',
      email: 'demo@restaurant.com'
    });

    console.log('✅ Created test restaurant');

    // Create test menu items
    console.log('🍝 Creating test menu items...');
    const testMenuItems = await MenuItem.create([
      {
        name: 'Demo Margherita Pizza',
        description: 'Classic pizza with tomato, mozzarella, and basil',
        price: 14.99,
        restaurantId: testRestaurant._id,
        category: 'Pizza'
      },
      {
        name: 'Demo Truffle Pasta',
        description: 'Handmade pasta with truffle oil and parmesan',
        price: 22.50,
        restaurantId: testRestaurant._id,
        category: 'Pasta'
      },
      {
        name: 'Demo Caesar Salad',
        description: 'Fresh romaine lettuce with caesar dressing',
        price: 12.00,
        restaurantId: testRestaurant._id,
        category: 'Salads'
      },
      {
        name: 'Demo Tiramisu',
        description: 'Traditional Italian dessert',
        price: 8.99,
        restaurantId: testRestaurant._id,
        category: 'Desserts'
      }
    ]);

    console.log(`✅ Created ${testMenuItems.length} test menu items`);

    // Create test orders
    console.log('📦 Creating test orders...');
    const testOrders = await Order.create([
      {
        orderNumber: 'TEST-001',
        userId: testUsers[0]._id,
        restaurantId: testRestaurant._id,
        items: [
          {
            menuItem: testMenuItems[0]._id,
            quantity: 1,
            price: testMenuItems[0].price
          },
          {
            menuItem: testMenuItems[1]._id,
            quantity: 1,
            price: testMenuItems[1].price
          }
        ],
        totalAmount: testMenuItems[0].price + testMenuItems[1].price,
        paymentStatus: 'PAID',
        orderStatus: 'completed'
      },
      {
        orderNumber: 'TEST-002',
        userId: testUsers[2]._id,
        restaurantId: testRestaurant._id,
        items: [
          {
            menuItem: testMenuItems[2]._id,
            quantity: 2,
            price: testMenuItems[2].price
          }
        ],
        totalAmount: testMenuItems[2].price * 2,
        paymentStatus: 'PAID',
        orderStatus: 'completed'
      }
    ]);

    console.log(`✅ Created ${testOrders.length} test orders`);

    // Display test data IDs for use in API tests
    console.log('\n📋 Test Data Summary:');
    console.log('==========================================');
    console.log('🔗 Use these IDs for API testing:');
    console.log('==========================================');
    console.log(`Customer User ID: ${testUsers[0]._id}`);
    console.log(`Admin User ID: ${testUsers[1]._id}`);
    console.log(`Restaurant ID: ${testRestaurant._id}`);
    console.log(`Menu Item IDs:`);
    testMenuItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}: ${item._id}`);
    });
    console.log(`Order IDs:`);
    testOrders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.orderNumber}: ${order._id}`);
    });

    console.log('\n🧪 Test API Commands:');
    console.log('==========================================');
    
    // Get auth token command
    console.log('1. Get authentication token:');
    console.log(`curl -X POST http://localhost:3001/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "customer@test.com", "password": "password123"}'`);

    // Check rating eligibility
    console.log('\n2. Check if user can rate menu item:');
    console.log(`curl -H "Authorization: Bearer <token>" \\
  "http://localhost:3001/api/v1/ratings/menu-item/${testMenuItems[0]._id}/can-rate"`);

    // Submit order-based rating
    console.log('\n3. Submit order-based rating with decimal:');
    console.log(`curl -X POST http://localhost:3001/api/v1/ratings/order-item \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "${testOrders[0]._id}",
    "menuItemId": "${testMenuItems[0]._id}",
    "rating": 4.7,
    "comment": "Excellent pizza! Perfect crust and fresh toppings."
  }'`);

    // Get menu item ratings
    console.log('\n4. Get menu item ratings:');
    console.log(`curl "http://localhost:3001/api/v1/ratings/menu-item/${testMenuItems[0]._id}?sortBy=rating_high"`);

    console.log('\n✅ Test data setup complete!');
    console.log('\n🚀 Next steps:');
    console.log('1. Start your INSEAT backend server: npm run dev');
    console.log('2. Run the test script: ./test-enhanced-rating-endpoints.sh');
    console.log('3. Or use the individual curl commands above');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestData().catch(console.error);