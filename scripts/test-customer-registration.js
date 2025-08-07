// Test script for customer registration with restaurant ID
const axios = require('axios');

// Base URL
const API_URL = 'http://localhost:3001';

// Restaurant IDs from our list
const restaurantIds = [
  "681a581d1a12c59b214b386f", // CINEMA CITY ARABIAN CENTRE
  "681a581d1a12c59b214b3879", // CINEMA CITY AL QANA
  "681a581e1a12c59b214b3883", // CINEMA CITY AL QANA VIP
  "681b09f9f62e7b54cf524c5a", // Test Restaurant
  "681b0e3bf62e7b54cf524cb1", // Updated Test Restaurant
  "681b43b9592bdb7e29df8c51", // Test Restaurant 2
  "681df284f17b0eeadc010280", // Medge Pruittsdfsdsdf
  "6845f53d534799c145f2791b"  // Marina
];

// Business ID for all customers
const businessId = "68415b8095a2208cec9743a2";

// Generate a random email to avoid conflicts with existing users
const generateRandomEmail = () => {
  return `test${Math.floor(Math.random() * 10000)}@example.com`;
};

// Test 1: Register a customer with valid restaurant ID
const testValidRegistration = async () => {
  try {
    console.log('Test 1: Registering customer with valid restaurant ID');
    const response = await axios.post(`${API_URL}/api/customer/register`, {
      email: generateRandomEmail(),
      password: "Password123!",
      firstName: "Test",
      lastName: "Customer",
      role: "customer",
      restaurantId: restaurantIds[0], // Using the first restaurant ID
      businessId: businessId
    });
    
    console.log('Registration successful:', response.data);
    console.log('User has restaurantId:', response.data.user.restaurantId);
    return true;
  } catch (error) {
    console.error('Registration failed:', error.response ? error.response.data : error.message);
    return false;
  }
};

// Test 2: Try to register a customer without restaurant ID (should fail)
const testMissingRestaurantId = async () => {
  try {
    console.log('\nTest 2: Registering customer without restaurant ID');
    const response = await axios.post(`${API_URL}/api/customer/register`, {
      email: generateRandomEmail(),
      password: "Password123!",
      firstName: "Test",
      lastName: "Customer",
      role: "customer",
      businessId: businessId
      // Intentionally omitting restaurantId
    });
    
    console.log('Registration successful when it should have failed:', response.data);
    return false;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message.includes('Restaurant ID is required')) {
      console.log('Test passed: Properly rejected registration without restaurant ID');
      console.log('Error message:', error.response.data.message);
      return true;
    } else {
      console.error('Test failed: Wrong error or no error when restaurant ID is missing');
      console.error('Error:', error.response ? error.response.data : error.message);
      return false;
    }
  }
};

// Run the tests
const runTests = async () => {
  let test1Result = await testValidRegistration();
  let test2Result = await testMissingRestaurantId();
  
  console.log('\n--- Test Results ---');
  console.log('Test 1 (Valid registration):', test1Result ? 'PASSED' : 'FAILED');
  console.log('Test 2 (Missing restaurant ID):', test2Result ? 'PASSED' : 'FAILED');
  
  if (test1Result && test2Result) {
    console.log('\nAll tests passed! Customer registration with restaurant ID is working correctly.');
  } else {
    console.log('\nSome tests failed. Please check the logs above for details.');
  }
};

runTests();
