const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001';

async function testAIChatEndpoint() {
  console.log('Testing AI Chat Endpoint...\n');

  // Test health endpoint
  try {
    console.log('1. Testing AI health endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL}/api/ai/chat/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health endpoint response:', healthData);
  } catch (error) {
    console.error('❌ Health endpoint failed:', error.message);
  }

  // Test streaming chat endpoint
  try {
    console.log('\n2. Testing streaming chat endpoint...');
    const streamResponse = await fetch(`${API_BASE_URL}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Show me vegetarian options',
        sessionId: 'test-session'
      })
    });

    console.log('Response status:', streamResponse.status);
    console.log('Response headers:', Object.fromEntries(streamResponse.headers.entries()));

    if (streamResponse.ok) {
      console.log('✅ Streaming endpoint accessible');
      
      // Read the stream
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let chunks = [];
      
      console.log('\nStreaming data:');
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          chunks.push(chunk);
          console.log('Chunk:', chunk);
        }
      } catch (streamError) {
        console.error('Stream reading error:', streamError.message);
      }
      
    } else {
      console.error('❌ Streaming endpoint failed with status:', streamResponse.status);
      const errorText = await streamResponse.text();
      console.error('Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Streaming endpoint error:', error.message);
  }

  // Test sync chat endpoint
  try {
    console.log('\n3. Testing sync chat endpoint...');
    const syncResponse = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Show me popular dishes'
      })
    });

    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      console.log('✅ Sync endpoint response:', JSON.stringify(syncData, null, 2));
    } else {
      console.error('❌ Sync endpoint failed with status:', syncResponse.status);
      const errorText = await syncResponse.text();
      console.error('Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Sync endpoint error:', error.message);
  }
}

// Environment check
function checkEnvironment() {
  console.log('Environment Configuration Check:');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'set' : 'NOT SET');
  console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'set' : 'NOT SET');
  console.log('- CORS_ORIGINS:', process.env.CORS_ORIGINS || 'not set');
  console.log();
}

// Run tests
async function main() {
  checkEnvironment();
  await testAIChatEndpoint();
}

main().catch(console.error); 