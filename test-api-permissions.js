const axios = require('axios');

async function testApiPermissions() {
  try {
    console.log('🧪 Testing API permissions endpoint...');
    
    // You'll need to replace this with a valid JWT token from your login
    // For now, let's test if the endpoint exists
    const baseURL = 'http://localhost:3001'; // or your backend URL
    
    console.log('Testing /auth/me/permissions endpoint availability...');
    console.log('(Note: This will fail with 401 since we need a valid JWT token)');
    
    try {
      const response = await axios.get(`${baseURL}/auth/me/permissions`, {
        headers: {
          'Authorization': 'Bearer invalid-token-for-testing'
        }
      });
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Message: ${error.response.data?.message || 'Unknown error'}`);
        
        if (error.response.status === 401) {
          console.log('✅ Endpoint exists and requires authentication (expected)');
        } else {
          console.log('❌ Unexpected error:', error.response.data);
        }
      } else {
        console.log('❌ Connection error. Is the backend running?', error.message);
      }
    }
    
    console.log('\n📝 Next steps for testing:');
    console.log('1. Start the backend server if not running');
    console.log('2. Login through the admin interface');
    console.log('3. Check browser console for permission logs');
    console.log('4. Use the debug panel to refresh permissions');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testApiPermissions();