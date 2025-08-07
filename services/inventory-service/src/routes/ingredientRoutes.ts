import { Router } from 'express';
import * as ingredientController from '../controllers/ingredientController';

const router = Router();

// Create a new ingredient
// restaurantId should be in the body for creation
router.post('/ingredients', ingredientController.createIngredientHandler);

// Get all ingredients for a specific restaurant (restaurantId as query param)
router.get('/ingredients', ingredientController.getAllIngredientsHandler);

// Get a specific ingredient by ID (restaurantId as query param for auth/filtering)
router.get('/ingredients/:id', ingredientController.getIngredientByIdHandler);

// Update an ingredient by ID (restaurantId as query param for auth/filtering)
router.put('/ingredients/:id', ingredientController.updateIngredientHandler);

// Delete an ingredient by ID (restaurantId as query param for auth/filtering)
router.delete('/ingredients/:id', ingredientController.deleteIngredientHandler);

// Deduct stock for sale (restaurantId as query param)
router.post('/ingredients/deduct-stock', ingredientController.deductStockForSaleHandler);

export default router;
