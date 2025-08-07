import { Request, Response } from 'express';
import GeminiAIService from '../services/GeminiAIService';
import VectorSearchService from '../services/VectorSearchService';
import MenuItem, { IMenuItem } from '../../../restaurant-service/src/models/MenuItem';

interface ChatMessage {
  message: string;
  items: IMenuItem[];
  suggestions: string[];
  menuSuggestions?: IMenuItem[];
  intent: string;
  timestamp: string;
}

// Helper function for CORS headers (same as in routes)
const getSSECORSHeaders = (req: Request) => {
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
  
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': (!origin || allowedOrigins.includes(origin)) ? (origin || 'http://localhost:8080') : undefined,
    'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'Access-Control-Allow-Origin',
  };
};

export class ChatController {
  /**
   * Process chat with real AI streaming
   */
  async processChat(req: Request, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        res.status(400).json({ 
          error: 'Message is required and must be a string' 
        });
        return;
      }

      // Set up Server-Sent Events for streaming with proper CORS
      const headers = getSSECORSHeaders(req);
      // Filter out undefined values
      const filteredHeaders = Object.fromEntries(
        Object.entries(headers).filter(([_, value]) => value !== undefined)
      );
      
      res.writeHead(200, filteredHeaders);

      // Send initial response
      this.sendSSE(res, {
        type: 'start',
        message: 'AI is processing your request...',
        timestamp: new Date().toISOString()
      });

      try {
        // Use real Gemini AI for processing with session ID
        const streamGenerator = GeminiAIService.processQuery(message, 'default');
        
        let accumulatedText = '';
        let finalItems: IMenuItem[] = [];
        let finalSuggestions: string[] = [];

        for await (const chunk of streamGenerator) {
          switch (chunk.type) {
            case 'thinking':
              this.sendSSE(res, {
                type: 'thinking',
                content: chunk.content,
                timestamp: new Date().toISOString()
              });
              break;

            case 'text':
              accumulatedText += chunk.content;
              this.sendSSE(res, {
                type: 'text',
                content: chunk.content,
                timestamp: new Date().toISOString()
              });
              break;

            case 'items':
              if (chunk.items) {
                finalItems = chunk.items;
                this.sendSSE(res, {
                  type: 'items',
                  items: chunk.items,
                  timestamp: new Date().toISOString()
                });
              }
              if (chunk.suggestions) {
                finalSuggestions = chunk.suggestions;
                this.sendSSE(res, {
                  type: 'suggestions',
                  suggestions: chunk.suggestions,
                  timestamp: new Date().toISOString()
                });
              }
              break;

            case 'error':
              this.sendSSE(res, {
                type: 'error',
                message: chunk.content,
                timestamp: new Date().toISOString()
              });
              break;
          }
        }

        // Send completion signal
        this.sendSSE(res, {
          type: 'complete',
          message: accumulatedText,
          items: finalItems,
          suggestions: finalSuggestions,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('AI processing error:', error);
        
        // Fallback to basic recommendations
        const fallbackItems = await this.getFallbackRecommendations(message);
        
        this.sendSSE(res, {
          type: 'error',
          message: 'I\'m having trouble connecting to our AI service, but here are some recommendations based on your request:',
          items: fallbackItems,
          suggestions: ['Try asking again', 'Show me popular dishes', 'What\'s available today?'],
          timestamp: new Date().toISOString()
        });
      }

      // Close the stream
      this.sendSSE(res, { type: 'end' });
      res.end();

    } catch (error) {
      console.error('Error in chat controller:', error);
      res.status(500).json({ 
        error: 'Failed to process chat message',
        message: 'Sorry, I encountered an error while processing your request. Please try again.'
      });
    }
  }

  /**
   * Non-streaming chat endpoint for compatibility
   */
  async processChatSync(req: Request, res: Response): Promise<void> {
    try {
      const { message, context = {} } = req.body;
      
      if (!message || typeof message !== 'string') {
        res.status(400).json({ 
          error: 'Message is required and must be a string' 
        });
        return;
      }

      // Use basic fallback for sync requests
      const response = await this.createFallbackResponse(message);
      res.json(response);
    } catch (error) {
      console.error('Error processing sync chat message:', error);
      res.status(500).json({ 
        error: 'Failed to process chat message',
        message: 'Sorry, I encountered an error while processing your request. Please try again.'
      });
    }
  }

  /**
   * Streaming chat endpoint with real-time AI responses
   */
  async processChatStream(req: Request, res: Response): Promise<void> {
    try {
      const { message, sessionId = 'default' } = req.body;
      
      if (!message || typeof message !== 'string') {
        res.status(400).json({ 
          error: 'Message is required and must be a string' 
        });
        return;
      }

      // Set SSE headers with improved CORS
      const headers = getSSECORSHeaders(req);
      // Filter out undefined values
      const filteredHeaders = Object.fromEntries(
        Object.entries(headers).filter(([_, value]) => value !== undefined)
      );
      
      res.writeHead(200, filteredHeaders);

      try {
        let accumulatedText = '';
        let finalItems: IMenuItem[] = [];
        let finalSuggestions: string[] = [];

        // Stream from AI service with session ID
        for await (const chunk of GeminiAIService.processQuery(message, sessionId)) {
          switch (chunk.type) {
            case 'thinking':
              this.sendSSE(res, {
                type: 'thinking',
                content: chunk.content,
                timestamp: new Date().toISOString()
              });
              break;

            case 'text':
              accumulatedText += chunk.content;
              this.sendSSE(res, {
                type: 'text',
                content: chunk.content,
                timestamp: new Date().toISOString()
              });
              break;

            case 'items':
              if (chunk.items && chunk.items.length > 0) {
                finalItems = chunk.items;
                this.sendSSE(res, {
                  type: 'items',
                  items: chunk.items,
                  timestamp: new Date().toISOString()
                });
              }

              if (chunk.suggestions && chunk.suggestions.length > 0) {
                finalSuggestions = chunk.suggestions;
                this.sendSSE(res, {
                  type: 'suggestions',
                  suggestions: chunk.suggestions,
                  timestamp: new Date().toISOString()
                });
              }
              break;

            case 'error':
              this.sendSSE(res, {
                type: 'error',
                message: chunk.content,
                timestamp: new Date().toISOString()
              });
              break;
          }
        }

        // Send completion signal
        this.sendSSE(res, {
          type: 'complete',
          message: accumulatedText,
          items: finalItems,
          suggestions: finalSuggestions,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('AI processing error:', error);
        
        // Fallback to basic recommendations
        const fallbackItems = await this.getFallbackRecommendations(message);
        
        this.sendSSE(res, {
          type: 'error',
          message: 'I\'m having trouble connecting to our AI service, but here are some recommendations based on your request:',
          items: fallbackItems,
          suggestions: ['Try asking again', 'Show me popular dishes', 'What\'s available today?'],
          timestamp: new Date().toISOString()
        });
      }

      // Close the stream
      this.sendSSE(res, { type: 'end' });
      res.end();

    } catch (error) {
      console.error('Error in chat controller:', error);
      res.status(500).json({ 
        error: 'Failed to process chat message',
        message: 'Sorry, I encountered an error while processing your request. Please try again.'
      });
    }
  }

  /**
   * Send Server-Sent Event
   */
  private sendSSE(res: Response, data: any): void {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Create a fallback response when AI is unavailable
   */
  private async createFallbackResponse(message: string): Promise<ChatMessage> {
    const messageLower = message.toLowerCase();
    
    let response: ChatMessage = {
      message: '',
      items: [],
      suggestions: [],
      intent: 'general',
      timestamp: new Date().toISOString()
    };

    try {
      // Use vector search for basic matching
      let searchResults: IMenuItem[] = [];

      if (messageLower.includes('vegan')) {
        searchResults = await VectorSearchService.searchByDietaryRestrictions(['vegan'], 6);
        response.message = 'Here are our vegan options:';
        response.intent = 'dietary';
      } else if (messageLower.includes('vegetarian')) {
        searchResults = await VectorSearchService.searchByDietaryRestrictions(['vegetarian'], 6);
        response.message = 'Here are our vegetarian options:';
        response.intent = 'dietary';
      } else if (messageLower.includes('spicy')) {
        searchResults = await VectorSearchService.search('spicy', { limit: 6 });
        response.message = 'Here are our spicy dishes:';
        response.intent = 'search';
      } else if (messageLower.includes('dessert')) {
        searchResults = await VectorSearchService.searchByCategory('dessert', 6);
        response.message = 'Here are our dessert options:';
        response.intent = 'category';
      } else if (messageLower.includes('popular') || messageLower.includes('recommend')) {
        searchResults = await this.getPopularSuggestions();
        response.message = 'Here are our most popular dishes:';
        response.intent = 'recommendation';
      } else {
        // General search
        searchResults = await VectorSearchService.search(message, { limit: 6 });
        response.message = searchResults.length > 0 
          ? 'I found these items that might interest you:'
          : 'I couldn\'t find specific matches, but here are some popular options:';
        response.intent = 'search';
      }

      // Fallback to popular items if no results
      if (searchResults.length === 0) {
        searchResults = await this.getPopularSuggestions();
        response.message = 'Here are some popular items you might enjoy:';
      }

      response.items = searchResults;
      response.suggestions = await this.getPopularSuggestionStrings();

    } catch (error) {
      console.error('Error creating fallback response:', error);
      response.message = 'I\'m having trouble processing your request right now. Please try again later.';
      response.suggestions = ['Show me popular dishes', 'What\'s available today?', 'Help me choose something'];
    }

    return response;
  }

  /**
   * Get fallback recommendations based on simple keyword matching
   */
  private async getFallbackRecommendations(message: string): Promise<IMenuItem[]> {
    try {
      const results = await VectorSearchService.search(message, { limit: 6 });
      if (results.length > 0) {
        return results;
      }
      
      // Return popular items as fallback
      return await this.getPopularSuggestions();
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  private async getPopularSuggestionStrings(): Promise<string[]> {
    try {
      const categories = await MenuItem.distinct('categories', { isAvailable: true });
      const suggestions = categories.filter(Boolean).slice(0, 4);
      
      const commonQueries = ['Popular items', 'Quick meals', 'Desserts', 'Vegetarian options'];
      
      return [...suggestions, ...commonQueries].slice(0, 6);
    } catch (error) {
      console.error('Error getting popular suggestion strings:', error);
      return ['Popular items', 'Vegetarian options', 'Quick meals', 'Desserts'];
    }
  }

  private async getPopularSuggestions(): Promise<IMenuItem[]> {
    try {
      const items = await MenuItem.aggregate([
        { $match: { isAvailable: true } },
        { $sample: { size: 6 } }
      ]);
      
      return items;
    } catch (error) {
      console.error('Error getting popular suggestions:', error);
      return [];
    }
  }
}

export default new ChatController(); 