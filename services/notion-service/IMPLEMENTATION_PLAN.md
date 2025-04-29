# Notion Integration Service - Implementation Plan

## Project Overview

This document outlines the step-by-step implementation plan for developing the Notion integration service for INSEAT. The service will enable restaurant administrators to manage their menus through Notion, with changes automatically syncing to the INSEAT platform.

## Phase 1: Setup & Infrastructure (Week 1)

### Day 1-2: Project Setup
- [x] Create service directory structure
- [ ] Set up TypeScript configuration
- [ ] Install dependencies:
  - `@notionhq/client`: Official Notion SDK
  - `express`: API framework
  - `mongoose`: MongoDB ODM
  - `jsonwebtoken`: JWT authentication
  - `axios`: HTTP client
  - `winston`: Logging

### Day 3: Database Models
- [ ] Implement `NotionIntegration` model
- [ ] Create database connection utility
- [ ] Set up schema validation
- [ ] Create database migration scripts

### Day 4-5: Base Service Structure
- [ ] Implement base controller structure
- [ ] Set up routing framework
- [ ] Configure middleware (authentication, logging, error handling)
- [ ] Implement service registration with main application

## Phase 2: Core API Implementation (Week 2)

### Day 1-2: Notion Client Setup
- [ ] Implement Notion API client wrapper
- [ ] Create authentication flow for Notion OAuth
- [ ] Set up secure token storage
- [ ] Implement refresh token mechanism

### Day 3-4: Template System
- [ ] Design menu template structure in Notion
- [ ] Implement template creation service
- [ ] Build page structure utilities
- [ ] Create sample templates for different restaurant types

### Day 5: Integration Management API
- [ ] Implement integration setup endpoint
- [ ] Create integration retrieval endpoint
- [ ] Build integration deletion endpoint
- [ ] Implement status check endpoint

## Phase 3: Sync Engine (Week 3)

### Day 1-2: Notion to INSEAT Sync
- [ ] Implement page content extraction
- [ ] Build data transformation utilities
- [ ] Create menu structure parser
- [ ] Implement database update mechanisms

### Day 3-4: INSEAT to Notion Sync
- [ ] Implement database change detection
- [ ] Build Notion page update mechanism
- [ ] Create conflict resolution strategy
- [ ] Implement sync status tracking

### Day 5: Webhook Handling
- [ ] Set up webhook receiver endpoint
- [ ] Implement signature verification
- [ ] Create event processing queue
- [ ] Build event handlers for different change types

## Phase 4: Error Handling & Resilience (Week 4)

### Day 1-2: Error Management
- [ ] Implement comprehensive error handling
- [ ] Create error logging system
- [ ] Build retry mechanisms for failed operations
- [ ] Implement circuit breaker pattern

### Day 3-4: Testing
- [ ] Create unit tests for core components
- [ ] Build integration tests for sync process
- [ ] Implement mock Notion API for testing
- [ ] Set up CI/CD pipeline for automated testing

### Day 5: Monitoring & Alerting
- [ ] Implement health check endpoints
- [ ] Set up performance monitoring
- [ ] Create alert system for sync failures
- [ ] Build admin dashboard for integration status

## Phase 5: Documentation & Finalization (Week 5)

### Day 1-2: Documentation
- [ ] Create API documentation
- [ ] Write setup guide for restaurant admins
- [ ] Document template structure
- [ ] Create troubleshooting guide

### Day 3-4: Optimization
- [ ] Perform code review
- [ ] Optimize database queries
- [ ] Implement caching strategy
- [ ] Reduce API call frequency

### Day 5: Launch Preparation
- [ ] Conduct final testing
- [ ] Prepare launch checklist
- [ ] Create rollback plan
- [ ] Schedule deployment

## Detailed Implementation Tasks

### Notion Client Setup

```typescript
// src/services/NotionClientService.ts

import { Client } from '@notionhq/client';
import { NotionIntegration } from '../models/NotionIntegration';

export class NotionClientService {
  private static instance: NotionClientService;
  private clients: Map<string, Client> = new Map();
  
  private constructor() {}
  
  public static getInstance(): NotionClientService {
    if (!NotionClientService.instance) {
      NotionClientService.instance = new NotionClientService();
    }
    return NotionClientService.instance;
  }
  
  public async getClientForRestaurant(restaurantId: string): Promise<Client> {
    if (this.clients.has(restaurantId)) {
      return this.clients.get(restaurantId)!;
    }
    
    const integration = await NotionIntegration.findOne({ restaurantId });
    if (!integration) {
      throw new Error(`No Notion integration found for restaurant ${restaurantId}`);
    }
    
    const client = new Client({ auth: integration.accessToken });
    this.clients.set(restaurantId, client);
    
    return client;
  }
  
  public clearClientCache(restaurantId: string): void {
    this.clients.delete(restaurantId);
  }
}
```

### Webhook Handler Implementation

```typescript
// src/services/NotionWebhookService.ts

import { Request, Response } from 'express';
import crypto from 'crypto';
import { NotionIntegration } from '../models/NotionIntegration';
import { NotionSyncQueue } from '../queues/NotionSyncQueue';
import { logger } from '../utils/logger';

export class NotionWebhookService {
  private readonly notionSigningSecret: string;
  
  constructor() {
    this.notionSigningSecret = process.env.NOTION_SIGNING_SECRET || '';
    if (!this.notionSigningSecret) {
      throw new Error('NOTION_SIGNING_SECRET environment variable is required');
    }
  }
  
  public verifyNotionSignature(req: Request): boolean {
    const signature = req.headers['x-notion-signature'] as string;
    const timestamp = req.headers['x-notion-timestamp'] as string;
    
    if (!signature || !timestamp) {
      return false;
    }
    
    const signatureData = timestamp + JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', this.notionSigningSecret)
      .update(signatureData)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
  
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!this.verifyNotionSignature(req)) {
        logger.warn('Invalid webhook signature received');
        res.status(401).send('Invalid signature');
        return;
      }
      
      const { body } = req;
      
      // Process event based on type
      switch (body.type) {
        case 'block.changed':
          await this.handleBlockChanged(body);
          break;
        case 'page.changed':
          await this.handlePageChanged(body);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${body.type}`);
      }
      
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Error processing webhook:', error);
      res.status(500).send('Internal server error');
    }
  }
  
  private async handleBlockChanged(event: any): Promise<void> {
    const pageId = event.page_id;
    const integration = await NotionIntegration.findOne({ menuPageId: pageId });
    
    if (integration) {
      logger.info(`Queueing sync for restaurant ${integration.restaurantId} due to block change`);
      await NotionSyncQueue.add({
        restaurantId: integration.restaurantId.toString(),
        action: 'sync',
        source: 'notion',
        timestamp: new Date().toISOString()
      });
      
      // Update sync status
      integration.syncStatus = 'pending';
      integration.updatedAt = new Date();
      await integration.save();
    }
  }
  
  private async handlePageChanged(event: any): Promise<void> {
    // Similar to handleBlockChanged, but for page-level changes
    const pageId = event.page_id;
    const integration = await NotionIntegration.findOne({ menuPageId: pageId });
    
    if (integration) {
      logger.info(`Queueing sync for restaurant ${integration.restaurantId} due to page change`);
      await NotionSyncQueue.add({
        restaurantId: integration.restaurantId.toString(),
        action: 'sync',
        source: 'notion',
        timestamp: new Date().toISOString()
      });
      
      // Update sync status
      integration.syncStatus = 'pending';
      integration.updatedAt = new Date();
      await integration.save();
    }
  }
}
```

### Template Creation Service

```typescript
// src/services/NotionTemplateService.ts

import { Client } from '@notionhq/client';
import { NotionClientService } from './NotionClientService';
import { templateConfig } from '../config/templateConfig';
import { logger } from '../utils/logger';

export class NotionTemplateService {
  private readonly notionClient: Client;
  
  constructor(private readonly clientService: NotionClientService) {
    // Use internal client for template creation (not restaurant-specific)
    this.notionClient = new Client({ auth: process.env.NOTION_INTERNAL_TOKEN });
  }
  
  public async createMenuTemplate(restaurantId: string, restaurantName: string): Promise<string> {
    try {
      logger.info(`Creating menu template for restaurant ${restaurantId}`);
      
      // Create parent page
      const parentPage = await this.notionClient.pages.create({
        parent: {
          database_id: process.env.NOTION_TEMPLATE_DATABASE_ID!
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: `${restaurantName} Menu`
                }
              }
            ]
          },
          RestaurantId: {
            rich_text: [
              {
                text: {
                  content: restaurantId
                }
              }
            ]
          }
        }
      });
      
      // Add template content
      await this.populateMenuTemplate(parentPage.id, restaurantName);
      
      return parentPage.id;
    } catch (error) {
      logger.error(`Error creating menu template: ${error}`);
      throw new Error(`Failed to create menu template: ${error}`);
    }
  }
  
  private async populateMenuTemplate(pageId: string, restaurantName: string): Promise<void> {
    // Add header
    await this.notionClient.blocks.children.append({
      block_id: pageId,
      children: [
        {
          heading_1: {
            rich_text: [
              {
                text: {
                  content: `${restaurantName} - Menu Management`
                }
              }
            ]
          }
        },
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: "This page is synced with your INSEAT menu. Changes made here will automatically update on your restaurant's menu in the INSEAT platform."
                }
              }
            ]
          }
        }
      ]
    });
    
    // Add categories section
    await this.addCategoriesSection(pageId);
    
    // Add helper information
    await this.addHelperInformation(pageId);
  }
  
  private async addCategoriesSection(pageId: string): Promise<void> {
    // Create each category section with example items
    for (const category of templateConfig.defaultCategories) {
      await this.notionClient.blocks.children.append({
        block_id: pageId,
        children: [
          {
            heading_2: {
              rich_text: [
                {
                  text: {
                    content: category.name
                  }
                }
              ]
            }
          },
          {
            paragraph: {
              rich_text: [
                {
                  text: {
                    content: category.description
                  }
                }
              ]
            }
          },
          {
            divider: {}
          }
        ]
      });
      
      // Add example items
      for (const item of category.exampleItems) {
        await this.addMenuItem(pageId, item);
      }
    }
  }
  
  private async addMenuItem(pageId: string, item: any): Promise<void> {
    await this.notionClient.blocks.children.append({
      block_id: pageId,
      children: [
        {
          heading_3: {
            rich_text: [
              {
                text: {
                  content: item.name
                }
              }
            ]
          }
        },
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: item.description
                }
              }
            ]
          }
        },
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: `Price: $${item.price.toFixed(2)}`
                },
                annotations: {
                  bold: true
                }
              }
            ]
          }
        }
      ]
    });
  }
  
  private async addHelperInformation(pageId: string): Promise<void> {
    await this.notionClient.blocks.children.append({
      block_id: pageId,
      children: [
        {
          divider: {}
        },
        {
          heading_2: {
            rich_text: [
              {
                text: {
                  content: "How to Use This Template"
                }
              }
            ]
          }
        },
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: "1. Organize your menu into categories (Appetizers, Main Course, etc.)"
                }
              }
            ]
          }
        },
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: "2. Add items to each category with name, description, and price"
                }
              }
            ]
          }
        },
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: "3. Changes will sync automatically to your INSEAT account"
                }
              }
            ]
          }
        }
      ]
    });
  }
}
```

### Data Transformation Service

```typescript
// src/utils/notionTransformers.ts

import { MenuItem, MenuCategory } from '../models/Menu';

export class NotionTransformer {
  /**
   * Transforms Notion page content into INSEAT menu structure
   */
  public static transformNotionToMenu(blocks: any[]): {
    categories: MenuCategory[];
    items: MenuItem[];
  } {
    const categories: MenuCategory[] = [];
    const items: MenuItem[] = [];
    
    let currentCategory: MenuCategory | null = null;
    
    for (const block of blocks) {
      // Handle category headers (h2)
      if (block.type === 'heading_2') {
        const categoryName = this.getTextContent(block.heading_2.rich_text);
        currentCategory = {
          name: categoryName,
          description: '',
          order: categories.length + 1
        };
        categories.push(currentCategory);
        continue;
      }
      
      // Handle category description (first paragraph after heading_2)
      if (block.type === 'paragraph' && currentCategory && !currentCategory.description) {
        currentCategory.description = this.getTextContent(block.paragraph.rich_text);
        continue;
      }
      
      // Handle menu items (h3)
      if (block.type === 'heading_3' && currentCategory) {
        const itemName = this.getTextContent(block.heading_3.rich_text);
        const newItem: MenuItem = {
          name: itemName,
          description: '',
          price: 0,
          categoryId: currentCategory.name, // Temporary reference, will be replaced with actual ID
          available: true
        };
        
        // Look ahead for description and price
        const itemData = this.findItemDetails(blocks, blocks.indexOf(block));
        if (itemData) {
          newItem.description = itemData.description;
          newItem.price = itemData.price;
        }
        
        items.push(newItem);
      }
    }
    
    return { categories, items };
  }
  
  /**
   * Extracts text content from Notion rich text array
   */
  private static getTextContent(richText: any[]): string {
    if (!richText || richText.length === 0) {
      return '';
    }
    
    return richText.map(text => text.text.content).join('');
  }
  
  /**
   * Finds item details (description and price) in blocks after the item heading
   */
  private static findItemDetails(blocks: any[], startIndex: number): {
    description: string;
    price: number;
  } | null {
    let description = '';
    let price = 0;
    
    // Look at the next blocks after the heading
    for (let i = startIndex + 1; i < blocks.length && i < startIndex + 4; i++) {
      const block = blocks[i];
      
      // Stop if we hit another heading or divider
      if (block.type.startsWith('heading_') || block.type === 'divider') {
        break;
      }
      
      // Description is the first paragraph after the heading
      if (block.type === 'paragraph' && !description) {
        description = this.getTextContent(block.paragraph.rich_text);
        continue;
      }
      
      // Price is in a paragraph that contains "Price: $X.XX"
      if (block.type === 'paragraph' && description) {
        const text = this.getTextContent(block.paragraph.rich_text);
        const priceMatch = text.match(/Price:\s*\$(\d+(\.\d{1,2})?)/i);
        
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1]);
        }
      }
    }
    
    return { description, price };
  }
  
  /**
   * Transforms INSEAT menu to Notion page structure
   */
  public static transformMenuToNotion(categories: MenuCategory[], items: MenuItem[]): any[] {
    const blocks: any[] = [];
    
    // Add introduction blocks
    blocks.push({
      heading_1: {
        rich_text: [{ text: { content: "Menu" } }]
      }
    });
    
    blocks.push({
      paragraph: {
        rich_text: [{ text: { content: "This menu is synchronized with your INSEAT platform." } }]
      }
    });
    
    blocks.push({ divider: {} });
    
    // Process each category and its items
    for (const category of categories) {
      // Add category heading
      blocks.push({
        heading_2: {
          rich_text: [{ text: { content: category.name } }]
        }
      });
      
      // Add category description
      blocks.push({
        paragraph: {
          rich_text: [{ text: { content: category.description } }]
        }
      });
      
      blocks.push({ divider: {} });
      
      // Add items in this category
      const categoryItems = items.filter(item => item.categoryId === category._id?.toString());
      
      for (const item of categoryItems) {
        // Item heading
        blocks.push({
          heading_3: {
            rich_text: [{ text: { content: item.name } }]
          }
        });
        
        // Item description
        blocks.push({
          paragraph: {
            rich_text: [{ text: { content: item.description } }]
          }
        });
        
        // Item price
        blocks.push({
          paragraph: {
            rich_text: [
              {
                text: { content: `Price: $${item.price.toFixed(2)}` },
                annotations: { bold: true }
              }
            ]
          }
        });
        
        // Add available status if not available
        if (!item.available) {
          blocks.push({
            paragraph: {
              rich_text: [
                {
                  text: { content: "Currently unavailable" },
                  annotations: { italic: true, color: "gray" }
                }
              ]
            }
          });
        }
      }
    }
    
    return blocks;
  }
}
```

## Resource Requirements

### Development Resources
- 2 Backend Developers (full-time, 5 weeks)
- 1 QA Engineer (part-time, 2 weeks)
- 1 Product Manager (part-time, ongoing)

### Infrastructure
- MongoDB database (shared with main application)
- Redis for queue management
- CI/CD pipeline integration

### External Dependencies
- Notion Developer Account
- Notion API access
- AWS S3 for image storage
- Kafka instance for event streaming

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Notion API changes | High | Medium | Monitor Notion developer updates, implement version checks |
| Rate limiting | Medium | High | Implement backoff strategy, queue system for updates |
| Data loss during sync | High | Low | Transaction-based updates, rollback capability |
| Security breach | High | Low | Regular security audits, proper encryption of tokens |
| Performance bottlenecks | Medium | Medium | Optimize sync frequency, implement caching |

## Success Metrics

1. **Integration Adoption**
   - Target: 50% of restaurants using Notion integration within 3 months
   - Measurement: Integration activations vs. total restaurants

2. **Sync Reliability**
   - Target: 99.5% successful syncs
   - Measurement: Sync success rate from monitoring system

3. **Operational Efficiency**
   - Target: 30% reduction in menu update time
   - Measurement: Time comparison between direct updates vs. Notion updates

4. **User Satisfaction**
   - Target: 4.5/5 satisfaction rating
   - Measurement: Post-implementation survey

## Conclusion

This implementation plan provides a comprehensive roadmap for developing the Notion integration service for INSEAT. The phased approach ensures that core functionality is built first, followed by more advanced features, with appropriate testing and documentation throughout the process.

The service will enable restaurant administrators to manage their menus more efficiently, leveraging the user-friendly interface of Notion while maintaining seamless synchronization with the INSEAT platform. 