// @ts-nocheck
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app';
import Restaurant, { ITable } from '../../../restaurant-service/src/models/Restaurant';
import Menu from '../models/menu.model';

describe('Restaurant Service API Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Restaurant.deleteMany({});
    await Menu.deleteMany({});
  });

  describe('Restaurant Endpoints', () => {
    const testRestaurant = {
      name: 'Test Restaurant',
      description: 'A test restaurant',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        country: 'Test Country',
        postalCode: '12345'
      },
      contact: {
        phone: '123-456-7890',
        email: 'test@test.com',
        website: 'www.test.com'
      },
      cuisine: ['Test Cuisine'],
      priceRange: '$$',
      features: ['Test Feature']
    };

    test('POST /api/restaurants - Create restaurant', async () => {
      const response = await request(app)
        .post('/api/restaurants')
        .send(testRestaurant);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(testRestaurant.name);
    });

    test('GET /api/restaurants - Get all restaurants', async () => {
      await Restaurant.create(testRestaurant);

      const response = await request(app)
        .get('/api/restaurants');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe(testRestaurant.name);
    });
  });

  describe('Venue Endpoints', () => {
    let restaurantId: string;
    const testVenue = {
      name: 'Test Venue',
      description: 'A test venue',
      capacity: 100
    };

    beforeEach(async () => {
      const restaurant = await Restaurant.create({
        name: 'Test Restaurant',
        description: 'A test restaurant'
      });
      restaurantId = restaurant._id.toString();
    });

    test('POST /api/venues - Create venue', async () => {
      const response = await request(app)
        .post(`/api/restaurants/${restaurantId}/venues`)
        .send(testVenue);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(testVenue.name);
    });

    test('GET /api/venues - Get all venues', async () => {
      await request(app)
        .post(`/api/restaurants/${restaurantId}/venues`)
        .send(testVenue);

      const response = await request(app)
        .get(`/api/restaurants/${restaurantId}/venues`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe(testVenue.name);
    });
  });

  describe('Table Endpoints', () => {
    let restaurantId: string;
    let venueId: string;
    const testTable = {
      number: 'T1',
      capacity: 4,
      type: 'REGULAR'
    };

    beforeEach(async () => {
      const restaurant = await Restaurant.create({
        name: 'Test Restaurant',
        venues: [{
          name: 'Test Venue',
          capacity: 100
        }]
      });
      restaurantId = restaurant._id.toString();
      venueId = restaurant.venues[0]._id.toString();
    });

    test('POST /api/tables - Create table', async () => {
      const response = await request(app)
        .post(`/api/restaurants/${restaurantId}/venues/${venueId}/tables`)
        .send(testTable);

      expect(response.status).toBe(201);
      expect(response.body.number).toBe(testTable.number);
    });

    test('GET /api/tables - Get all tables', async () => {
      await request(app)
        .post(`/api/restaurants/${restaurantId}/venues/${venueId}/tables`)
        .send(testTable);

      const response = await request(app)
        .get(`/api/restaurants/${restaurantId}/venues/${venueId}/tables`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].number).toBe(testTable.number);
    });
  });

  describe('Menu Endpoints', () => {
    let restaurantId: string;
    const testMenu = {
      name: 'Test Menu',
      categories: [{
        name: 'Test Category',
        items: [{
          name: 'Test Item',
          description: 'A test item',
          price: 9.99,
          category: 'Test Category'
        }]
      }]
    };

    beforeEach(async () => {
      const restaurant = await Restaurant.create({
        name: 'Test Restaurant'
      });
      restaurantId = restaurant._id.toString();
    });

    test('POST /api/menus - Create menu', async () => {
      const response = await request(app)
        .post(`/api/restaurants/${restaurantId}/menus`)
        .send(testMenu);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(testMenu.name);
    });

    test('GET /api/menus - Get all menus', async () => {
      await request(app)
        .post(`/api/restaurants/${restaurantId}/menus`)
        .send(testMenu);

      const response = await request(app)
        .get(`/api/restaurants/${restaurantId}/menus`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe(testMenu.name);
    });
  });

  describe('QR Code Endpoints', () => {
    let restaurantId: string;
    let venueId: string;
    let tableId: string;

    beforeEach(async () => {
      const restaurant = await Restaurant.create({
        name: 'Test Restaurant',
        venues: [{
          name: 'Test Venue',
          capacity: 100,
          tables: [{
            number: 'T1',
            capacity: 4,
            type: 'REGULAR'
          }]
        }]
      });
      restaurantId = restaurant._id.toString();
      venueId = restaurant.venues[0]._id.toString();
      tableId = restaurant.venues[0].tables[0]._id.toString();
    });

    test('POST /api/tables/:tableId/qrcode - Generate QR code', async () => {
      const response = await request(app)
        .post(`/api/restaurants/${restaurantId}/venues/${venueId}/tables/${tableId}/qrcode`);

      expect(response.status).toBe(201);
      expect(response.body.qrCode).toBeDefined();
    });

    test('GET /api/tables/:tableId/qrcode - Get QR code', async () => {
      await request(app)
        .post(`/api/restaurants/${restaurantId}/venues/${venueId}/tables/${tableId}/qrcode`);

      const response = await request(app)
        .get(`/api/restaurants/${restaurantId}/venues/${venueId}/tables/${tableId}/qrcode`);

      expect(response.status).toBe(200);
      expect(response.body.qrCode).toBeDefined();
    });
  });
});
