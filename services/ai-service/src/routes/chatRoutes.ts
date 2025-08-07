import { Router } from 'express';
import ChatController from '../controllers/ChatController';
import { asyncHandler } from '../../../auth-service/src/middleware/errorHandler';
import rateLimit from 'express-rate-limit';
import TextToSpeechService from '../services/TextToSpeechService';

const router = Router();

// Debug environment and TTS configuration
console.log('🔊 TTS Route Configuration:');
console.log('  - ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? `SET (${process.env.ELEVENLABS_API_KEY.slice(0, 10)}...)` : 'NOT SET');
console.log('  - TTS Service configured:', TextToSpeechService.isConfigured());
console.log('  - TTS Config:', TextToSpeechService.getConfig());

// CORS configuration function
const setCORSHeaders = (req: any, res: any) => {
  const origin = req.headers.origin;
  
  // Allow specific origins for development
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000', 
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
  
  // Check if the origin is in allowed list or if no origin (for same-origin requests)
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || 'http://localhost:8080');
  }
  
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
};

// Apply CORS to all routes
router.use((req, res, next) => {
  setCORSHeaders(req, res);
  next();
});

// Rate limiting for chat endpoints
const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: 'Too many chat requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for TTS endpoints (more restrictive)
const ttsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 TTS requests per 5 minutes
  message: 'Too many text-to-speech requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS preflight handler for all routes
router.options('*', (req, res) => {
  setCORSHeaders(req, res);
  res.sendStatus(200);
});

// Apply rate limiting to all chat routes
router.use('/stream', chatRateLimit);
router.use('/', chatRateLimit);

/**
 * @swagger
 * /api/ai/chat/stream:
 *   post:
 *     summary: Process chat message with real-time AI streaming
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: User's food-related query
 *                 example: "I want something spicy and vegetarian"
 *               sessionId:
 *                 type: string
 *                 description: Optional session ID for conversation context
 *                 example: "user123"
 *     responses:
 *       200:
 *         description: Server-Sent Events stream with AI responses
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Stream of JSON objects with AI responses
 */
router.post('/stream', ChatController.processChatStream.bind(ChatController));

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Process chat message (non-streaming fallback)
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: User's food-related query
 *                 example: "Show me vegan options"
 *               context:
 *                 type: object
 *                 description: Optional conversation context
 *     responses:
 *       200:
 *         description: Chat response with menu recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: AI assistant's response
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MenuItem'
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Follow-up suggestions
 *                 intent:
 *                   type: string
 *                   description: Detected user intent
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/', ChatController.processChatSync.bind(ChatController));

/**
 * @swagger
 * /api/ai/chat/tts:
 *   post:
 *     summary: Convert text to speech using ElevenLabs
 *     tags: [AI Chat, Text-to-Speech]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to convert to speech
 *                 example: "Here are our popular dishes for today"
 *               voiceId:
 *                 type: string
 *                 description: Optional ElevenLabs voice ID
 *                 example: "EXAVITQu4vr4xnSDxMaL"
 *               voiceSettings:
 *                 type: object
 *                 description: Optional voice settings
 *                 properties:
 *                   stability:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                   similarity_boost:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *     responses:
 *       200:
 *         description: Audio file (MP3)
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/tts', ttsRateLimit, asyncHandler(async (req, res) => {
  const { text, voiceId, voiceSettings } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      error: 'Text is required and must be a string'
    });
  }

  if (!TextToSpeechService.isConfigured()) {
    return res.status(503).json({
      error: 'Text-to-speech service is not configured',
      code: 'TTS_NOT_CONFIGURED'
    });
  }

  try {
    const audioBuffer = await TextToSpeechService.generateSpeech(text, voiceId, voiceSettings);
    
    if (!audioBuffer) {
      return res.status(500).json({
        error: 'Failed to generate speech',
        code: 'TTS_GENERATION_FAILED'
      });
    }

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS generation error:', error);
    
    // Handle specific error types with proper type checking
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage === 'TTS_SERVICE_RESTRICTED') {
      return res.status(503).json({
        error: 'Text-to-speech service is temporarily restricted due to unusual activity detection. This is a temporary ElevenLabs API limitation.',
        code: 'TTS_SERVICE_RESTRICTED',
        details: 'The ElevenLabs free tier has been disabled for this API key due to unusual activity detection. Consider upgrading to a paid plan or using a different TTS service.'
      });
    }
    
    if (errorMessage === 'TTS_API_KEY_INVALID') {
      return res.status(401).json({
        error: 'Invalid API key for text-to-speech service',
        code: 'TTS_API_KEY_INVALID'
      });
    }
    
    if (errorMessage === 'TTS_RATE_LIMITED') {
      return res.status(429).json({
        error: 'Rate limit exceeded for text-to-speech service',
        code: 'TTS_RATE_LIMITED'
      });
    }

    return res.status(500).json({
      error: 'Text-to-speech generation failed',
      code: 'TTS_ERROR',
      details: errorMessage
    });
  }
}));

/**
 * @swagger
 * /api/ai/chat/voices:
 *   get:
 *     summary: Get available ElevenLabs voices
 *     tags: [AI Chat, Text-to-Speech]
 *     responses:
 *       200:
 *         description: List of available voices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 voices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       voice_id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       503:
 *         description: Service not configured
 */
router.get('/voices', asyncHandler(async (req, res) => {
  if (!TextToSpeechService.isConfigured()) {
    return res.status(503).json({
      error: 'Text-to-speech service is not configured'
    });
  }

  try {
    const voices = await TextToSpeechService.getAvailableVoices();
    res.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      error: 'Failed to fetch available voices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/ai/chat/tts-config:
 *   get:
 *     summary: Get text-to-speech configuration status
 *     tags: [AI Chat, Text-to-Speech]
 *     responses:
 *       200:
 *         description: TTS configuration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: boolean
 *                 voiceId:
 *                   type: string
 *                 modelId:
 *                   type: string
 */
router.get('/tts-config', asyncHandler(async (req, res) => {
  const config = TextToSpeechService.getConfig();
  res.json({
    configured: config.hasApiKey,
    voiceId: config.voiceId,
    modelId: config.modelId
  });
}));

// Health check for AI service
router.get('/health', asyncHandler(async (req, res) => {
  const ttsConfig = TextToSpeechService.getConfig();
  res.json({ 
    status: 'OK', 
    service: 'AI Chat Service',
    textToSpeech: {
      configured: ttsConfig.hasApiKey,
      voiceId: ttsConfig.voiceId
    },
    timestamp: new Date().toISOString()
  });
}));

export default router; 