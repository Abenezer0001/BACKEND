const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001';

async function testTTSEndpoints() {
  console.log('Testing Text-to-Speech Endpoints...\n');

  // Test TTS configuration
  try {
    console.log('1. Testing TTS configuration endpoint...');
    const configResponse = await fetch(`${API_BASE_URL}/api/ai/chat/tts-config`);
    const configData = await configResponse.json();
    console.log('✅ TTS Config response:', configData);
  } catch (error) {
    console.error('❌ TTS Config endpoint failed:', error.message);
  }

  // Test available voices
  try {
    console.log('\n2. Testing available voices endpoint...');
    const voicesResponse = await fetch(`${API_BASE_URL}/api/ai/chat/voices`);
    
    if (voicesResponse.ok) {
      const voicesData = await voicesResponse.json();
      console.log('✅ Available voices:', voicesData.voices?.length || 0, 'voices found');
      if (voicesData.voices?.length > 0) {
        console.log('First few voices:', voicesData.voices.slice(0, 3).map(v => ({
          id: v.voice_id,
          name: v.name
        })));
      }
    } else {
      const errorText = await voicesResponse.text();
      console.error('❌ Voices endpoint failed:', voicesResponse.status, errorText);
    }
  } catch (error) {
    console.error('❌ Voices endpoint error:', error.message);
  }

  // Test text-to-speech conversion
  try {
    console.log('\n3. Testing text-to-speech conversion...');
    const ttsResponse = await fetch(`${API_BASE_URL}/api/ai/chat/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello! Welcome to INSEAT. Here are our delicious menu recommendations for you today.',
        voiceSettings: {
          stability: 0.5,
          similarity_boost: 0.7
        }
      })
    });

    console.log('TTS Response status:', ttsResponse.status);
    console.log('TTS Response headers:', Object.fromEntries(ttsResponse.headers.entries()));

    if (ttsResponse.ok) {
      const audioBuffer = await ttsResponse.buffer();
      console.log('✅ TTS conversion successful');
      console.log('Audio size:', audioBuffer.length, 'bytes');
      console.log('Content-Type:', ttsResponse.headers.get('content-type'));
      
      // You could save the audio file for testing
      // const fs = require('fs');
      // fs.writeFileSync('./test-audio.mp3', audioBuffer);
      // console.log('Audio saved as test-audio.mp3');
      
    } else {
      const errorText = await ttsResponse.text();
      console.error('❌ TTS conversion failed:', ttsResponse.status, errorText);
    }
  } catch (error) {
    console.error('❌ TTS conversion error:', error.message);
  }

  // Test with custom voice settings
  try {
    console.log('\n4. Testing TTS with custom voice settings...');
    const customTTSResponse = await fetch(`${API_BASE_URL}/api/ai/chat/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Thank you for trying our AI-powered menu assistant with voice capabilities!',
        voiceSettings: {
          stability: 0.8,
          similarity_boost: 0.9,
          style: 0.2
        }
      })
    });

    if (customTTSResponse.ok) {
      const audioBuffer = await customTTSResponse.buffer();
      console.log('✅ Custom TTS successful, audio size:', audioBuffer.length, 'bytes');
    } else {
      const errorText = await customTTSResponse.text();
      console.error('❌ Custom TTS failed:', customTTSResponse.status, errorText);
    }
  } catch (error) {
    console.error('❌ Custom TTS error:', error.message);
  }

  // Test health endpoint with TTS info
  try {
    console.log('\n5. Testing health endpoint with TTS info...');
    const healthResponse = await fetch(`${API_BASE_URL}/api/ai/chat/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health endpoint with TTS info:', JSON.stringify(healthData, null, 2));
    } else {
      console.error('❌ Health endpoint failed');
    }
  } catch (error) {
    console.error('❌ Health endpoint error:', error.message);
  }
}

// Environment check for TTS
function checkTTSEnvironment() {
  console.log('TTS Environment Configuration Check:');
  console.log('- ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'set' : 'NOT SET');
  console.log('- ELEVENLABS_VOICE_ID:', process.env.ELEVENLABS_VOICE_ID || 'using default');
  console.log('- ELEVENLABS_MODEL_ID:', process.env.ELEVENLABS_MODEL_ID || 'using default');
  console.log();
}

// Run tests
async function main() {
  checkTTSEnvironment();
  await testTTSEndpoints();
}

main().catch(console.error); 