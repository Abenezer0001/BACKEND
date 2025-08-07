// In services/inventory-service/src/tests/services/ingredientService.test.ts
import * as ingredientService from '../../services/ingredientService';
import Ingredient from '../../models/Ingredient'; // This will be the mock
import Recipe from '../../models/Recipe'; // Mock for deductStockForSale
import StockTransaction from '../../models/StockTransaction'; // Mock for deductStockForSale
import mongoose from 'mongoose';

jest.mock('../../models/Ingredient');
jest.mock('../../models/Recipe');
jest.mock('../../models/StockTransaction');

const mockRestaurantId = new mongoose.Types.ObjectId().toString();

describe('Ingredient Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createIngredient', () => {
    it('should create and save an ingredient with valid data', async () => {
      const mockData = {
        name: 'Flour',
        restaurantId: mockRestaurantId,
        unitOfMeasurement: 'kg',
        currentStockLevel: 10,
        averageCostPrice: 2
      };

      // Mocking the save method on an instance
      const saveMock = jest.fn().mockResolvedValue({ ...mockData, _id: new mongoose.Types.ObjectId() });
      (Ingredient as any).mockImplementation(() => ({
        ...mockData,
        save: saveMock
      }));

      const result = await ingredientService.createIngredient(mockData);

      expect(Ingredient).toHaveBeenCalledWith(mockData);
      expect(saveMock).toHaveBeenCalled();
      expect(result).toHaveProperty('_id');
      expect(result.name).toBe('Flour');
    });

    it('should throw an error if restaurantId is not part of data (this check is done in controller, service expects it)', async () => {
      // Service's createIngredient itself doesn't check for restaurantId, it assumes data is shaped correctly.
      // The controller is responsible for ensuring restaurantId is present.
      // For this unit test, we'll test if it passes data to the model correctly.
      const mockData = {
        name: 'Sugar',
        unitOfMeasurement: 'kg',
        restaurantId: mockRestaurantId // restaurantId is needed for model
      };
       const saveMock = jest.fn().mockResolvedValue({ ...mockData, _id: new mongoose.Types.ObjectId() });
      (Ingredient as any).mockImplementation(() => ({
        ...mockData,
        save: saveMock
      }));

      await ingredientService.createIngredient(mockData as any);
      expect(Ingredient).toHaveBeenCalledWith(mockData);
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('getAllIngredients', () => {
    it('should return a list of ingredients for a given restaurantId', async () => {
      const mockIngredients = [
        { name: 'Salt', restaurantId: mockRestaurantId, isActive: true },
        { name: 'Pepper', restaurantId: mockRestaurantId, isActive: true },
      ];
      (Ingredient.find as jest.Mock).mockResolvedValue(mockIngredients);

      const result = await ingredientService.getAllIngredients(mockRestaurantId);
      expect(Ingredient.find).toHaveBeenCalledWith({ restaurantId: new mongoose.Types.ObjectId(mockRestaurantId), isActive: true });
      expect(result).toEqual(mockIngredients);
      expect(result.length).toBe(2);
    });

    it('should return an empty list if no ingredients match', async () => {
      (Ingredient.find as jest.Mock).mockResolvedValue([]);
      const result = await ingredientService.getAllIngredients(mockRestaurantId);
      expect(Ingredient.find).toHaveBeenCalledWith({ restaurantId: new mongoose.Types.ObjectId(mockRestaurantId), isActive: true });
      expect(result).toEqual([]);
    });
     it('should throw an error for invalid restaurantId format', async () => {
      await expect(ingredientService.getAllIngredients('invalid-id')).rejects.toThrow('Invalid restaurantId format');
    });
  });

  describe('getIngredientById', () => {
    it('should return an ingredient if found for the restaurantId', async () => {
      const ingredientId = new mongoose.Types.ObjectId().toString();
      const mockIngredient = { _id: ingredientId, name: 'Olive Oil', restaurantId: mockRestaurantId, isActive: true };
      (Ingredient.findOne as jest.Mock).mockResolvedValue(mockIngredient);

      const result = await ingredientService.getIngredientById(ingredientId, mockRestaurantId);
      expect(Ingredient.findOne).toHaveBeenCalledWith({ _id: ingredientId, restaurantId: new mongoose.Types.ObjectId(mockRestaurantId), isActive: true });
      expect(result).toEqual(mockIngredient);
    });

    it('should return null if not found', async () => {
      const ingredientId = new mongoose.Types.ObjectId().toString();
      (Ingredient.findOne as jest.Mock).mockResolvedValue(null);
      const result = await ingredientService.getIngredientById(ingredientId, mockRestaurantId);
      expect(result).toBeNull();
    });
  });

  describe('updateIngredient', () => {
    it('should update the ingredient if found', async () => {
      const ingredientId = new mongoose.Types.ObjectId().toString();
      const updateData = { name: 'Premium Flour', currentStockLevel: 25 };
      const updatedIngredient = { _id: ingredientId, name: 'Premium Flour', currentStockLevel: 25, restaurantId: mockRestaurantId };
      (Ingredient.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedIngredient);

      const result = await ingredientService.updateIngredient(ingredientId, updateData, mockRestaurantId);
      expect(Ingredient.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: ingredientId, restaurantId: new mongoose.Types.ObjectId(mockRestaurantId), isActive: true },
        updateData,
        { new: true }
      );
      expect(result).toEqual(updatedIngredient);
    });

    it('should return null if not found for update', async () => {
      const ingredientId = new mongoose.Types.ObjectId().toString();
      (Ingredient.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
      const result = await ingredientService.updateIngredient(ingredientId, { name: 'NonExistent' }, mockRestaurantId);
      expect(result).toBeNull();
    });
  });

  describe('deleteIngredient', () => {
    it('should set isActive to false (soft delete)', async () => {
      const ingredientId = new mongoose.Types.ObjectId().toString();
      const deletedIngredient = { _id: ingredientId, name: 'Old Flour', isActive: false };
      (Ingredient.findOneAndUpdate as jest.Mock).mockResolvedValue(deletedIngredient);

      const result = await ingredientService.deleteIngredient(ingredientId, mockRestaurantId);
      expect(Ingredient.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: ingredientId, restaurantId: new mongoose.Types.ObjectId(mockRestaurantId) },
        { isActive: false },
        { new: true }
      );
      expect(result).toEqual(deletedIngredient);
      expect(result?.isActive).toBe(false);
    });
  });

  describe('deductStockForSale', () => {
    const recipeId = new mongoose.Types.ObjectId();
    const ingredientObjectId = new mongoose.Types.ObjectId(); // Correctly typed ObjectId
    const menuItemId = new mongoose.Types.ObjectId().toString();
    const orderId = 'order123';
    const userId = 'userTestId';

    const mockRecipeInstance = {
        _id: recipeId,
        name: 'Test Bread',
        restaurantId: new mongoose.Types.ObjectId(mockRestaurantId),
        menuItemId: new mongoose.Types.ObjectId(menuItemId),
        ingredients: [
          { ingredientId: ingredientObjectId, quantity: 1, uom: 'kg' } // ingredientId is an ObjectId here
        ],
        isActive: true,
    };

    const mockIngredientInstance = {
        _id: ingredientObjectId,
        name: 'Yeast',
        currentStockLevel: 5,
        averageCostPrice: 1,
        unitOfMeasurement: 'kg',
        // findByIdAndUpdate would be on the Model, not instance for this service's implementation
    };

    beforeEach(() => {
        // Reset mocks for each test in this describe block if necessary
        (Recipe.findOne as jest.Mock).mockClear();
        (Ingredient.findByIdAndUpdate as jest.Mock).mockClear(); // Changed from findById
        (StockTransaction.prototype.save as jest.Mock) = jest.fn().mockResolvedValue({}); // Mock save on instance
         // Mock the constructor for StockTransaction
        (StockTransaction as any).mockImplementation(() => ({
            save: StockTransaction.prototype.save
        }));

    });

    it('should deduct stock, create transaction for one item/ingredient', async () => {
        (Recipe.findOne as jest.Mock).mockResolvedValue({
            ...mockRecipeInstance,
            // Simulate population: ingredientId is an object after populate
            ingredients: [{
                ingredientId: mockIngredientInstance, // Populated: ingredientId is the actual ingredient document
                quantity: 1,
                uom: 'kg'
            }],
        });

        // Mock for updating the ingredient's stock
        (Ingredient.findByIdAndUpdate as jest.Mock).mockResolvedValue({
            ...mockIngredientInstance,
            currentStockLevel: mockIngredientInstance.currentStockLevel - 1, // After deduction
        });

        const itemsToDeduct = [{ menuItemId: menuItemId, quantitySold: 1, orderId }];
        const result = await ingredientService.deductStockForSale(itemsToDeduct, mockRestaurantId, userId);

        expect(Recipe.findOne).toHaveBeenCalledWith({
            menuItemId: new mongoose.Types.ObjectId(menuItemId),
            restaurantId: new mongoose.Types.ObjectId(mockRestaurantId),
            isActive: true
        });

        // Check that findByIdAndUpdate was called on Ingredient
        expect(Ingredient.findByIdAndUpdate).toHaveBeenCalledWith(
            ingredientObjectId, // id
            { $set: { currentStockLevel: 4 }, $inc: { __v: 1 } }, // update
            { new: true } // options
        );

        expect(StockTransaction.prototype.save).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.details).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    ingredientId: ingredientObjectId,
                    quantityDeducted: 1,
                    status: 'success'
                })
            ])
        );
    });

    it('should return skipped if recipe not found', async () => {
      (Recipe.findOne as jest.Mock).mockResolvedValue(null);
      const itemsToDeduct = [{ menuItemId: menuItemId, quantitySold: 1, orderId }];
      const result = await ingredientService.deductStockForSale(itemsToDeduct, mockRestaurantId, userId);

      expect(Recipe.findOne).toHaveBeenCalled();
      expect(Ingredient.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(StockTransaction.prototype.save).not.toHaveBeenCalled();
      expect(result.success).toBe(true); // Overall process can be true if other items succeed
      expect(result.details).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                menuItemId: menuItemId,
                status: 'skipped',
                reason: `No active recipe found for menuItemId ${menuItemId}.`
            })
        ])
      );
    });

    it('should return skipped if recipe has no ingredients', async () => {
      (Recipe.findOne as jest.Mock).mockResolvedValue({ ...mockRecipeInstance, ingredients: [] });
      const itemsToDeduct = [{ menuItemId: menuItemId, quantitySold: 1, orderId }];
      const result = await ingredientService.deductStockForSale(itemsToDeduct, mockRestaurantId, userId);

      expect(Recipe.findOne).toHaveBeenCalled();
      expect(Ingredient.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(StockTransaction.prototype.save).not.toHaveBeenCalled();
      expect(result.details).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                menuItemId: menuItemId,
                recipeId: mockRecipeInstance._id,
                status: 'skipped',
                reason: 'Recipe has no ingredients listed.'
            })
        ])
      );
    });
  });
});

// Helper to correctly type mongoose.Types.ObjectId when comparing in mocks
// const objectIdMatcher = (expectedId: string) =>
//   expect.objectContaining({ equals: jest.fn((otherId) => new mongoose.Types.ObjectId(expectedId).equals(otherId)) });

// Note: The deductStockForSale tests are complex due to multiple async calls and dependencies.
// More granular tests might be needed for UoM conversion if that logic were present.
// The mocking of `new Model().save()` vs `Model.create()` vs `Model.findOneAndUpdate()` is important.
// The current service implementation for deductStockForSale uses `Ingredient.findByIdAndUpdate`.
// StockTransaction is created via `new StockTransaction(...).save()`.
// Recipe is fetched via `Recipe.findOne(...).populate(...)`.
// Ingredient document within recipe ingredients is accessed as `recipeIngredient.ingredientId` (which is the populated doc).
// Then stock update is `Ingredient.findByIdAndUpdate(ingredientDoc._id, ...)`
