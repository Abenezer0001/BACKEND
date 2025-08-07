import fetch from 'node-fetch';

interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export class TextToSpeechService {
  private config: ElevenLabsConfig;
  private defaultVoiceSettings: VoiceSettings;

  constructor() {
    this.config = {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Default voice (Bella)
      modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1'
    };

    this.defaultVoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.0,
      use_speaker_boost: true
    };

    if (!this.config.apiKey) {
      console.warn('ElevenLabs API key not found. Text-to-speech will not be available.');
    }
  }

  /**
   * Convert text to speech using ElevenLabs API
   */
  async generateSpeech(
    text: string, 
    voiceId?: string, 
    voiceSettings?: Partial<VoiceSettings>
  ): Promise<Buffer | null> {
    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for speech generation');
    }

    // Clean the text for better speech synthesis
    const cleanText = this.cleanTextForSpeech(text);

    const selectedVoiceId = voiceId || this.config.voiceId;
    const finalVoiceSettings = { ...this.defaultVoiceSettings, ...voiceSettings };

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: this.config.modelId,
            voice_settings: finalVoiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        // Handle specific ElevenLabs errors
        if (response.status === 401 && errorData.detail?.status === 'detected_unusual_activity') {
          console.warn('ElevenLabs: Unusual activity detected - Free tier usage disabled');
          throw new Error('TTS_SERVICE_RESTRICTED');
        }

        if (response.status === 401) {
          throw new Error('TTS_API_KEY_INVALID');
        }

        if (response.status === 429) {
          throw new Error('TTS_RATE_LIMITED');
        }

        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // Return the audio buffer
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Error generating speech:', error);
      
      // Re-throw with more specific error types with proper type checking
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage === 'TTS_SERVICE_RESTRICTED' || 
          errorMessage === 'TTS_API_KEY_INVALID' || 
          errorMessage === 'TTS_RATE_LIMITED') {
        throw error;
      }
      
      throw new Error(`TTS generation failed: ${errorMessage}`);
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices(): Promise<any[]> {
    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw error;
    }
  }

  /**
   * Get user's subscription info and character limits
   */
  async getUserInfo(): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        method: 'GET',
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  /**
   * Clean text for better speech synthesis
   */
  private cleanTextForSpeech(text: string): string {
    // Remove markdown formatting
    let cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic
      .replace(/`(.*?)`/g, '$1')       // Remove code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/#{1,6}\s/g, '')        // Remove headers
      .replace(/\n+/g, '. ')           // Replace newlines with periods
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim();

    // Limit text length (ElevenLabs has character limits)
    const maxLength = 2500; // Conservative limit
    if (cleanText.length > maxLength) {
      cleanText = cleanText.substring(0, maxLength) + '...';
    }

    return cleanText;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Get the current configuration (without exposing the API key)
   */
  getConfig(): Omit<ElevenLabsConfig, 'apiKey'> & { hasApiKey: boolean } {
    return {
      voiceId: this.config.voiceId,
      modelId: this.config.modelId,
      hasApiKey: !!this.config.apiKey
    };
  }
}

export default new TextToSpeechService(); 