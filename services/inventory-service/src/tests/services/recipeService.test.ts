import * as recipeService from '../../services/recipeService';
import Recipe from '../../models/Recipe';
import Ingredient from '../../models/Ingredient';
import mongoose from 'mongoose';

jest.mock('../../models/Recipe');
jest.mock('../../models/Ingredient'); // For cost calculation

const mockRestaurantId = new mongoose.Types.ObjectId().toString();

describe('Recipe Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecipe', () => {
    it('should create, calculate cost, and save a recipe', async () => {
      const ingredientId1 = new mongoose.Types.ObjectId();
      const mockRecipeData = {
        name: 'Test Pasta',
        restaurantId: new mongoose.Types.ObjectId(mockRestaurantId),
        recipeIngredients: [{ inventoryItemId: ingredientId1, quantity: 100, unit: 'g' }],
        yieldQuantity: 2,
        yieldUom: 'servings',
      };
      const mockIngredient = { _id: ingredientId1, name: 'Pasta', averageCostPrice: 0.01, unitOfMeasurement: 'g' }; // 0.01 per gram

      (Ingredient.findById as jest.Mock).mockResolvedValue(mockIngredient);

      const saveMock = jest.fn().mockImplementation(function(this: any) { return Promise.resolve(this); });
      (Recipe as any).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: saveMock,
      }));

      const result = await recipeService.createRecipe(mockRecipeData);

      expect(Ingredient.findById).toHaveBeenCalledWith(ingredientId1);
      expect(Recipe).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Pasta',
        calculatedCost: 1, // 100g * 0.01/g = 1
        calculatedCostPerPortion: 0.5, // 1 / 2 servings
      }));
      expect(saveMock).toHaveBeenCalled();
      expect(result.name).toBe('Test Pasta');
    });

    it('should throw an error if restaurantId is missing', async () => {
      const mockRecipeData = { name: 'Test Soup' };
      // The service function itself throws this error
      await expect(recipeService.createRecipe(mockRecipeData as any))
        .rejects
        .toThrow('restaurantId is required to create a recipe.');
    });
  });

  describe('getAllRecipes', () => {
    it('should return recipes for a restaurantId, populating ingredients', async () => {
      const mockRecipes = [{ name: 'Pizza', restaurantId: mockRestaurantId }];
      (Recipe.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRecipes), // Chain populate
      } as any);

      const result = await recipeService.getAllRecipes(mockRestaurantId);
      expect(Recipe.find).toHaveBeenCalledWith({ restaurantId: new mongoose.Types.ObjectId(mockRestaurantId), isActive: true });
      expect(result).toEqual(mockRecipes);
    });

    it('should filter by menuItemId if provided', async () => {
        const menuItemId = new mongoose.Types.ObjectId().toString();
        (Recipe.find as jest.Mock).mockReturnValue({
            populate: jest.fn().mockResolvedValue([]),
        } as any);

        await recipeService.getAllRecipes(mockRestaurantId, { menuItemId });
        expect(Recipe.find).toHaveBeenCalledWith({
            restaurantId: new mongoose.Types.ObjectId(mockRestaurantId),
            isActive: true,
            menuItemId: new mongoose.Types.ObjectId(menuItemId)
        });
    });
  });

  describe('getRecipeById', () => {
    it('should return a recipe if found, populating ingredients', async () => {
      const recipeId = new mongoose.Types.ObjectId().toString();
      const mockRecipe = { name: 'Burger', _id: recipeId, restaurantId: mockRestaurantId };
      (Recipe.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRecipe), // Chain populate
      } as any);

      const result = await recipeService.getRecipeById(recipeId, mockRestaurantId);
      expect(Recipe.findOne).toHaveBeenCalledWith({ _id: recipeId, restaurantId: new mongoose.Types.ObjectId(mockRestaurantId), isActive: true });
      expect(result).toEqual(mockRecipe);
    });

     it('should return null if recipe not found', async () => {
      const recipeId = new mongoose.Types.ObjectId().toString();
       (Recipe.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      } as any);
      const result = await recipeService.getRecipeById(recipeId, mockRestaurantId);
      expect(result).toBeNull();
    });
  });

  describe('updateRecipe', () => {
    it('should update a recipe and recalculate cost if ingredients change', async () => {
      const recipeId = new mongoose.Types.ObjectId().toString();
      const ingredientId = new mongoose.Types.ObjectId();
      const updateData = {
        ingredients: [{ ingredientId, quantity: 150, uom: 'g' }], // Changed quantity
        yieldQuantity: 3,
      };
      const existingRecipe = {
        _id: recipeId,
        name: 'Old Pasta',
        restaurantId: mockRestaurantId,
        ingredients: [{ ingredientId, quantity: 100, uom: 'g' }],
        yieldQuantity: 2,
        calculatedCost: 1,
        calculatedCostPerPortion: 0.5,
        isActive: true,
      };
      const mockIngredient = { _id: ingredientId, name: 'Pasta', averageCostPrice: 0.01 };

      (Ingredient.findById as jest.Mock).mockResolvedValue(mockIngredient);
      // Mock findOne to return the existing recipe for cost recalculation logic
      (Recipe.findOne as jest.Mock).mockResolvedValue(existingRecipe);

      const updatedRecipeResult = {
        ...existingRecipe,
        ...updateData,
        calculatedCost: 1.5, // 150g * 0.01/g = 1.5
        calculatedCostPerPortion: 0.5, // 1.5 / 3 servings
      };
      (Recipe.findOneAndUpdate as jest.Mock).mockReturnValue({
          populate: jest.fn().mockResolvedValue(updatedRecipeResult) // chain populate
      });


      const result = await recipeService.updateRecipe(recipeId, updateData, mockRestaurantId);

      expect(Ingredient.findById).toHaveBeenCalledWith(ingredientId);
      expect(Recipe.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: recipeId, restaurantId: new mongoose.Types.ObjectId(mockRestaurantId), isActive: true },
        expect.objectContaining({
          calculatedCost: 1.5,
          calculatedCostPerPortion: 0.5,
        }),
        { new: true }
      );
      expect(result).toEqual(updatedRecipeResult);
    });

    it('should return null if recipe to update is not found', async () => {
        const recipeId = new mongoose.Types.ObjectId().toString();
        (Recipe.findOneAndUpdate as jest.Mock).mockReturnValue({
            populate: jest.fn().mockResolvedValue(null)
        });
        const result = await recipeService.updateRecipe(recipeId, {name: "New Name"}, mockRestaurantId);
        expect(result).toBeNull();
    });
  });

  describe('deleteRecipe', () => {
    it('should set isActive to false (soft delete)', async () => {
      const recipeId = new mongoose.Types.ObjectId().toString();
      const deletedRecipe = { _id: recipeId, name: 'Old Recipe', isActive: false };
      (Recipe.findOneAndUpdate as jest.Mock).mockResolvedValue(deletedRecipe);

      const result = await recipeService.deleteRecipe(recipeId, mockRestaurantId);
      expect(Recipe.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: recipeId, restaurantId: new mongoose.Types.ObjectId(mockRestaurantId) },
        { isActive: false },
        { new: true }
      );
      expect(result?.isActive).toBe(false);
    });
  });

  describe('calculateRecipeCost (indirectly via create/update, or directly if exported)', () => {
    // This helper is implicitly tested via createRecipe and updateRecipe.
    // If exported, direct tests would look like:
    it('should calculate cost correctly with available ingredients', async () => {
        const ingredientId1 = new mongoose.Types.ObjectId();
        const ingredientId2 = new mongoose.Types.ObjectId();
        const ingredientsInput = [
            { inventoryItemId: ingredientId1, quantity: 2, unit: 'pcs' },
            { inventoryItemId: ingredientId2, quantity: 0.5, unit: 'kg' },
        ];
        (Ingredient.findById as jest.Mock)
            .mockResolvedValueOnce({ _id: ingredientId1, averageCostPrice: 1.5 }) // Cost 1.5 per pc
            .mockResolvedValueOnce({ _id: ingredientId2, averageCostPrice: 4 });  // Cost 4 per kg

        // If calculateRecipeCost were exported:
        // const costInfo = await recipeService.calculateRecipeCost(ingredientsInput as any);
        // expect(costInfo.totalCost).toBe((2 * 1.5) + (0.5 * 4)); // 3 + 2 = 5

        // For now, covered by createRecipe's test where this logic is invoked.
        // We can check the calculatedCost in createRecipe test.
        const recipeData = {
            name: 'Cost Test Recipe',
            restaurantId: new mongoose.Types.ObjectId(mockRestaurantId),
            recipeIngredients: ingredientsInput,
            yieldQuantity: 5,
            yieldUom: 'servings'
        };

        const saveMock = jest.fn().mockImplementation(function(this: any) { return Promise.resolve(this); });
        (Recipe as any).mockImplementation((data: any) => ({
            ...data,
            _id: new mongoose.Types.ObjectId(),
            save: saveMock,
        }));

        await recipeService.createRecipe(recipeData);

        expect(Recipe).toHaveBeenCalledWith(expect.objectContaining({
            calculatedCost: (2 * 1.5) + (0.5 * 4), // 5
            calculatedCostPerPortion: ((2 * 1.5) + (0.5 * 4)) / 5, // 1
        }));
    });

    it('should handle missing ingredients during cost calculation gracefully', async () => {
        const ingredientId1 = new mongoose.Types.ObjectId();
        const missingIngredientId = new mongoose.Types.ObjectId();
        const ingredientsInput = [
            { inventoryItemId: ingredientId1, quantity: 1, unit: 'pcs' },
            { inventoryItemId: missingIngredientId, quantity: 1, unit: 'pcs' },
        ];
        (Ingredient.findById as jest.Mock)
            .mockResolvedValueOnce({ _id: ingredientId1, averageCostPrice: 2.5 })
            .mockResolvedValueOnce(null); // Second ingredient not found

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const recipeData = {
            name: 'Missing Ing Cost Test',
            restaurantId: new mongoose.Types.ObjectId(mockRestaurantId),
            recipeIngredients: ingredientsInput,
            yieldQuantity: 1,
        };

        const saveMock = jest.fn().mockImplementation(function(this: any) { return Promise.resolve(this); });
        (Recipe as any).mockImplementation((data: any) => ({
            ...data,
            _id: new mongoose.Types.ObjectId(),
            save: saveMock,
        }));

        await recipeService.createRecipe(recipeData);

        expect(Recipe).toHaveBeenCalledWith(expect.objectContaining({
            calculatedCost: 2.5, // Only first ingredient counted
        }));
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`Ingredient with ID ${missingIngredientId} not found`));
        consoleWarnSpy.mockRestore();
    });
  });
});
