/**
 * Order Seed Script
 * 
 * This script adds sample order data to the database.
 * Run with: node order-seed.js
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import models
const Order = require('./models/Order');
const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const Table = require('./models/Table');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Sample data - replace these IDs with real IDs from your database
const sampleData = {
  restaurants: [
    { id: null, name: "Burger Palace" },
    { id: null, name: "Pizza Heaven" },
    { id: null, name: "Sushi Express" }
  ],
  users: [
    { id: null, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: null, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
    { id: null, firstName: "Bob", lastName: "Johnson", email: "bob@example.com" }
  ],
  tables: [
    { id: null, name: "Table 1", number: 1 },
    { id: null, name: "Table 2", number: 2 },
    { id: null, name: "Table 3", number: 3 }
  ],
  menuItems: [
    // Burger Palace
    { id: uuidv4(), name: "Cheeseburger", price: 8.99 },
    { id: uuidv4(), name: "Bacon Burger", price: 10.99 },
    { id: uuidv4(), name: "Veggie Burger", price: 7.99 },
    { id: uuidv4(), name: "French Fries", price: 3.99 },
    // Pizza Heaven
    { id: uuidv4(), name: "Margherita Pizza", price: 12.99 },
    { id: uuidv4(), name: "Pepperoni Pizza", price: 14.99 },
    { id: uuidv4(), name: "Hawaiian Pizza", price: 15.99 },
    { id: uuidv4(), name: "Garlic Bread", price: 4.99 },
    // Sushi Express
    { id: uuidv4(), name: "California Roll", price: 9.99 },
    { id: uuidv4(), name: "Spicy Tuna Roll", price: 11.99 },
    { id: uuidv4(), name: "Dragon Roll", price: 13.99 },
    { id: uuidv4(), name: "Miso Soup", price: 2.99 }
  ],
  orderTypes: ["DINE_IN", "TAKEOUT", "DELIVERY"],
  orderStatuses: ["PENDING", "PREPARING", "READY", "DELIVERED", "COMPLETED", "CANCELLED"],
  paymentStatuses: ["PENDING", "PROCESSING", "PAID", "FAILED", "REFUNDED"]
};

// Get real IDs from the database
async function getActualIds() {
  try {
    // Get restaurants
    const restaurants = await Restaurant.find({}).limit(3);
    for (let i = 0; i < Math.min(restaurants.length, sampleData.restaurants.length); i++) {
      sampleData.restaurants[i].id = restaurants[i]._id;
    }

    // Get users
    const users = await User.find({}).limit(3);
    for (let i = 0; i < Math.min(users.length, sampleData.users.length); i++) {
      sampleData.users[i].id = users[i]._id;
    }

    // Get tables
    const tables = await Table.find({}).limit(3);
    for (let i = 0; i < Math.min(tables.length, sampleData.tables.length); i++) {
      sampleData.tables[i].id = tables[i]._id;
    }

    return true;
  } catch (error) {
    console.error('Error getting actual IDs:', error);
    return false;
  }
}

// Generate a random order
function generateRandomOrder() {
  // Random indices
  const restaurantIndex = Math.floor(Math.random() * sampleData.restaurants.length);
  const userIndex = Math.floor(Math.random() * sampleData.users.length);
  const tableIndex = Math.floor(Math.random() * sampleData.tables.length);
  const orderTypeIndex = Math.floor(Math.random() * sampleData.orderTypes.length);
  const statusIndex = Math.floor(Math.random() * sampleData.orderStatuses.length);
  const paymentStatusIndex = Math.floor(Math.random() * sampleData.paymentStatuses.length);
  
  // Random date within the last 30 days
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  
  // Generate order number
  const orderNumber = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Generate 1-5 items for the order
  const itemCount = Math.floor(Math.random() * 5) + 1;
  const items = [];
  let subtotal = 0;
  
  // Get menu items for this restaurant (assuming the first 4 items belong to Burger Palace, etc.)
  const startIndex = restaurantIndex * 4;
  
  for (let i = 0; i < itemCount; i++) {
    const menuItemIndex = startIndex + Math.floor(Math.random() * 4);
    const quantity = Math.floor(Math.random() * 3) + 1;
    const menuItem = sampleData.menuItems[menuItemIndex];
    const itemSubtotal = parseFloat((menuItem.price * quantity).toFixed(2));
    
    items.push({
      menuItem: menuItem.id,
      name: menuItem.name,
      quantity: quantity,
      price: menuItem.price,
      subtotal: itemSubtotal,
      specialInstructions: Math.random() > 0.7 ? "Extra sauce please" : ""
    });
    
    subtotal += itemSubtotal;
  }
  
  // Calculate other amounts
  subtotal = parseFloat(subtotal.toFixed(2));
  const tax = parseFloat((subtotal * 0.08).toFixed(2));
  const tip = parseFloat((subtotal * (Math.random() * 0.2 + 0.1)).toFixed(2));
  const total = parseFloat((subtotal + tax + tip).toFixed(2));
  
  return {
    orderNumber,
    restaurantId: sampleData.restaurants[restaurantIndex].id,
    userId: sampleData.users[userIndex].id,
    tableId: sampleData.tables[tableIndex].id,
    items,
    status: sampleData.orderStatuses[statusIndex],
    paymentStatus: sampleData.paymentStatuses[paymentStatusIndex],
    subtotal,
    tax,
    tip,
    total,
    orderType: sampleData.orderTypes[orderTypeIndex],
    createdAt: date,
    updatedAt: date
  };
}

// Insert orders
async function insertOrders(count) {
  try {
    const orders = [];
    
    for (let i = 0; i < count; i++) {
      orders.push(generateRandomOrder());
    }
    
    const result = await Order.insertMany(orders);
    console.log(`${result.length} orders inserted successfully`);
    return true;
  } catch (error) {
    console.error('Error inserting orders:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Getting actual IDs from database...');
    const idsRetrieved = await getActualIds();
    
    if (!idsRetrieved) {
      console.error('Failed to retrieve IDs. Make sure you have restaurants, users, and tables in your database.');
      process.exit(1);
    }
    
    console.log('Inserting sample orders...');
    const ordersInserted = await insertOrders(50); // Change the number as needed
    
    if (ordersInserted) {
      console.log('Sample orders inserted successfully!');
    } else {
      console.error('Failed to insert sample orders.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the script
main(); 