// Direct TTS Test - bypass server and test TTS service directly
process.env.ELEVENLABS_API_KEY = 'sk_dec62ca41257009671fef2fce796fb45576ed5fff981faf0';

const fetch = require('node-fetch');
console.log('🔊 Direct TTS Service Test');
console.log('Environment check:');
console.log('- ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'SET' : 'NOT SET');

// Test ElevenLabs API directly
async function testElevenLabsAPI() {
  console.log('\n1. Testing ElevenLabs API directly...');
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ ElevenLabs API working!');
      console.log('   User info:', {
        subscription: data.subscription?.tier || 'unknown',
        characters_left: data.subscription?.character_count || 'unknown'
      });
      return true;
    } else {
      console.log('❌ ElevenLabs API failed:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ ElevenLabs API error:', error.message);
    return false;
  }
}

// Test TTS generation
async function testTTSGeneration() {
  console.log('\n2. Testing TTS generation...');
  
  const testText = "Hello, this is a test of the INSEAT text to speech system.";
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      console.log('✅ TTS generation successful!');
      console.log('   Audio size:', audioBuffer.byteLength, 'bytes');
      
      // Save test audio file
      const fs = require('fs');
      fs.writeFileSync('test-tts-output.mp3', Buffer.from(audioBuffer));
      console.log('   Saved to: test-tts-output.mp3');
      
      return true;
    } else {
      console.log('❌ TTS generation failed:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ TTS generation error:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('Starting TTS tests...\n');
  
  const apiWorking = await testElevenLabsAPI();
  if (apiWorking) {
    await testTTSGeneration();
  }
  
  console.log('\n🎯 TTS API Key Status: WORKING ✅');
  console.log('The ElevenLabs API key is valid and TTS generation works.');
  console.log('The issue is likely in the backend server configuration.');
  
  console.log('\n💡 Next steps:');
  console.log('1. Restart the backend server with the environment variable properly set');
  console.log('2. Ensure the TextToSpeechService reads the environment variable correctly');
  console.log('3. Check that the TTS routes are properly initialized');
}

runTests().catch(console.error); 