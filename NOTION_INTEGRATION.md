# Notion Integration for INSEAT Backend

## Overview

This document outlines the technical design for integrating Notion with the INSEAT Backend system. The integration will allow restaurant administrators to manage their menus directly from Notion and automatically sync changes to the INSEAT platform.

## Goals and Requirements

1. **Menu Management in Notion**:
   - Enable restaurant owners/managers to create and edit menus in Notion
   - Support for menu categories, items, modifiers, and pricing
   - Allow for rich media (images) for menu items

2. **Bidirectional Sync**:
   - Changes in Notion automatically sync to INSEAT database
   - Updates from INSEAT admin panel reflect in Notion documents

3. **User Experience**:
   - Provide templates for restaurant owners
   - Simple, intuitive interface in Notion
   - Status indicators for sync state

## Technical Architecture

### Components

1. **Notion Service Module**:
   ```
   INSEAT-Backend/
   ├── services/
   │   ├── notion-service/
   │   │   ├── src/
   │   │   │   ├── controllers/
   │   │   │   │   └── NotionController.ts
   │   │   │   ├── models/
   │   │   │   │   └── NotionIntegration.ts
   │   │   │   ├── services/
   │   │   │   │   ├── NotionSyncService.ts
   │   │   │   │   └── NotionWebhookService.ts
   │   │   │   ├── routes/
   │   │   │   │   └── notionRoutes.ts
   │   │   │   └── utils/
   │   │   │       ├── notionTemplates.ts
   │   │   │       └── notionTransformers.ts
   ```

2. **Database Schema Extensions**:
   - New MongoDB collection for Notion integration settings
   - Association between restaurants and Notion pages

3. **Webhook Handler**:
   - Endpoint to receive Notion change notifications
   - Processing logic to update INSEAT database

### Integration Flow

1. **Setup Process**:
   - Restaurant admin authorizes INSEAT to access their Notion workspace
   - System creates template pages in Notion for the restaurant
   - Integration details stored in database

2. **Sync Mechanism**:
   ```
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │             │      │             │      │             │
   │   Notion    │<─────│  INSEAT     │<─────│ Restaurant  │
   │  Workspace  │─────>│  Backend    │─────>│  Database   │
   │             │      │             │      │             │
   └─────────────┘      └─────────────┘      └─────────────┘
           Webhooks           Kafka Events
   ```

3. **Data Flow for Changes**:
   - Notion → INSEAT: Notion webhooks trigger sync service
   - INSEAT → Notion: Database changes trigger Notion API calls

## Implementation Details

### 1. Notion API Integration

```typescript
// NotionSyncService.ts (simplified example)
export class NotionSyncService {
  private notionClient: Client;
  
  constructor(apiKey: string) {
    this.notionClient = new Client({ auth: apiKey });
  }
  
  async syncMenuFromNotion(restaurantId: string, menuPageId: string): Promise<void> {
    // Fetch menu data from Notion
    const menuPage = await this.notionClient.pages.retrieve({ page_id: menuPageId });
    const menuBlocks = await this.notionClient.blocks.children.list({ block_id: menuPageId });
    
    // Transform Notion data to INSEAT menu format
    const menuData = this.transformNotionToMenu(menuPage, menuBlocks);
    
    // Update restaurant menu in database
    await this.updateRestaurantMenu(restaurantId, menuData);
    
    // Publish event for real-time updates
    await KafkaProducerService.publishMenuUpdated({ restaurantId, menuData });
  }
  
  // Other methods...
}
```

### 2. Database Schema

```typescript
// NotionIntegration.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface INotionIntegration extends Document {
  restaurantId: mongoose.Types.ObjectId;
  workspaceId: string;
  accessToken: string;
  menuPageId: string;
  lastSyncedAt: Date;
  syncStatus: 'synced' | 'pending' | 'error';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotionIntegrationSchema = new Schema({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  workspaceId: { type: String, required: true },
  accessToken: { type: String, required: true },
  menuPageId: { type: String, required: true },
  lastSyncedAt: { type: Date, default: Date.now },
  syncStatus: { type: String, enum: ['synced', 'pending', 'error'], default: 'pending' },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<INotionIntegration>('NotionIntegration', NotionIntegrationSchema);
```

### 3. Webhook Handler

```typescript
// NotionWebhookService.ts
export class NotionWebhookService {
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { body } = req;
      
      // Verify webhook signature
      this.verifyNotionSignature(req);
      
      // Process the event
      if (body.type === 'block_changed') {
        const pageId = body.page_id;
        
        // Find associated restaurant
        const integration = await NotionIntegration.findOne({ menuPageId: pageId });
        
        if (integration) {
          // Queue sync task
          await this.queueSyncTask(integration.restaurantId, pageId);
          
          // Update status
          integration.syncStatus = 'pending';
          integration.updatedAt = new Date();
          await integration.save();
        }
      }
      
      res.sendStatus(200);
    } catch (error) {
      console.error('Notion webhook error:', error);
      res.sendStatus(500);
    }
  }
  
  // Other methods...
}
```

## API Endpoints

1. **Setup Integration**:
   - `POST /api/notion/setup`
   - Initiates OAuth flow with Notion

2. **Sync Operations**:
   - `POST /api/notion/sync/restaurant/:restaurantId`
   - Manually triggers sync between Notion and INSEAT

3. **Webhook Receiver**:
   - `POST /api/notion/webhook`
   - Receives notifications from Notion

4. **Integration Management**:
   - `GET /api/notion/restaurant/:restaurantId`
   - `DELETE /api/notion/restaurant/:restaurantId`

## Security Considerations

1. **Authentication**:
   - Secure storage of Notion access tokens
   - JWT-based authentication for API endpoints

2. **Webhook Verification**:
   - Validate Notion webhook signatures
   - Implement rate limiting

3. **Data Validation**:
   - Sanitize data from Notion before database updates
   - Validate structure against expected templates

## Implementation Roadmap

1. **Phase 1: Basic Integration**
   - Notion API client setup
   - OAuth flow implementation
   - Template creation functionality
   - Simple menu sync (one-way from Notion to INSEAT)

2. **Phase 2: Enhanced Sync**
   - Webhook implementation for real-time updates
   - Bidirectional sync support
   - Error handling and recovery mechanisms

3. **Phase 3: Advanced Features**
   - Multi-restaurant support
   - Analytics and reporting
   - Custom templates based on restaurant type

## Testing Strategy

1. **Unit Tests**:
   - Test data transformations between systems
   - Verify authentication flows
   - Check webhook signature validation

2. **Integration Tests**:
   - End-to-end sync process
   - Error recovery scenarios
   - Rate limit handling

3. **Mock Notion API**:
   - Create test fixtures for Notion API responses
   - Simulate webhook callbacks

## Monitoring and Maintenance

1. **Logging**:
   - Track all sync operations
   - Record sync errors with context

2. **Alerts**:
   - Notify on repeated sync failures
   - Alert on authentication issues

3. **Metrics**:
   - Sync frequency and duration
   - Error rates and resolution times 