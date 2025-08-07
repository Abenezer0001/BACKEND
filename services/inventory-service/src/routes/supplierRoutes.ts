import { Router } from 'express';
import * as supplierController from '../controllers/supplierController';

const router = Router();

// Supplier Management as specified in PRD
router.get('/', supplierController.getAllSuppliers);
router.post('/', supplierController.createSupplier);
// router.get('/:id', supplierController.getSupplierHandler); // Missing handler
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

// Supplier Items
router.get('/:id/items', supplierController.getSupplierItems);
router.post('/:id/items', supplierController.addSupplierItem);
router.put('/:id/items/:itemId', supplierController.updateSupplierItem);
router.delete('/:id/items/:itemId', supplierController.removeSupplierItem);

// Supplier performance and analytics
router.get('/:id/performance', supplierController.getSupplierPerformance);
// router.get('/:id/price-history', supplierController.getSupplierPriceHistoryHandler); // Missing handler
// router.get('/:id/delivery-stats', supplierController.getDeliveryStatsHandler); // Missing handler
// router.put('/:id/rating', supplierController.updateSupplierRatingHandler); // Missing handler

// Supplier comparison and analysis
// router.get('/compare', supplierController.compareSupplierPricesHandler); // Missing handler
// router.get('/analytics/performance', supplierController.getSupplierAnalyticsHandler); // Missing handler
// router.get('/recommendations', supplierController.getSupplierRecommendationsHandler); // Missing handler

export default router;