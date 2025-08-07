import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app } from '../app'; // Adjust path to main app file if necessary
import Promotion from '../models/Promotion'; // Adjust path
import Restaurant from '../models/Restaurant'; // Adjust path, needed for creating test restaurantId

// Helper function to get an admin token (placeholder - needs actual implementation or mocking)
// This is a simplified placeholder. In a real scenario, you would:
// 1. Authenticate a test admin user against your auth service/logic.
// 2. Or, if testing in isolation, mock the auth middleware.
const getAdminAuthToken = async (): Promise<string> => {
  // Placeholder: If you have a test utility to generate tokens or a known test admin token, use it.
  // For now, returning a dummy token. This will likely cause auth tests to fail
  // unless the auth middleware is mocked or bypassed in a test environment.
  // A more robust solution would involve calling the auth service if it's running,
  // or using a dedicated test helper that seeds an admin user and logs them in.
  // console.warn('Using dummy admin token for tests. Auth middleware might block this.');
  // This part is crucial and highly dependent on the actual auth setup.
  // For the worker: If there's an existing way to get a test admin token (e.g. from other tests or a utility function),
  // please try to use that. Otherwise, this dummy token will be used.
  // A common pattern is to have a test setup script that creates a test admin and stores its token.
  return 'DUMMY_ADMIN_JWT_TOKEN_REPLACE_IF_POSSIBLE';
};

describe('Promotion API Endpoints Test', () => {
  let testRestaurantId: mongoose.Types.ObjectId;
  let adminToken: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/inseat-test-promotions-api';
    await mongoose.connect(mongoUri);
    adminToken = await getAdminAuthToken(); // Get token once for all admin tests

    // Create a dummy restaurant for association
    const restaurant = new Restaurant({
      name: 'Test Restaurant for Promotions',
      locations: [{ address: '123 Test St', coordinates: { latitude: 0, longitude: 0 } }],
      adminIds: [new Types.ObjectId()] // Dummy admin
    });
    const savedRestaurant = await restaurant.save();
    testRestaurantId = savedRestaurant._id;
  });

  afterAll(async () => {
    await Promotion.deleteMany({});
    await Restaurant.deleteMany({});
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Promotion.deleteMany({});
  });

  // --- Customer-facing Promotions ---
  describe('GET /api/promotions/splash', () => {
    it('should return active, current, splash-enabled promotions for a restaurant', async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      await Promotion.create([
        { title: 'Active Splash Promo', restaurantId: testRestaurantId, isActive: true, displayOnSplash: true, startDate: yesterday, endDate: tomorrow, imageUrl: 'url1' },
        { title: 'Inactive Splash Promo', restaurantId: testRestaurantId, isActive: false, displayOnSplash: true, startDate: yesterday, endDate: tomorrow, imageUrl: 'url2' },
        { title: 'Active Non-Splash Promo', restaurantId: testRestaurantId, isActive: true, displayOnSplash: false, startDate: yesterday, endDate: tomorrow, imageUrl: 'url3' },
        { title: 'Expired Splash Promo', restaurantId: testRestaurantId, isActive: true, displayOnSplash: true, startDate: new Date(new Date().setDate(now.getDate() - 2)), endDate: yesterday, imageUrl: 'url4' },
        { title: 'Future Splash Promo', restaurantId: testRestaurantId, isActive: true, displayOnSplash: true, startDate: tomorrow, endDate: new Date(new Date().setDate(now.getDate() + 2)), imageUrl: 'url5' },
        { title: 'Active Splash Promo Other Restaurant', restaurantId: new Types.ObjectId(), isActive: true, displayOnSplash: true, startDate: yesterday, endDate: tomorrow, imageUrl: 'url6' },
      ]);

      const response = await request(app)
        .get('/api/promotions/splash')
        .query({ restaurantId: testRestaurantId.toString() });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Active Splash Promo');
    });

    it('should return 400 if restaurantId is missing', async () => {
      const response = await request(app).get('/api/promotions/splash');
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Restaurant ID is required');
    });
  });

  // --- Admin Promotions ---
  describe('Admin Promotion CRUD Operations', () => {
    let samplePromotionId: string | null = null; // Initialize to null

    const validPromotionData = {
      title: 'Admin Test Promotion',
      description: 'A promotion created via admin API',
      imageUrl: 'http://example.com/admin-promo.png',
      // restaurantId will be set to testRestaurantId
      isActive: true,
      displayOnSplash: true,
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
    };

    it('POST /api/admin/promotions - should create a new promotion', async () => {
      const response = await request(app)
        .post('/api/admin/promotions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPromotionData, restaurantId: testRestaurantId.toString() });
      
      // If auth is not properly mocked/handled, this might be 401 or 403
      // For now, we expect 201 and let it fail if auth is the issue.
      expect(response.status).toBe(201); 
      expect(response.body.title).toBe(validPromotionData.title);
      expect(response.body.restaurantId).toBe(testRestaurantId.toString());
      samplePromotionId = response.body._id; // Save for later tests
    });

    it('POST /api/admin/promotions - should return 401 if no token is provided', async () => {
        const response = await request(app)
            .post('/api/admin/promotions')
            .send({ ...validPromotionData, restaurantId: testRestaurantId.toString() });
        expect(response.status).toBe(401); // Or 403 depending on middleware order and if auth is hit first
    });
    
    it('POST /api/admin/promotions - should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/admin/promotions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Only Title', restaurantId: testRestaurantId.toString() }); // Missing other required fields
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeInstanceOf(Array);
      // Add more specific error checks if needed, e.g., for imageUrl, startDate, endDate
    });

    it('GET /api/admin/promotions - should get all promotions for a restaurant', async () => {
      // Create a promotion first if not created by POST test or ensure one exists
      if (!samplePromotionId) {
        const promo = await Promotion.create({ ...validPromotionData, restaurantId: testRestaurantId });
        samplePromotionId = promo._id.toString();
      }

      const response = await request(app)
        .get('/api/admin/promotions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ restaurantId: testRestaurantId.toString() });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      const currentPromotions = await Promotion.find({ restaurantId: testRestaurantId }).lean();
      expect(response.body.length).toBe(currentPromotions.length); // Ensure it matches actual count
      expect(response.body.some((p: any) => p._id === samplePromotionId)).toBe(true);
    });
    
    it('GET /api/admin/promotions/:promotionId - should get a promotion by ID', async () => {
      if (!samplePromotionId) { 
        const promo = await Promotion.create({ ...validPromotionData, restaurantId: testRestaurantId });
        samplePromotionId = promo._id.toString();
      }
      const response = await request(app)
        .get(`/api/admin/promotions/${samplePromotionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(samplePromotionId);
      expect(response.body.title).toBe(validPromotionData.title);
    });

    it('PUT /api/admin/promotions/:promotionId - should update a promotion', async () => {
      if (!samplePromotionId) { 
        const promo = await Promotion.create({ ...validPromotionData, restaurantId: testRestaurantId });
        samplePromotionId = promo._id.toString();
      }
      const updatedData = { title: 'Updated Admin Promo Title', isActive: false };
      const response = await request(app)
        .put(`/api/admin/promotions/${samplePromotionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updatedData.title);
      expect(response.body.isActive).toBe(false);
    });

    it('DELETE /api/admin/promotions/:promotionId - should delete a promotion', async () => {
      if (!samplePromotionId) { 
        const promo = await Promotion.create({ ...validPromotionData, restaurantId: testRestaurantId });
        samplePromotionId = promo._id.toString();
      }
      const response = await request(app)
        .delete(`/api/admin/promotions/${samplePromotionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Promotion deleted successfully');

      // Verify it's actually deleted
      const getResponse = await request(app)
        .get(`/api/admin/promotions/${samplePromotionId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getResponse.status).toBe(404);
      samplePromotionId = null; 
    });
  });
});
