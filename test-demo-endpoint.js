#!/usr/bin/env node

/**
 * Test script for the INSEAT demo account creation endpoint
 * This script tests the new POST /api/demo/create-account endpoint
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const DEMO_ENDPOINT = `${BASE_URL}/api/demo/create-account`;

console.log('🚀 Testing INSEAT Demo Account Creation System');
console.log('================================================');
console.log(`Target URL: ${DEMO_ENDPOINT}`);
console.log('');

// Test data
const testCases = [
  {
    name: 'Valid Demo Request',
    data: {
      restaurantName: 'Test Pizza Palace',
      businessEmail: `demo-test-${Date.now()}@example.com`
    },
    expectedStatus: 201
  },
  {
    name: 'Missing Restaurant Name',
    data: {
      businessEmail: 'test@example.com'
    },
    expectedStatus: 400
  },
  {
    name: 'Missing Business Email',
    data: {
      restaurantName: 'Test Restaurant'
    },
    expectedStatus: 400
  },
  {
    name: 'Invalid Email Format',
    data: {
      restaurantName: 'Test Restaurant',
      businessEmail: 'invalid-email'
    },
    expectedStatus: 400
  },
  {
    name: 'Restaurant Name Too Short',
    data: {
      restaurantName: 'A',
      businessEmail: 'test@example.com'
    },
    expectedStatus: 400
  }
];

async function runTest(testCase) {
  console.log(`🧪 Testing: ${testCase.name}`);
  console.log(`   Data: ${JSON.stringify(testCase.data)}`);
  
  try {
    const response = await axios.post(DEMO_ENDPOINT, testCase.data, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'INSEAT-Demo-Test-Script/1.0'
      },
      timeout: 30000, // 30 seconds timeout
      validateStatus: (status) => true // Don't throw on any status code
    });
    
    const success = response.status === testCase.expectedStatus;
    const statusIcon = success ? '✅' : '❌';
    
    console.log(`   ${statusIcon} Status: ${response.status} (expected: ${testCase.expectedStatus})`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.status === 201 && response.data.success) {
      console.log('   🎉 Demo account created successfully!');
      console.log(`   📧 Admin Demo Link: ${response.data.data?.adminDemoLink || 'Not provided'}`);
      console.log(`   🍽️  Customer Demo Link: ${response.data.data?.customerDemoLink || 'Not provided'}`);
      console.log(`   ⏰ Expires At: ${response.data.data?.expiresAt || 'Not provided'}`);
    }
    
    return success;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.log(`   Network Error: No response received`);
    }
    
    return false;
  }
}

async function runAllTests() {
  console.log(`⏳ Running ${testCases.length} test cases...\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const success = await runTest(testCase);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
    
    console.log(''); // Add spacing between tests
    
    // Add delay between tests to avoid rate limiting
    if (testCases.indexOf(testCase) < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('📊 Test Results Summary');
  console.log('======================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Demo system is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Health check first
async function healthCheck() {
  try {
    console.log('🔍 Performing health check...');
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log(`✅ Server is healthy: ${JSON.stringify(response.data)}\n`);
    return true;
  } catch (error) {
    console.log(`❌ Server health check failed: ${error.message}`);
    console.log('   Please ensure the INSEAT backend is running on the specified URL.');
    console.log(`   Current URL: ${BASE_URL}`);
    console.log('   You can change the URL by setting the BASE_URL environment variable.');
    return false;
  }
}

// Main execution
async function main() {
  const isHealthy = await healthCheck();
  
  if (!isHealthy) {
    process.exit(1);
  }
  
  await runAllTests();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Test execution interrupted by user.');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log('\n💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
main().catch((error) => {
  console.log('\n💥 Test execution failed:', error.message);
  process.exit(1);
});