import { GoogleGenerativeAI } from '@google/generative-ai';
import VectorSearchService from './VectorSearchService';
import { IMenuItem } from '../../../restaurant-service/src/models/MenuItem';

interface StreamingResponse {
  type: 'text' | 'thinking' | 'items' | 'error';
  content: string;
  items?: IMenuItem[];
  suggestions?: string[];
}

interface ConversationContext {
  messageCount: number;
  lastUserMessage: string;
  previousRecommendations: string[];
  userPreferences: {
    dietary?: string[];
    priceRange?: string;
    cuisine?: string;
    spiceLevel?: string;
  };
}

export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversations: Map<string, ConversationContext> = new Map();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 512, // Reduced for more concise responses
      }
    });
  }

  /**
   * Process a food-related query using Gemini AI with conversation context
   */
  async* processQuery(userMessage: string, sessionId: string = 'default'): AsyncGenerator<StreamingResponse> {
    try {
      // Get or create conversation context
      let context = this.conversations.get(sessionId) || {
        messageCount: 0,
        lastUserMessage: '',
        previousRecommendations: [],
        userPreferences: {}
      };
      
      context.messageCount++;
      context.lastUserMessage = userMessage;
      this.conversations.set(sessionId, context);

      // Only show thinking steps for first few messages
      if (context.messageCount <= 2) {
        yield { type: 'thinking', content: 'Analyzing your request...' };
      }

      // Get relevant menu items from vector search
      const relevantItems = await VectorSearchService.search(userMessage, { limit: 8 });
      
      if (context.messageCount <= 2) {
        yield { type: 'thinking', content: 'Finding perfect matches...' };
      }

      // Create context-rich prompt for Gemini
      const prompt = this.createFoodPrompt(userMessage, relevantItems, context);

      // Stream response from Gemini
      const result = await this.model.generateContentStream(prompt);
      
      let accumulatedText = '';
      let recommendedItems: IMenuItem[] = [];

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        accumulatedText += chunkText;
        
        // Stream text as it comes
        yield { type: 'text', content: chunkText };
      }

      // Extract recommended items from the response
      recommendedItems = this.extractRecommendedItems(accumulatedText, relevantItems);

      // Update context with recommendations
      context.previousRecommendations = recommendedItems.map(item => item.name);

      // Yield final items if any were recommended
      if (recommendedItems.length > 0) {
        yield { 
          type: 'items', 
          content: '', 
          items: recommendedItems,
          suggestions: this.generateSuggestions(accumulatedText, context)
        };
      }

    } catch (error) {
      console.error('Gemini AI Error:', error);
      yield { 
        type: 'error', 
        content: 'Having trouble right now. Here are some popular options:' 
      };
      
      // Fallback to popular items
      const fallbackItems = await VectorSearchService.search('popular', { limit: 4 });
      if (fallbackItems.length > 0) {
        yield { type: 'items', content: '', items: fallbackItems };
      }
    }
  }

  /**
   * Create a comprehensive prompt for Gemini with menu context and conversation history
   */
  private createFoodPrompt(userMessage: string, menuItems: IMenuItem[], context: ConversationContext): string {
    const menuContext = menuItems.map(item => ({
      name: item.name,
      description: item.description,
      price: item.price,
      categories: item.categories,
      preparationTime: item.preparationTime,
      isAvailable: item.isAvailable
    }));

    const isFirstMessage = context.messageCount === 1;
    const hasContext = context.messageCount > 1;

    return `You are INSEAT's food assistant. ${isFirstMessage ? 'Welcome the user briefly and' : ''} Help find the perfect food.

MENU ITEMS:
${JSON.stringify(menuContext, null, 2)}

USER REQUEST: "${userMessage}"
${hasContext ? `PREVIOUS REQUEST: "${context.lastUserMessage}"` : ''}
${context.previousRecommendations.length > 0 ? `PREVIOUSLY RECOMMENDED: ${context.previousRecommendations.join(', ')}` : ''}

GUIDELINES:
- ${isFirstMessage ? 'Start with a brief greeting' : 'Continue the conversation naturally, no greeting needed'}
- Keep responses CONCISE (2-3 sentences max)
- Recommend 2-3 specific menu items only
- Focus on WHY each item matches their request
- Use food emojis sparingly
- Include price when relevant
- ${hasContext ? 'Avoid repeating previous recommendations unless specifically asked' : ''}

FORMAT:
Brief response + item recommendations in this format:
🍽️ **[Item Name]** - $[Price] - [One sentence why it fits]

Stay conversational and concise!`;
  }

  /**
   * Extract specific menu items that were recommended in the AI response
   */
  private extractRecommendedItems(aiResponse: string, availableItems: IMenuItem[]): IMenuItem[] {
    const recommendedItems: IMenuItem[] = [];
    
    // Look for menu item names mentioned in the response
    availableItems.forEach(item => {
      if (aiResponse.toLowerCase().includes(item.name.toLowerCase())) {
        recommendedItems.push(item);
      }
    });

    // Limit to top 4 recommendations
    return recommendedItems.slice(0, 4);
  }

  /**
   * Generate follow-up suggestions based on the AI response
   */
  private generateSuggestions(aiResponse: string, context: ConversationContext): string[] {
    const suggestions: string[] = [];
    
    // Extract potential follow-up questions from common patterns
    if (aiResponse.toLowerCase().includes('spicy')) {
      suggestions.push('Show me more spicy options');
    }
    if (aiResponse.toLowerCase().includes('vegetarian') || aiResponse.toLowerCase().includes('vegan')) {
      suggestions.push('More plant-based options');
    }
    if (aiResponse.toLowerCase().includes('price') || aiResponse.toLowerCase().includes('$')) {
      suggestions.push('Show me budget-friendly options');
    }
    if (aiResponse.toLowerCase().includes('dessert') || aiResponse.toLowerCase().includes('sweet')) {
      suggestions.push('What desserts do you have?');
    }

    // Add some default suggestions
    const defaultSuggestions = [
      'What\'s your most popular dish?',
      'Something quick to prepare',
      'Surprise me with a recommendation',
      'Show me today\'s specials'
    ];

    suggestions.push(...defaultSuggestions);
    
    return suggestions.slice(0, 6);
  }

  /**
   * Test if the Gemini service is working
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Say "AI service is working" if you can read this.');
      const response = await result.response;
      const text = response.text();
      return text.toLowerCase().includes('working');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

export default new GeminiAIService(); 