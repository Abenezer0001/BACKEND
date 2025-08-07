import express from 'express';
import analyticsController from '../controllers/analyticsController';
import { authenticateAnalytics, authorizeAnalytics, validateBusinessScope } from '../middleware/auth';
import {
  validateDateRange,
  validateRestaurantIds,
  validatePagination,
  validatePeriod,
  validateSort,
  validateBusinessId,
  rateLimit
} from '../middleware/validation';

const router = express.Router();

// Apply authentication and rate limiting to all routes
router.use(authenticateAnalytics);
router.use(authorizeAnalytics);
router.use(validateBusinessScope);
router.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Sales Dashboard Routes
router.get('/sales/dashboard', 
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getSalesDashboard
);
router.get('/sales/restaurants',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  validatePagination,
  validateSort,
  analyticsController.getSalesRestaurants
);

// Order Performance Routes  
router.get('/orders/overview',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  validatePeriod,
  analyticsController.getOrderPerformanceOverview
);
router.get('/orders/hourly-distribution',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getHourlyOrderDistribution
);
router.get('/orders/weekly-trends',
  validateBusinessId,
  validateRestaurantIds,
  analyticsController.getWeeklyOrderTrends
);
router.get('/orders/status-breakdown',
  validateBusinessId,
  validateRestaurantIds,
  validatePeriod,
  analyticsController.getOrderStatusBreakdown
);

// Menu Report Routes
router.get('/menu/overview',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getMenuOverview
);
router.get('/menu/top-selling',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getTopSellingItems
);
router.get('/menu/category-performance',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getCategoryPerformance
);
router.get('/menu/low-performing',
  validateBusinessId,
  validateRestaurantIds,
  analyticsController.getLowPerformingItems
);

// Main Dashboard Routes
router.get('/dashboard/overview',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getDashboardOverview
);
router.get('/dashboard/monthly-orders',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getMonthlyOrders
);
router.get('/dashboard/best-sellers',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getBestSellers
);
router.get('/dashboard/hourly-orders',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getHourlyOrderDistribution
);

// Customer Analytics Routes
router.get('/customers/overview',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getCustomerOverview
);
router.get('/customers/top-customers',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  validatePagination,
  analyticsController.getTopCustomers
);
router.get('/customers/demographics',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getCustomerDemographics
);
router.get('/customers/feedback-analysis',
  validateBusinessId,
  validateRestaurantIds,
  validateDateRange,
  analyticsController.getCustomerFeedbackAnalysis
);

// Enhanced Dashboard Routes
router.get('/dashboard/historical',
  validateBusinessId,
  validateRestaurantIds,
  analyticsController.getDashboardHistorical
);
router.get('/dashboard/growth-metrics',
  validateBusinessId,
  validateRestaurantIds,
  validatePeriod,
  analyticsController.getDashboardGrowthMetrics
);

export default router;
