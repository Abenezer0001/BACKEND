# INSEAT Recipe & Inventory Management System Documentation

## 📋 Overview

This document provides comprehensive documentation for the Recipe & Inventory Management System implementation in the INSEAT-Backend. This system was implemented in commit `8c5e76c` with 77 file changes, introducing a complete inventory and recipe management solution.

## 🏗️ System Architecture

### Service Structure
```
services/inventory-service/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/         # Database schemas
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic
│   ├── tests/          # Unit tests
│   └── server.ts       # Main server configuration
├── package.json        # Dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

### Core Dependencies
- **Express.js** - Web framework
- **Mongoose** - MongoDB ODM
- **TypeScript** - Type safety
- **Security**: Helmet, CORS, Rate Limiting
- **Utilities**: Date-fns, Lodash, UUID
- **File Processing**: Multer, Sharp, CSV-Parser, XLSX
- **Real-time**: Socket.io
- **Caching**: Redis
- **Job Scheduling**: Agenda
- **Logging**: Winston

## 🗄️ Database Models

### 1. Recipe Model (`Recipe.ts`)
**Purpose**: Manages standardized recipes with versioning and cost tracking

**Key Fields**:
- `name`: Recipe name (indexed)
- `category`: Recipe category (indexed)
- `servingSize`: Number of servings
- `prepTime`/`cookTime`: Time in minutes
- `instructions`: Step-by-step instructions array
- `allergens`: Allergen information array
- `dietaryTags`: Dietary restrictions (vegetarian, vegan, etc.)
- `isActive`: Soft delete flag
- `version`: Version number for tracking changes
- `restaurantId`: Restaurant association (indexed)
- `menuItemId`: Link to menu item (indexed)

**Embedded Documents**:
- `recipeIngredients`: Array of ingredients with quantities and costs
- `nutritionalInfo`: Calories, protein, carbs, fat, fiber, sodium, sugar
- `recipeYield`: Expected/actual yield with history tracking

**Indexes**:
- `{ restaurantId: 1, category: 1 }`
- `{ restaurantId: 1, isActive: 1 }`
- `{ restaurantId: 1, menuItemId: 1 }`
- Text search on name and description

### 2. InventoryItem Model (`InventoryItem.ts`)
**Purpose**: Enhanced inventory management replacing basic ingredients

**Key Fields**:
- `name`: Item name (indexed)
- `category`/`subcategory`: Hierarchical categorization
- `sku`/`barcode`: Unique identifiers
- `unit`: Primary unit of measurement
- `conversionFactors`: Map for unit conversions
- `currentStock`/`minimumStock`/`maximumStock`: Stock levels
- `reorderPoint`: Automated reorder threshold
- `averageCost`/`lastCost`/`standardCost`: Cost tracking
- `supplierId`: Supplier reference
- `shelfLife`: Days until expiration
- `isPerishable`: Perishability flag
- `allergens`: Allergen information

**Virtual Fields**:
- `stockStatus`: Calculated status (out_of_stock, low_stock, in_stock, overstock)

**Methods**:
- `needsReorder()`: Check if reorder is needed
- `getCostPerUnit(targetUnit)`: Calculate cost in different units

### 3. PurchaseOrder Model (`PurchaseOrder.ts`)
**Purpose**: Complete purchase order workflow management

**Key Fields**:
- `orderNumber`: Auto-generated unique identifier
- `supplierId`: Supplier reference (indexed)
- `restaurantId`: Restaurant association (indexed)
- `orderDate`/`expectedDeliveryDate`/`actualDeliveryDate`: Timeline tracking
- `status`: Workflow status (draft, sent, confirmed, partial, received, cancelled)
- `totalAmount`/`tax`/`shippingCost`: Financial tracking
- `createdBy`/`approvedBy`/`receivedBy`: User tracking
- `items`: Array of purchase order items

**Virtual Fields**:
- `completionPercentage`: Calculated delivery completion
- `grandTotal`: Total including tax and shipping

**Methods**:
- `calculateTotals()`: Update total amounts
- `markAsReceived(userId)`: Complete the order

### 4. Supplier Model (`Supplier.ts`)
**Purpose**: Supplier management and performance tracking

**Key Fields**:
- `name`/`contactPerson`: Basic information
- `email`/`phone`/`address`: Contact details
- `paymentTerms`: Payment conditions
- `deliveryZones`: Service areas
- `isActive`: Status flag
- `performanceRating`: Quality score
- `reliabilityScore`: Delivery reliability

### 5. WasteTracking Model (`WasteTracking.ts`)
**Purpose**: Comprehensive waste monitoring and prevention

**Key Fields**:
- `inventoryItemId`: Item reference
- `wasteQuantity`/`wasteUnit`: Amount wasted
- `wasteReason`: Categorized reason
- `costImpact`: Financial impact
- `preventable`: Prevention flag
- `reportedBy`: User reference
- `actionTaken`: Prevention measures

### 6. StockMovement Model (`StockMovement.ts`)
**Purpose**: Track all inventory transactions

**Key Fields**:
- `inventoryItemId`: Item reference
- `movementType`: Type (purchase, usage, adjustment, waste, transfer)
- `quantity`: Amount moved
- `unitCost`: Cost per unit
- `totalCost`: Total transaction cost
- `reference`: Related document reference
- `performedBy`: User reference

## 🚀 API Endpoints

### Base URL: `/api/inventory`

### Recipe Management (`/recipes`)

#### Core CRUD Operations
- `GET /recipes` - List all recipes
  - **Query Params**: `restaurantId` (required), `menuItemId` (optional)
  - **Response**: Array of recipe objects
  
- `POST /recipes` - Create new recipe
  - **Payload**: Recipe object with `restaurantId` required
  - **Response**: Created recipe object
  
- `GET /recipes/:id` - Get recipe details
  - **Query Params**: `restaurantId` (required)
  - **Response**: Detailed recipe object with ingredients
  
- `PUT /recipes/:id` - Update recipe
  - **Query Params**: `restaurantId` (required)
  - **Payload**: Updated recipe fields
  - **Response**: Updated recipe object
  
- `DELETE /recipes/:id` - Soft delete recipe
  - **Query Params**: `restaurantId` (required)
  - **Response**: Success message

#### Recipe Versioning
- `GET /recipes/:id/versions` - Get recipe version history
- `POST /recipes/:id/duplicate` - Create recipe copy

#### Recipe Ingredients
- `GET /recipes/:id/ingredients` - List recipe ingredients
- `POST /recipes/:id/ingredients` - Add ingredient to recipe
- `PUT /recipes/:id/ingredients/:ingredientId` - Update recipe ingredient
- `DELETE /recipes/:id/ingredients/:ingredientId` - Remove ingredient

#### Recipe Costing
- `GET /recipes/:id/cost` - Calculate current recipe cost
  - **Response**: 
  ```json
  {
    "recipeId": "string",
    "totalCost": "number",
    "costPerPortion": "number",
    "ingredients": [
      {
        "ingredientId": "string",
        "quantity": "number",
        "unitCost": "number",
        "totalCost": "number"
      }
    ]
  }
  ```

- `POST /recipes/:id/cost/recalculate` - Force cost recalculation

#### Recipe Yield Management
- `GET /recipes/:id/yield` - Get yield information
- `PUT /recipes/:id/yield` - Update expected yield
- `POST /recipes/:id/yield/actual` - Record actual yield
- `GET /recipes/:id/yield/history` - Get yield history
- `POST /recipes/:id/scale` - Scale recipe quantities
  - **Payload**: 
  ```json
  {
    "scalingFactor": "number",
    "targetYield": "number"
  }
  ```

#### Recipe Analytics
- `GET /recipes/:id/cost-analysis` - Detailed cost analysis
- `GET /recipes/:id/profitability` - Profitability metrics
- `GET /recipes/:id/waste-impact` - Waste impact analysis

#### Batch Operations
- `POST /recipes/bulk-cost-update` - Update multiple recipe costs
- `POST /recipes/bulk-scale` - Scale multiple recipes

#### Search & Filtering
- `GET /recipes/search/:query` - Text search recipes
- `GET /recipes/category/:category` - Filter by category
- `GET /recipes/allergens/:allergen` - Filter by allergen

### Inventory Management (`/inventory`)

#### Core CRUD Operations
- `GET /inventory` - List all inventory items
  - **Query Params**: `restaurantId`, `category`, `isActive`
  - **Response**: Array of inventory items
  
- `POST /inventory` - Create inventory item
  - **Payload**: 
  ```json
  {
    "name": "string",
    "category": "string",
    "unit": "string",
    "currentStock": "number",
    "minimumStock": "number",
    "averageCost": "number",
    "restaurantId": "string"
  }
  ```
  
- `GET /inventory/:id` - Get inventory item details
- `PUT /inventory/:id` - Update inventory item
- `DELETE /inventory/:id` - Delete inventory item

#### Inventory Categories
- `GET /inventory/categories` - List categories
- `POST /inventory/categories` - Create category
- `PUT /inventory/categories/:id` - Update category
- `DELETE /inventory/categories/:id` - Delete category

#### Stock Management
- `GET /inventory/:id/stock` - Get current stock level
- `POST /inventory/:id/stock/adjust` - Adjust stock level
  - **Payload**: 
  ```json
  {
    "adjustmentType": "increase|decrease",
    "quantity": "number",
    "reason": "string",
    "unitCost": "number"
  }
  ```
  
- `GET /inventory/:id/movements` - Get stock movement history
- `POST /inventory/:id/movements` - Record stock movement
- `GET /inventory/movements` - Get all stock movements

#### Stock Alerts & Reordering
- `GET /inventory/alerts` - Get all stock alerts
- `GET /inventory/low-stock` - Get low stock items
- `POST /inventory/:id/reorder-point` - Update reorder point
- `GET /inventory/reorder-suggestions` - Get reorder suggestions
- `POST /inventory/auto-reorder` - Create automatic reorder

#### Inventory Analytics
- `GET /inventory/analytics/value` - Total inventory valuation
- `GET /inventory/analytics/turnover` - Inventory turnover rates
- `GET /inventory/analytics/usage` - Usage analytics
- `GET /inventory/analytics/trends` - Inventory trends

#### Batch Operations
- `POST /inventory/bulk-update` - Bulk update inventory
- `POST /inventory/bulk-adjust` - Bulk stock adjustment
- `POST /inventory/inventory-count` - Perform inventory count

#### Search & Filtering
- `GET /inventory/search/:query` - Search inventory items
- `GET /inventory/category/:category` - Filter by category
- `GET /inventory/supplier/:supplierId` - Filter by supplier
- `GET /inventory/expired` - Get expired items
- `GET /inventory/expiring-soon` - Get expiring items

#### Unit Conversions
- `GET /inventory/:id/conversions` - Get unit conversions
- `POST /inventory/:id/conversions` - Add unit conversion
- `GET /inventory/:id/cost-history` - Get cost history

### Supplier Management (`/suppliers`)

#### Core Operations
- `GET /suppliers` - List all suppliers
- `POST /suppliers` - Create supplier
- `GET /suppliers/:id` - Get supplier details
- `PUT /suppliers/:id` - Update supplier
- `DELETE /suppliers/:id` - Delete supplier

#### Supplier Performance
- `GET /suppliers/:id/performance` - Get performance metrics
- `GET /suppliers/:id/items` - Get supplier items
- `GET /suppliers/:id/orders` - Get purchase order history

### Purchase Order Management (`/purchase-orders`)

#### Core Operations
- `GET /purchase-orders` - List purchase orders
  - **Query Params**: `status`, `supplierId`, `dateFrom`, `dateTo`
  
- `POST /purchase-orders` - Create purchase order
  - **Payload**: 
  ```json
  {
    "supplierId": "string",
    "expectedDeliveryDate": "date",
    "items": [
      {
        "inventoryItemId": "string",
        "orderedQuantity": "number",
        "unitPrice": "number"
      }
    ]
  }
  ```
  
- `GET /purchase-orders/:id` - Get purchase order details
- `PUT /purchase-orders/:id` - Update purchase order
- `DELETE /purchase-orders/:id` - Cancel purchase order

#### Purchase Order Workflow
- `POST /purchase-orders/:id/send` - Send order to supplier
- `POST /purchase-orders/:id/approve` - Approve order
- `POST /purchase-orders/:id/receive` - Mark as received
  - **Payload**: 
  ```json
  {
    "items": [
      {
        "inventoryItemId": "string",
        "receivedQuantity": "number",
        "quality": "excellent|good|acceptable|poor|rejected",
        "expiryDate": "date"
      }
    ]
  }
  ```

#### Purchase Order Analytics
- `GET /purchase-orders/analytics/spending` - Spending analysis
- `GET /purchase-orders/analytics/supplier-performance` - Supplier performance

### Analytics & Reporting (`/analytics`)

#### Recipe Analytics
- `GET /analytics/recipes/:id/cost-analysis` - Detailed cost analysis
- `POST /analytics/recipes/bulk-cost-update` - Bulk cost updates
- `GET /analytics/menu-items/:id/cost-analysis` - Menu item cost analysis
- `GET /analytics/cost-analysis/variance` - Cost variance report

#### Inventory Analytics
- `GET /analytics/inventory/value` - Inventory valuation
- `GET /analytics/inventory/turnover` - Turnover rates
- `GET /analytics/inventory/trends` - Inventory trends
- `GET /analytics/inventory/abc-analysis` - ABC analysis

#### Waste Analytics
- `GET /analytics/waste` - Waste analysis
- `GET /analytics/waste/trends` - Waste trends
- `GET /analytics/waste/cost-impact` - Cost impact
- `GET /analytics/waste/prevention-suggestions` - Prevention suggestions

#### Supplier Analytics
- `GET /analytics/supplier-performance` - Performance metrics
- `GET /analytics/supplier-performance/:id` - Detailed performance
- `GET /analytics/supplier-reliability` - Reliability analysis
- `GET /analytics/supplier-cost-analysis` - Cost analysis

#### Cost & Profitability Analytics
- `GET /analytics/cost-trends` - Cost trend analysis
- `GET /analytics/cost-forecasting` - Cost forecasting
- `GET /analytics/price-volatility` - Price volatility
- `GET /analytics/profitability/menu-items` - Menu item profitability
- `GET /analytics/profitability/recipes` - Recipe profitability
- `GET /analytics/margin-analysis` - Margin analysis

#### Operational Analytics
- `GET /analytics/yield-variance` - Yield variance analysis
- `GET /analytics/stock-optimization` - Stock optimization
- `GET /analytics/reorder-optimization` - Reorder optimization
- `GET /analytics/procurement-efficiency` - Procurement efficiency

#### Dashboard & Reports
- `GET /analytics/dashboard/kpis` - Dashboard KPIs
- `GET /analytics/dashboard/alerts` - Dashboard alerts
- `GET /analytics/reports/executive-summary` - Executive summary
- `POST /analytics/reports/custom` - Generate custom report
- `GET /analytics/reports/scheduled` - Scheduled reports
- `POST /analytics/reports/export` - Export report

### Waste Tracking (`/waste`)

#### Core Operations
- `GET /waste` - List waste records
- `POST /waste` - Record waste event
  - **Payload**: 
  ```json
  {
    "inventoryItemId": "string",
    "wasteQuantity": "number",
    "wasteUnit": "string",
    "wasteReason": "expired|damaged|overproduction|contamination|other",
    "costImpact": "number",
    "preventable": "boolean",
    "notes": "string"
  }
  ```
  
- `GET /waste/:id` - Get waste record details
- `PUT /waste/:id` - Update waste record
- `DELETE /waste/:id` - Delete waste record

#### Waste Analytics
- `GET /waste/analytics/trends` - Waste trend analysis
- `GET /waste/analytics/cost-impact` - Cost impact analysis
- `GET /waste/analytics/prevention` - Prevention opportunities

## 🔧 Integration Features

### Real-time Notifications
The system integrates with Socket.io for real-time notifications:

- **Stock Alerts**: Low stock notifications
- **Cost Alerts**: Cost variance notifications  
- **Waste Alerts**: Excessive waste notifications

### Authentication & Authorization
- **Auth Middleware**: JWT-based authentication
- **Restaurant Scope**: Multi-tenant data isolation
- **Role-based Access**: Permission-based endpoint access

### Error Handling
- **Centralized Error Handler**: Consistent error responses
- **Request Validation**: Input validation middleware
- **Logging**: Winston-based logging system

### Performance Optimizations
- **Database Indexes**: Optimized query performance
- **Rate Limiting**: API protection
- **Compression**: Response compression
- **Caching**: Redis integration ready

## 🧪 Testing

### Test Structure
```
src/tests/
├── services/
│   ├── ingredientService.test.ts
│   └── recipeService.test.ts
```

### Test Coverage
- **Unit Tests**: Service layer testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load testing capabilities

## 📦 Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/inseat
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
REDIS_URL=redis://localhost:6379
```

### Docker Support
The service is containerized and ready for deployment with the main INSEAT application.

### Health Monitoring
- **Health Check**: `/health` endpoint
- **API Documentation**: `/api-docs` endpoint
- **Metrics**: Performance monitoring ready

## 🔄 Integration with INSEAT Platform

### Service Integration
The inventory service integrates with the main INSEAT application through:

1. **Initialization Function**: `initializeInventoryService(mainApp, io)`
2. **Route Mounting**: All routes mounted under `/api/inventory`
3. **Real-time Events**: Socket.io integration for live updates
4. **Shared Middleware**: Authentication and restaurant scoping

### Menu Item Integration
- **Cost Calculation**: Automatic menu item cost updates
- **Recipe Linking**: Direct recipe-to-menu-item relationships
- **Profitability Analysis**: Real-time profit margin calculations

### Order Integration
- **Stock Deduction**: Automatic inventory updates on orders
- **Recipe Scaling**: Dynamic recipe scaling based on order volume
- **Cost Tracking**: Real-time cost tracking per order

## 📈 Key Performance Indicators (KPIs)

### Cost Management KPIs
- **Food Cost Percentage**: Target vs actual food costs
- **Recipe Cost Variance**: Standard vs actual recipe costs
- **Menu Item Profitability**: Profit margins per item

### Inventory Management KPIs
- **Inventory Turnover**: How quickly inventory moves
- **Stock-out Frequency**: Number of out-of-stock events
- **Carrying Cost**: Cost of holding inventory

### Waste Management KPIs
- **Waste Percentage**: Waste as percentage of purchases
- **Waste Cost Impact**: Financial impact of waste
- **Prevention Success Rate**: Effectiveness of waste prevention

### Supplier Management KPIs
- **Supplier Performance Score**: Overall supplier rating
- **Delivery Reliability**: On-time delivery percentage
- **Cost Competitiveness**: Price comparison metrics

## 🚀 Future Enhancements

### Planned Features
- **AI-Powered Forecasting**: Demand prediction
- **Mobile App Integration**: Mobile inventory management
- **IoT Integration**: Smart scale and sensor integration
- **Advanced Analytics**: Machine learning insights
- **Multi-location Support**: Chain restaurant management

### API Versioning
The system is designed for future API versioning with backward compatibility support.

---

## 📞 Support

For technical support or questions about the Recipe & Inventory Management System, please contact the INSEAT development team.

**System Status**: ✅ Production Ready  
**Last Updated**: July 2025  
**Version**: 1.0.0
