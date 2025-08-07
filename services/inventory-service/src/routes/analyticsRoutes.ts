import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';

const router = Router();

// Analytics Overview
router.get('/:restaurantId', analyticsController.getInventoryAnalytics);

// Inventory Valuation
router.get('/inventory/value', analyticsController.getInventoryValue);

// Cost Analysis
router.get('/cost-trends', analyticsController.getCostTrends);
router.get('/cost-analysis', analyticsController.getCostAnalysis);

// Profitability Analysis  
router.get('/profitability', analyticsController.getProfitabilityAnalysis);

// Stock Movement Trends
router.get('/stock-movements', analyticsController.getStockMovementTrends);

export default router;