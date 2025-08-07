#!/usr/bin/env node

/**
 * Test script for Group Ordering API endpoints
 * Run with: node test-group-ordering-endpoints.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/group-orders';

// Test data
const testRestaurantId = '6861808c53aed6bbdb915964';
const testTableId = '68624ace3a3a2035f54fe8f3';

let createdGroupOrderId = null;
let inviteCode = null;
let participantId = null;

async function testCreateGroupOrder() {
  console.log('\n🧪 Testing: Create Group Order');
  try {
    const response = await axios.post(`${BASE_URL}/create`, {
      restaurantId: testRestaurantId,
      tableId: testTableId,
      paymentStructure: 'equal_split',
      maxParticipants: 6,
      spendingLimitRequired: false,
      sessionDuration: 3600,
      settings: {
        allowItemModification: true,
        requireApprovalForItems: false,
        allowAnonymousParticipants: true
      }
    });

    console.log('✅ Create Group Order Success:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    // Store for next tests
    createdGroupOrderId = response.data.data.groupOrderId;
    inviteCode = response.data.data.inviteCode;
    
    return true;
  } catch (error) {
    console.error('❌ Create Group Order Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testValidateJoinCode() {
  console.log('\n🧪 Testing: Validate Join Code');
  try {
    const response = await axios.get(`${BASE_URL}/validate-join-code?code=${inviteCode}`);
    
    console.log('✅ Validate Join Code Success:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Validate Join Code Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testJoinGroupOrder() {
  console.log('\n🧪 Testing: Join Group Order');
  try {
    const response = await axios.post(`${BASE_URL}/join`, {
      inviteCode: inviteCode,
      userName: 'Test User',
      userEmail: 'test@example.com'
    });

    console.log('✅ Join Group Order Success:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    // Store participant ID for next tests
    participantId = response.data.data.participantId;
    
    return true;
  } catch (error) {
    console.error('❌ Join Group Order Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetGroupOrder() {
  console.log('\n🧪 Testing: Get Group Order Details');
  try {
    const response = await axios.get(`${BASE_URL}/${createdGroupOrderId}`);
    
    console.log('✅ Get Group Order Success:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Get Group Order Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateSpendingLimits() {
  console.log('\n🧪 Testing: Update Spending Limits');
  try {
    const response = await axios.put(`${BASE_URL}/${createdGroupOrderId}/spending-limits`, {
      spendingLimitRequired: true,
      participantLimits: [{
        participantId: participantId,
        limit: 50.00
      }]
    });

    console.log('✅ Update Spending Limits Success:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Update Spending Limits Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdatePaymentStructure() {
  console.log('\n🧪 Testing: Update Payment Structure');
  try {
    const response = await axios.put(`${BASE_URL}/${createdGroupOrderId}/payment-structure`, {
      paymentStructure: 'pay_own'
    });

    console.log('✅ Update Payment Structure Success:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Update Payment Structure Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLeaveGroupOrder() {
  console.log('\n🧪 Testing: Leave Group Order');
  try {
    const response = await axios.post(`${BASE_URL}/${createdGroupOrderId}/leave`, {
      participantId: participantId
    });

    console.log('✅ Leave Group Order Success:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Leave Group Order Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInvalidJoinCode() {
  console.log('\n🧪 Testing: Invalid Join Code');
  try {
    const response = await axios.get(`${BASE_URL}/validate-join-code?code=INVALID`);
    console.log('❌ Should have failed but got:', response.data);
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Invalid Join Code Test Success: Properly rejected invalid code');
      return true;
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting Group Ordering API Tests');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test create group order
  results.push(await testCreateGroupOrder());
  
  if (createdGroupOrderId && inviteCode) {
    // Test validate join code
    results.push(await testValidateJoinCode());
    
    // Test join group order
    results.push(await testJoinGroupOrder());
    
    // Test get group order details
    results.push(await testGetGroupOrder());
    
    if (participantId) {
      // Test update spending limits
      results.push(await testUpdateSpendingLimits());
      
      // Test update payment structure
      results.push(await testUpdatePaymentStructure());
      
      // Test leave group order
      results.push(await testLeaveGroupOrder());
    }
    
    // Test invalid join code
    results.push(await testInvalidJoinCode());
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary:');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Group Ordering API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
  
  console.log('\n🔍 Group Order Created:');
  console.log(`- Group Order ID: ${createdGroupOrderId}`);
  console.log(`- Invite Code: ${inviteCode}`);
  console.log(`- Participant ID: ${participantId}`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});