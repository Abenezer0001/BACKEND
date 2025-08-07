import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController';

const router = Router();

// Inventory Items CRUD as specified in PRD
router.get('/', inventoryController.getAllInventoryItemsHandler);
router.post('/', inventoryController.createInventoryItemHandler);
router.get('/:id', inventoryController.getInventoryItemHandler);
router.put('/:id', inventoryController.updateInventoryItemHandler);
router.delete('/:id', inventoryController.deleteInventoryItemHandler);

// Inventory categories
router.get('/categories', inventoryController.getInventoryCategoriesHandler);
router.post('/categories', inventoryController.createInventoryCategoryHandler);
router.put('/categories/:id', inventoryController.updateInventoryCategoryHandler);
router.delete('/categories/:id', inventoryController.deleteInventoryCategoryHandler);

// Stock Management
router.get('/:id/stock', inventoryController.getCurrentStockHandler);
router.post('/:id/stock/adjust', inventoryController.adjustStockHandler);
router.get('/:id/movements', inventoryController.getStockMovementsHandler);
router.post('/:id/movements', inventoryController.recordStockMovementHandler);
router.get('/movements', inventoryController.getAllStockMovementsHandler);

// Stock Alerts & Reordering
router.get('/alerts', inventoryController.getStockAlertsHandler);
router.get('/low-stock', inventoryController.getLowStockItemsHandler);
router.post('/:id/reorder-point', inventoryController.updateReorderPointHandler);
router.get('/reorder-suggestions', inventoryController.getReorderSuggestionsHandler);
router.post('/auto-reorder', inventoryController.createAutoReorderHandler);

// Inventory analytics
router.get('/analytics/value', inventoryController.getInventoryValueHandler);
router.get('/analytics/turnover', inventoryController.getInventoryTurnoverHandler);
router.get('/analytics/usage', inventoryController.getUsageAnalyticsHandler);
router.get('/analytics/trends', inventoryController.getInventoryTrendsHandler);

// Batch operations
router.post('/bulk-update', inventoryController.bulkUpdateInventoryHandler);
router.post('/bulk-adjust', inventoryController.bulkStockAdjustmentHandler);
router.post('/inventory-count', inventoryController.performInventoryCountHandler);

// Search and filtering
router.get('/search/:query', inventoryController.searchInventoryItemsHandler);
router.get('/category/:category', inventoryController.getItemsByCategoryHandler);
router.get('/supplier/:supplierId', inventoryController.getItemsBySupplierHandler);
router.get('/expired', inventoryController.getExpiredItemsHandler);
router.get('/expiring-soon', inventoryController.getExpiringSoonHandler);

// Unit conversion and costing
router.get('/:id/conversions', inventoryController.getUnitConversionsHandler);
router.post('/:id/conversions', inventoryController.addUnitConversionHandler);
router.get('/:id/cost-history', inventoryController.getCostHistoryHandler);

export default router;