"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = require("../app");
const Restaurant_1 = __importDefault(require("../../../restaurant-service/src/models/Restaurant"));
const menu_model_1 = __importDefault(require("../models/menu.model"));
describe('Restaurant Service API Tests', () => {
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-test');
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield mongoose_1.default.connection.dropDatabase();
        yield mongoose_1.default.connection.close();
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield Restaurant_1.default.deleteMany({});
        yield menu_model_1.default.deleteMany({});
    }));
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
        test('POST /api/restaurants - Create restaurant', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.app)
                .post('/api/restaurants')
                .send(testRestaurant);
            expect(response.status).toBe(201);
            expect(response.body.name).toBe(testRestaurant.name);
        }));
        test('GET /api/restaurants - Get all restaurants', () => __awaiter(void 0, void 0, void 0, function* () {
            yield Restaurant_1.default.create(testRestaurant);
            const response = yield (0, supertest_1.default)(app_1.app)
                .get('/api/restaurants');
            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe(testRestaurant.name);
        }));
    });
    describe('Venue Endpoints', () => {
        let restaurantId;
        const testVenue = {
            name: 'Test Venue',
            description: 'A test venue',
            capacity: 100
        };
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            const restaurant = yield Restaurant_1.default.create({
                name: 'Test Restaurant',
                description: 'A test restaurant'
            });
            restaurantId = restaurant._id.toString();
        }));
        test('POST /api/venues - Create venue', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.app)
                .post(`/api/restaurants/${restaurantId}/venues`)
                .send(testVenue);
            expect(response.status).toBe(201);
            expect(response.body.name).toBe(testVenue.name);
        }));
        test('GET /api/venues - Get all venues', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app_1.app)
                .post(`/api/restaurants/${restaurantId}/venues`)
                .send(testVenue);
            const response = yield (0, supertest_1.default)(app_1.app)
                .get(`/api/restaurants/${restaurantId}/venues`);
            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe(testVenue.name);
        }));
    });
    describe('Table Endpoints', () => {
        let restaurantId;
        let venueId;
        const testTable = {
            number: 'T1',
            capacity: 4,
            type: 'REGULAR'
        };
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            const restaurant = yield Restaurant_1.default.create({
                name: 'Test Restaurant',
                venues: [{
                        name: 'Test Venue',
                        capacity: 100
                    }]
            });
            restaurantId = restaurant._id.toString();
            venueId = restaurant.venues[0]._id.toString();
        }));
        test('POST /api/tables - Create table', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.app)
                .post(`/api/restaurants/${restaurantId}/venues/${venueId}/tables`)
                .send(testTable);
            expect(response.status).toBe(201);
            expect(response.body.number).toBe(testTable.number);
        }));
        test('GET /api/tables - Get all tables', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app_1.app)
                .post(`/api/restaurants/${restaurantId}/venues/${venueId}/tables`)
                .send(testTable);
            const response = yield (0, supertest_1.default)(app_1.app)
                .get(`/api/restaurants/${restaurantId}/venues/${venueId}/tables`);
            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].number).toBe(testTable.number);
        }));
    });
    describe('Menu Endpoints', () => {
        let restaurantId;
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
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            const restaurant = yield Restaurant_1.default.create({
                name: 'Test Restaurant'
            });
            restaurantId = restaurant._id.toString();
        }));
        test('POST /api/menus - Create menu', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.app)
                .post(`/api/restaurants/${restaurantId}/menus`)
                .send(testMenu);
            expect(response.status).toBe(201);
            expect(response.body.name).toBe(testMenu.name);
        }));
        test('GET /api/menus - Get all menus', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app_1.app)
                .post(`/api/restaurants/${restaurantId}/menus`)
                .send(testMenu);
            const response = yield (0, supertest_1.default)(app_1.app)
                .get(`/api/restaurants/${restaurantId}/menus`);
            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe(testMenu.name);
        }));
    });
    describe('QR Code Endpoints', () => {
        let restaurantId;
        let venueId;
        let tableId;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            const restaurant = yield Restaurant_1.default.create({
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
        }));
        test('POST /api/tables/:tableId/qrcode - Generate QR code', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.app)
                .post(`/api/restaurants/${restaurantId}/venues/${venueId}/tables/${tableId}/qrcode`);
            expect(response.status).toBe(201);
            expect(response.body.qrCode).toBeDefined();
        }));
        test('GET /api/tables/:tableId/qrcode - Get QR code', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app_1.app)
                .post(`/api/restaurants/${restaurantId}/venues/${venueId}/tables/${tableId}/qrcode`);
            const response = yield (0, supertest_1.default)(app_1.app)
                .get(`/api/restaurants/${restaurantId}/venues/${venueId}/tables/${tableId}/qrcode`);
            expect(response.status).toBe(200);
            expect(response.body.qrCode).toBeDefined();
        }));
    });
});
