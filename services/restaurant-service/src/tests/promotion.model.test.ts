import mongoose, { Types } from 'mongoose';
import Promotion, { IPromotion } from '../models/Promotion'; // Adjust path if necessary

describe('Promotion Model Test', () => {
  // Connect to a test database before all tests
  beforeAll(async () => {
    // Consider using a separate test database URI from environment variables
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/inseat-test-promotions-model';
    await mongoose.connect(mongoUri);
  });

  // Clear the Promotion collection before each test
  beforeEach(async () => {
    await Promotion.deleteMany({});
  });

  // Disconnect from the database after all tests
  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should create and save a promotion successfully', async () => {
    const restaurantId = new Types.ObjectId();
    const promotionData: Partial<IPromotion> = {
      title: 'Summer Sale',
      description: 'Get 20% off on all summer items!',
      imageUrl: 'http://example.com/summer-sale.jpg',
      restaurantId: restaurantId,
      isActive: true,
      displayOnSplash: true,
      startDate: new Date('2024-07-01T00:00:00.000Z'),
      endDate: new Date('2024-07-31T23:59:59.000Z'),
    };
    const promotion = new Promotion(promotionData);
    const savedPromotion = await promotion.save();

    expect(savedPromotion._id).toBeDefined();
    expect(savedPromotion.title).toBe(promotionData.title);
    expect(savedPromotion.description).toBe(promotionData.description);
    expect(savedPromotion.imageUrl).toBe(promotionData.imageUrl);
    expect(savedPromotion.restaurantId).toEqual(restaurantId);
    expect(savedPromotion.isActive).toBe(true);
    expect(savedPromotion.displayOnSplash).toBe(true);
    expect(savedPromotion.startDate.toISOString()).toBe('2024-07-01T00:00:00.000Z');
    expect(savedPromotion.endDate.toISOString()).toBe('2024-07-31T23:59:59.000Z');
    expect(savedPromotion.createdAt).toBeDefined();
    expect(savedPromotion.updatedAt).toBeDefined();
  });

  it('should require title, imageUrl, restaurantId, startDate, and endDate', async () => {
    const promotionData: Partial<IPromotion> = {
      description: 'A promotion missing required fields',
    };
    let err: any;
    try {
      const promotion = new Promotion(promotionData);
      await promotion.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.title).toBeDefined();
    expect(err.errors.imageUrl).toBeDefined();
    expect(err.errors.restaurantId).toBeDefined();
    expect(err.errors.startDate).toBeDefined();
    expect(err.errors.endDate).toBeDefined();
  });

  it('should default isActive and displayOnSplash to true if not provided', async () => {
    const restaurantId = new Types.ObjectId();
    const promotionData: Partial<IPromotion> = {
      title: 'Default Value Test',
      imageUrl: 'http://example.com/default-test.jpg',
      restaurantId: restaurantId,
      startDate: new Date('2024-08-01T00:00:00.000Z'),
      endDate: new Date('2024-08-31T23:59:59.000Z'),
    };
    const promotion = new Promotion(promotionData);
    const savedPromotion = await promotion.save();

    expect(savedPromotion.isActive).toBe(true);
    expect(savedPromotion.displayOnSplash).toBe(true);
  });

  // Add more tests as needed:
  // - Test for invalid data types (e.g., non-date for startDate)
  // - Test for index constraints if applicable beyond basic validation
});
