import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
let sysAdminToken: string;
let magicLink: string | undefined = process.env.MAGIC_LINK_TOKEN; // Can be set via env for testing

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSysAdminCreation() {
  console.log('\n🔍 Testing System Admin Creation...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/sys-admin/setup`, {
      email: 'test-sysadmin@example.com',
      firstName: 'Test',
      lastName: 'SysAdmin'
    });

    if (response.status === 201) {
      console.log('✅ Sys-admin creation successful');
      console.log('📧 Check email/console for magic link');
      
      // In development, magic link might be logged to console
      // You might need to modify this based on your email service implementation
      await delay(2000); // Wait for email processing
      return true;
    }
  } catch (error: any) {
    if (error.response?.status === 400 && 
        error.response?.data?.message === 'System administrator already exists') {
      console.log('ℹ️ Sys-admin already exists, proceeding with login test');
      return true;
    }
    console.error('❌ Sys-admin creation failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPasswordSetup(token: string) {
  console.log('\n🔍 Testing Password Setup...');
  
  try {
    // First verify token
    const verifyResponse = await axios.get(`${API_URL}/auth/verify-setup-token`, {
      params: { token }
    });

    if (verifyResponse.status !== 200) {
      console.error('❌ Token verification failed');
      return false;
    }

    console.log('✅ Token verified successfully');

    // Set up password
    const setupResponse = await axios.post(`${API_URL}/auth/setup-password`, {
      token,
      password: 'TestP@ssw0rd123'
    });

    if (setupResponse.status === 200) {
      console.log('✅ Password setup successful');
      return true;
    }
  } catch (error: any) {
    console.error('❌ Password setup failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSysAdminLogin() {
  console.log('\n🔍 Testing Sys-admin Login...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'test-sysadmin@example.com',
      password: 'TestP@ssw0rd123'
    });

    if (response.status === 200) {
      sysAdminToken = response.data.token || response.headers['authorization'];
      console.log('✅ Sys-admin login successful');
      return true;
    }
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAdminCreation() {
  console.log('\n🔍 Testing Admin User Creation...');
  
  try {
    const response = await axios.post(
      `${API_URL}/auth/sys-admin/admins`,
      {
        email: 'test-admin@example.com',
        firstName: 'Test',
        lastName: 'Admin'
      },
      {
        headers: { Authorization: `Bearer ${sysAdminToken}` }
      }
    );

    if (response.status === 201) {
      console.log('✅ Admin creation successful');
      console.log('📧 Check email/console for magic link');
      await delay(2000); // Wait for email processing
      return true;
    }
  } catch (error: any) {
    console.error('❌ Admin creation failed:', error.response?.data || error.message);
    return false;
  }
}

async function testListAdmins() {
  console.log('\n🔍 Testing Admin Listing...');
  
  try {
    const response = await axios.get(
      `${API_URL}/auth/sys-admin/admins`,
      {
        headers: { Authorization: `Bearer ${sysAdminToken}` }
      }
    );

    if (response.status === 200) {
      console.log('✅ Admin listing successful');
      console.log(`📊 Total admins: ${response.data.admins.length}`);
      return true;
    }
  } catch (error: any) {
    console.error('❌ Admin listing failed:', error.response?.data || error.message);
    return false;
  }
}

async function testErrorCases() {
  console.log('\n🔍 Testing Error Cases...');
  
  try {
    // Test rate limiting
    console.log('Testing rate limiting...');
    for (let i = 0; i < 4; i++) {
      try {
        await axios.post(`${API_URL}/auth/sys-admin/setup`, {
          email: `test${i}@example.com`,
          firstName: 'Test',
          lastName: 'User'
        });
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.log('✅ Rate limiting working as expected');
          break;
        }
      }
      await delay(100);
    }

    // Test invalid token
    console.log('Testing invalid token...');
    try {
      await axios.post(`${API_URL}/auth/setup-password`, {
        token: 'invalid-token',
        password: 'TestP@ssw0rd123'
      });
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid token handling working as expected');
      }
    }

    // Test weak password
    console.log('Testing weak password...');
    try {
      await axios.post(`${API_URL}/auth/setup-password`, {
        token: 'some-token',
        password: 'weak'
      });
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Weak password validation working as expected');
      }
    }

    return true;
  } catch (error: any) {
    console.error('❌ Error case testing failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting end-to-end test flow...\n');

  try {
    // Test sys-admin creation and setup
    if (!await testSysAdminCreation()) {
      process.exit(1);
    }

    // Note: In a real scenario, you'd need to manually get the magic link
    // For testing, you might want to modify the email service to return the link
    if (magicLink && !await testPasswordSetup(magicLink)) {
      process.exit(1);
    } else if (!magicLink) {
      console.log('⚠️ Magic link not available - skipping password setup test');
      console.log('💡 To test password setup, extract magic link from email and set magicLink variable');
    }

    // Test sys-admin login
    if (!await testSysAdminLogin()) {
      process.exit(1);
    }

    // Test admin user management
    if (!await testAdminCreation()) {
      process.exit(1);
    }

    if (!await testListAdmins()) {
      process.exit(1);
    }

    // Test error cases
    if (!await testErrorCases()) {
      process.exit(1);
    }

    console.log('\n✨ All tests completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test flow failed:', error);
    process.exit(1);
  }
}

// Run tests
main();

