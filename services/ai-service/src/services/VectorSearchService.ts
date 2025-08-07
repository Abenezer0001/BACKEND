import * as natural from 'natural';
import { removeStopwords } from 'stopword';
import MenuItem, { IMenuItem } from '../../../restaurant-service/src/models/MenuItem';

interface SearchOptions {
  limit?: number;
  category?: string;
  dietaryRestrictions?: string[];
  maxPrice?: number;
  minPrice?: number;
  spicyLevel?: number;
  restaurantId?: string;
}

class VectorSearchService {
  private tfidf: natural.TfIdf;
  private documents: Array<{
    index: number;
    menuItem: IMenuItem;
    searchText: string;
  }>;
  private menuItems: IMenuItem[];
  private isInitialized: boolean;

  constructor() {
    this.tfidf = new natural.TfIdf();
    this.documents = [];
    this.menuItems = [];
    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Vector Search Service...');
      await this.loadMenuItems();
      await this.buildVectorIndex();
      this.isInitialized = true;
      console.log(`Vector search initialized with ${this.menuItems.length} menu items`);
    } catch (error) {
      console.error('Error initializing vector search:', error);
      throw error;
    }
  }

  async loadMenuItems(): Promise<void> {
    try {
      this.menuItems = await MenuItem.find({ isAvailable: true }).lean() as IMenuItem[];
      console.log(`Loaded ${this.menuItems.length} available menu items`);
    } catch (error) {
      console.error('Error loading menu items:', error);
      throw error;
    }
  }

  buildVectorIndex(): void {
    this.documents = [];
    this.tfidf = new natural.TfIdf();

    this.menuItems.forEach((item, index) => {
      const searchText = this.buildSearchText(item);
      this.documents.push({
        index,
        menuItem: item,
        searchText
      });
      this.tfidf.addDocument(searchText);
    });

    console.log(`Built vector index for ${this.documents.length} documents`);
  }

  buildSearchText(menuItem: IMenuItem): string {
    const textParts = [
      menuItem.name,
      menuItem.description,
      ...(menuItem.categories || []).map(cat => cat.toString()),
      ...(menuItem.subCategories || []).map(sub => sub.toString()),
      ...(menuItem.allergens || []),
    ].filter(Boolean);

    return textParts.join(' ').toLowerCase();
  }

  preprocessQuery(query: string): string {
    // Convert to lowercase and remove special characters
    const cleaned = query.toLowerCase().replace(/[^\w\s]/g, ' ');
    
    // Tokenize
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(cleaned) || [];
    
    // Remove stop words
    const withoutStopWords = removeStopwords(tokens);
    
    // Stem words
    const stemmed = withoutStopWords.map(token => natural.PorterStemmer.stem(token));
    
    return stemmed.join(' ');
  }

  async search(query: string, options: SearchOptions = {}): Promise<IMenuItem[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      limit = 10,
      category,
      dietaryRestrictions = [],
      maxPrice,
      minPrice,
      spicyLevel,
      restaurantId
    } = options;

    try {
      const processedQuery = this.preprocessQuery(query);
      const results: Array<{
        menuItem: IMenuItem;
        score: number;
        relevance: number;
      }> = [];

      // Get TF-IDF scores for all documents
      this.tfidf.tfidfs(processedQuery, (i: number, measure: number) => {
        if (measure > 0) {
          const doc = this.documents[i];
          const menuItem = doc.menuItem;

          // Apply filters
          if (category && menuItem.categories && !menuItem.categories.some(cat => 
            cat.toString().toLowerCase().includes(category.toLowerCase())
          )) {
            return;
          }

          if (restaurantId && menuItem.restaurantId?.toString() !== restaurantId) {
            return;
          }

          if (dietaryRestrictions.length > 0) {
            const hasAllergens = dietaryRestrictions.some(restriction => 
              menuItem.allergens && menuItem.allergens.includes(restriction)
            );
            if (hasAllergens) return;
          }

          if (maxPrice && menuItem.price > maxPrice) return;
          if (minPrice && menuItem.price < minPrice) return;

          results.push({
            menuItem,
            score: measure,
            relevance: this.calculateRelevance(query, menuItem)
          });
        }
      });

      // Sort by combined score and relevance
      results.sort((a, b) => {
        const scoreA = a.score * 0.7 + a.relevance * 0.3;
        const scoreB = b.score * 0.7 + b.relevance * 0.3;
        return scoreB - scoreA;
      });

      // If we don't have enough results from TF-IDF, try simple text matching
      if (results.length < 3) {
        console.log(`TF-IDF found only ${results.length} results, adding fallback matches for: "${query}"`);
        
        const fallbackMatches = this.menuItems.filter(item => {
          // Skip items already in results
          const alreadyIncluded = results.some(result => result.menuItem._id.toString() === item._id.toString());
          if (alreadyIncluded) return false;
          
          // Simple text matching
          const itemText = this.buildSearchText(item);
          const queryWords = query.toLowerCase().split(/\s+/);
          
          return queryWords.some(word => 
            itemText.includes(word) || 
            item.name.toLowerCase().includes(word)
          );
        }).map(item => ({
          menuItem: item,
          score: 0.1, // Low TF-IDF score
          relevance: this.calculateRelevance(query, item)
        }));

        // Add fallback matches
        results.push(...fallbackMatches);
        
        // Re-sort with fallback matches
        results.sort((a, b) => {
          const scoreA = a.score * 0.7 + a.relevance * 0.3;
          const scoreB = b.score * 0.7 + b.relevance * 0.3;
          return scoreB - scoreA;
        });
      }

      return results.slice(0, limit).map(result => result.menuItem);
    } catch (error) {
      console.error('Error performing search:', error);
      throw error;
    }
  }

  calculateRelevance(query: string, menuItem: IMenuItem): number {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    let relevance = 0;

    // Exact name match gets highest score
    if (menuItem.name.toLowerCase() === queryLower) {
      relevance += 100;
    } else if (menuItem.name.toLowerCase().includes(queryLower)) {
      relevance += 50;
    }

    // Check if any word in the query matches any word in the name
    const nameWords = menuItem.name.toLowerCase().split(/\s+/);
    queryWords.forEach(queryWord => {
      nameWords.forEach(nameWord => {
        if (nameWord === queryWord) {
          relevance += 40; // Exact word match
        } else if (nameWord.includes(queryWord) || queryWord.includes(nameWord)) {
          relevance += 25; // Partial word match
        }
      });
    });

    // Category matches
    if (menuItem.categories) {
      menuItem.categories.forEach(category => {
        const categoryLower = category.toString().toLowerCase();
        if (categoryLower.includes(queryLower)) {
          relevance += 30;
        }
        // Check word-by-word for categories too
        queryWords.forEach(queryWord => {
          if (categoryLower.includes(queryWord)) {
            relevance += 15;
          }
        });
      });
    }

    // Description matches
    if (menuItem.description) {
      const descriptionLower = menuItem.description.toLowerCase();
      if (descriptionLower.includes(queryLower)) {
        relevance += 20;
      }
      // Check word-by-word for description
      queryWords.forEach(queryWord => {
        if (descriptionLower.includes(queryWord)) {
          relevance += 10;
        }
      });
    }

    // Subcategory matches
    if (menuItem.subCategories) {
      menuItem.subCategories.forEach(sub => {
        const subLower = sub.toString().toLowerCase();
        if (subLower.includes(queryLower)) {
          relevance += 25;
        }
        queryWords.forEach(queryWord => {
          if (subLower.includes(queryWord)) {
            relevance += 12;
          }
        });
      });
    }

    return relevance;
  }

  async searchByCategory(category: string, limit = 20): Promise<IMenuItem[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const filteredItems = this.menuItems.filter(item => 
        item.categories && item.categories.some(cat => 
          cat.toString().toLowerCase().includes(category.toLowerCase())
        )
      );

      return filteredItems.slice(0, limit);
    } catch (error) {
      console.error('Error searching by category:', error);
      throw error;
    }
  }

  async searchByDietaryRestrictions(restrictions: string[], limit = 20): Promise<IMenuItem[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const filteredItems = this.menuItems.filter(item => {
        // Check that the item doesn't have any of the restricted allergens
        return !restrictions.some(restriction => 
          item.allergens && item.allergens.includes(restriction)
        );
      });

      return filteredItems.slice(0, limit);
    } catch (error) {
      console.error('Error searching by dietary restrictions:', error);
      throw error;
    }
  }

  async getSimilarItems(menuItemId: string, limit = 5): Promise<IMenuItem[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const targetItem = this.menuItems.find(item => item._id.toString() === menuItemId);
      if (!targetItem) {
        return [];
      }

      const targetText = this.buildSearchText(targetItem);
      const results = await this.search(targetText, { 
        limit: limit + 1,
        category: targetItem.categories?.[0]?.toString()
      });

      return results.filter(item => item._id.toString() !== menuItemId).slice(0, limit);
    } catch (error) {
      console.error('Error finding similar items:', error);
      throw error;
    }
  }

  async refresh(): Promise<void> {
    try {
      console.log('Refreshing vector search index...');
      await this.loadMenuItems();
      this.buildVectorIndex();
      console.log('Vector search index refreshed');
    } catch (error) {
      console.error('Error refreshing vector search:', error);
      throw error;
    }
  }

  getStats(): { isInitialized: boolean; totalItems: number; totalDocuments: number } {
    return {
      isInitialized: this.isInitialized,
      totalItems: this.menuItems.length,
      totalDocuments: this.documents.length
    };
  }
}

// Export singleton instance
export default new VectorSearchService(); 