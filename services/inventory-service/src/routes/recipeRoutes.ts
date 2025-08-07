import { Router } from 'express';
import * as recipeController from '../controllers/recipeController';

const router = Router();

// Recipe CRUD Operations as specified in PRD
router.get('/', recipeController.getAllRecipesHandler);
router.post('/', recipeController.createRecipeHandler);
router.get('/:id', recipeController.getRecipeByIdHandler);
router.put('/:id', recipeController.updateRecipeHandler);
router.delete('/:id', recipeController.deleteRecipeHandler);

// Recipe versioning
router.get('/:id/versions', recipeController.getRecipeVersionsHandler);
router.post('/:id/duplicate', recipeController.duplicateRecipeHandler);

// Recipe Ingredients & Costing
router.get('/:id/ingredients', recipeController.getRecipeIngredientsHandler);
router.post('/:id/ingredients', recipeController.addRecipeIngredientHandler);
router.put('/:id/ingredients/:ingredientId', recipeController.updateRecipeIngredientHandler);
router.delete('/:id/ingredients/:ingredientId', recipeController.removeRecipeIngredientHandler);

// Recipe costing
router.get('/:id/cost', recipeController.calculateRecipeCostHandler);
router.post('/:id/cost/recalculate', recipeController.forceRecalculateRecipeCostHandler);

// Recipe Yield Management
router.get('/:id/yield', recipeController.getRecipeYieldHandler);
router.put('/:id/yield', recipeController.updateRecipeYieldHandler);
router.post('/:id/yield/actual', recipeController.recordActualYieldHandler);
router.get('/:id/yield/history', recipeController.getYieldHistoryHandler);
router.post('/:id/scale', recipeController.scaleRecipeHandler);

// Recipe analytics and insights
router.get('/:id/cost-analysis', recipeController.getRecipeCostAnalysisHandler);
router.get('/:id/profitability', recipeController.getRecipeProfitabilityHandler);
// router.get('/:id/waste-impact', recipeController.getRecipeWasteImpactHandler); // Handler not implemented

// Batch operations
router.post('/bulk-cost-update', recipeController.bulkUpdateRecipeCostsHandler);
router.post('/bulk-scale', recipeController.bulkScaleRecipesHandler);

// Recipe search and filtering
router.get('/search/:query', recipeController.searchRecipesHandler);
router.get('/category/:category', recipeController.getRecipesByCategoryHandler);
router.get('/allergens/:allergen', recipeController.getRecipesByAllergenHandler);

export default router;
