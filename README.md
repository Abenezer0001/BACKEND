# Recipe & Inventory Management System

A comprehensive Recipe and Inventory Management system that integrates with the INSEAT platform to provide complete food cost control, inventory tracking, recipe standardization, and yield optimization for restaurant operations.

## 🎯 Core Objectives

- **Cost Control**: Track ingredient costs and calculate accurate food costs per menu item
- **Inventory Management**: Real-time inventory tracking with automated reorder points
- **Recipe Standardization**: Standardized recipes with precise measurements and yields
- **Waste Reduction**: Track and minimize food waste through better inventory management
- **Profitability**: Optimize menu pricing based on accurate cost calculations

## 🏗️ System Architecture

### Core Entities

#### Recipe System
- **Recipe Management**: Complete recipe lifecycle with versioning and standardization
- **Recipe Ingredients**: Detailed ingredient tracking with costs and substitutions
- **Yield Tracking**: Expected vs actual yield monitoring and optimization
- **Nutritional Information**: Complete nutritional data for menu items

#### Inventory System
- **Inventory Items**: Enhanced item management with categories and conversions
- **Stock Movements**: Real-time tracking of all inventory transactions
- **Inventory Categories**: Hierarchical organization of inventory items
- **Stock Alerts**: Automated low stock and reorder notifications

#### Supplier & Purchasing System
- **Supplier Management**: Complete supplier profiles and performance tracking
- **Supplier Items**: Price history and quality ratings per supplier
- **Purchase Orders**: Full purchase order workflow and tracking
- **Purchase Order Items**: Detailed line item management and receiving

#### Cost & Analytics System
- **Recipe Costing**: Real-time recipe cost calculations and analysis
- **Menu Item Costing**: Complete menu item profitability analysis
- **Waste Tracking**: Comprehensive waste monitoring and prevention
- **Analytics Dashboard**: KPI tracking and executive reporting

## 🚀 Key Features

### Recipe Management
- ✅ Recipe creation with detailed instructions and media
- ✅ Version control and change tracking
- ✅ Recipe scaling for different batch sizes
- ✅ Ingredient substitution management
- ✅ Nutritional information calculation
- ✅ Recipe duplication and templating

### Inventory Tracking
- ✅ Real-time stock level monitoring
- ✅ Multi-unit conversion support
- ✅ Batch and expiry date tracking
- ✅ Automated reorder point alerts
- ✅ Stock movement history
- ✅ Inventory valuation reporting

### Cost Management
- ✅ Real-time recipe cost calculation
- ✅ Menu item profitability analysis
- ✅ Cost variance tracking
- ✅ Price history and trends
- ✅ Target cost vs actual cost reporting
- ✅ Margin optimization suggestions

### Supplier Management
- ✅ Supplier performance tracking
- ✅ Price comparison across suppliers
- ✅ Delivery reliability monitoring
- ✅ Quality rating system
- ✅ Preferred supplier identification
- ✅ Supplier recommendation engine

### Purchase Order System
- ✅ Complete PO workflow (draft → sent → received)
- ✅ Approval workflow management
- ✅ Automated PO generation
- ✅ Receiving and quality control
- ✅ Invoice matching
- ✅ Spending analytics

### Waste Reduction
- ✅ Waste event tracking
- ✅ Waste reason categorization
- ✅ Cost impact analysis
- ✅ Prevention suggestion engine
- ✅ Waste trend reporting
- ✅ Benchmarking capabilities

### Analytics & Reporting
- ✅ Executive dashboard with KPIs
- ✅ Cost trend analysis
- ✅ Inventory turnover reporting
- ✅ Yield variance analysis
- ✅ Supplier performance metrics
- ✅ Custom report generation

## 📊 API Endpoints

### Recipe Management
```
GET    /api/inventory/recipes                     # List all recipes
POST   /api/inventory/recipes                     # Create new recipe
GET    /api/inventory/recipes/:id                 # Get recipe details
PUT    /api/inventory/recipes/:id                 # Update recipe
DELETE /api/inventory/recipes/:id                 # Delete recipe
GET    /api/inventory/recipes/:id/cost            # Get recipe cost analysis
POST   /api/inventory/recipes/:id/scale           # Scale recipe quantities
GET    /api/inventory/recipes/:id/yield           # Get yield information
POST   /api/inventory/recipes/:id/yield/actual    # Record actual yield
```

### Inventory Management
```
GET    /api/inventory/inventory                   # List inventory items
POST   /api/inventory/inventory                   # Create inventory item
GET    /api/inventory/inventory/:id               # Get inventory item
POST   /api/inventory/inventory/:id/stock/adjust  # Adjust stock levels
GET    /api/inventory/inventory/low-stock         # Get low stock alerts
GET    /api/inventory/inventory/movements         # Get stock movements
```

### Supplier Management
```
GET    /api/inventory/suppliers                   # List suppliers
POST   /api/inventory/suppliers                   # Create supplier
GET    /api/inventory/suppliers/:id/performance   # Get supplier performance
GET    /api/inventory/suppliers/compare           # Compare supplier prices
```

### Purchase Orders
```
GET    /api/inventory/purchase-orders             # List purchase orders
POST   /api/inventory/purchase-orders             # Create purchase order
POST   /api/inventory/purchase-orders/:id/approve # Approve purchase order
POST   /api/inventory/purchase-orders/:id/receive # Receive purchase order
```

### Analytics & Reporting
```
GET    /api/inventory/analytics/inventory/value   # Inventory valuation
GET    /api/inventory/analytics/cost-trends       # Cost trend analysis
GET    /api/inventory/analytics/profitability     # Profitability analysis
GET    /api/inventory/analytics/waste             # Waste analysis
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18.0.0 or higher
- MongoDB 5.0 or higher
- Redis (for caching and real-time features)

### Installation
```bash
# Navigate to the inventory service
cd services/inventory-service

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Start the service
npm start
```

### Development Mode
```bash
# Start in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Environment Variables
Create a `.env` file in the service root:

```env
# Database
MONGO_URL=mongodb://localhost:27017/inseat

# Authentication
JWT_SECRET=your_jwt_secret_here

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File storage
UPLOAD_PATH=/tmp/uploads
MAX_FILE_SIZE=10MB

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=1000
```

## 🔗 Integration with INSEAT Platform

The Recipe & Inventory Management System is designed to integrate seamlessly with the existing INSEAT platform:

### Menu Item Integration
```javascript
// Automatic cost calculation when menu items are updated
const menuItem = await MenuItem.findById(menuItemId);
const recipeCost = await RecipeCost.findOne({ recipeId: menuItem.recipeId });
menuItem.currentCost = recipeCost.totalCost;
menuItem.profitMargin = ((menuItem.price - recipeCost.totalCost) / menuItem.price) * 100;
```

### Order Processing Integration
```javascript
// Automatic inventory deduction when orders are completed
order.items.forEach(async (item) => {
  const recipe = await Recipe.findById(item.recipeId);
  recipe.recipeIngredients.forEach(async (ingredient) => {
    await InventoryItem.updateStock(ingredient.inventoryItemId, -ingredient.quantity);
  });
});
```

### Real-time Notifications
```javascript
// WebSocket integration for real-time alerts
io.to(`restaurant_${restaurantId}`).emit('stockAlert', {
  type: 'low_stock',
  item: inventoryItem.name,
  currentStock: inventoryItem.currentStock,
  reorderPoint: inventoryItem.reorderPoint
});
```

## 📈 Key Performance Indicators (KPIs)

### Operational Metrics
- **Inventory Turnover Rate**: How quickly inventory is sold and replaced
- **Stock-out Frequency**: How often items go out of stock
- **Waste Percentage**: Percentage of inventory wasted
- **Recipe Adherence Rate**: How consistently recipes are followed
- **Order Fulfillment Accuracy**: Accuracy of order completion

### Financial Metrics
- **Food Cost Percentage**: Food costs as percentage of sales
- **Gross Profit Margin**: Profit margin on menu items
- **Cost Variance by Recipe**: Difference between expected and actual costs
- **Inventory Carrying Cost**: Cost of holding inventory
- **Supplier Cost Savings**: Savings achieved through supplier optimization

### Efficiency Metrics
- **Time to Complete Inventory Counts**: Efficiency of inventory management
- **Purchase Order Processing Time**: Speed of procurement process
- **Recipe Preparation Consistency**: Consistency in recipe execution
- **Inventory Accuracy Percentage**: Accuracy of inventory records
- **Supplier Delivery Performance**: Reliability of supplier deliveries

## 🚦 System Status & Health

### Health Check
```bash
curl http://localhost:3001/api/inventory/health
```

### API Documentation
```bash
curl http://localhost:3001/api/inventory/api-docs
```

### Monitoring & Logging
- **Winston Logging**: Comprehensive application logging
- **Performance Monitoring**: Request/response time tracking
- **Error Tracking**: Automated error detection and alerting
- **Health Checks**: Regular system health verification

## 🔐 Security Features

- **Authentication & Authorization**: JWT-based security
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Cross-origin request security
- **Helmet Security**: HTTP security headers
- **Restaurant Data Isolation**: Multi-tenant security

## 📱 Real-time Features

- **Live Stock Alerts**: Instant low stock notifications
- **Cost Variance Alerts**: Real-time cost change notifications
- **Waste Prevention Alerts**: Proactive waste reduction notifications
- **Purchase Order Updates**: Real-time PO status updates
- **Recipe Cost Updates**: Live recipe cost recalculations

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="Recipe"
npm test -- --testNamePattern="Inventory"
npm test -- --testNamePattern="Supplier"

# Generate coverage report
npm test -- --coverage
```

## 📚 Documentation

- **API Documentation**: Available at `/api/inventory/api-docs`
- **Data Models**: See `src/models/` directory
- **Business Logic**: See `src/services/` directory
- **Integration Examples**: See `examples/` directory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Documentation**: Check the API docs at `/api/inventory/api-docs`
- **Issues**: Create an issue on GitHub
- **Email**: support@inseat.com
- **Discord**: Join our development Discord server

---

Built with ❤️ by the INSEAT Development Team
