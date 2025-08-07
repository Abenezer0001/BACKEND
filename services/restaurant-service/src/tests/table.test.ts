import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import Table, { ITable, ITableFilterParams, ITableQRData } from '../models/Table';
import Restaurant from '../models/Restaurant';
import TableType from '../models/TableType';
import Venue from '../models/Venue';
import { Document } from 'mongoose';

// Mock data
const validRestaurantId = new mongoose.Types.ObjectId();
const validVenueId = new mongoose.Types.ObjectId();
const validTableTypeId = new mongoose.Types.ObjectId();
const validTableId = new mongoose.Types.ObjectId();

// Define interfaces for test objects
interface TestObjects {
  restaurant: Document;
  venue: Document;
  tableType: Document;
  table: Document;
  tables: Document[];
}

// Helper function to simulate a delay between operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Setup and teardown
let mongoServer: MongoMemoryServer;
let testObjects: TestObjects;

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create indexes
  await Table.ensureIndexes();
  
  // Seed test data
  testObjects = await seedTestData();
});

// Setup fake timer for rate limit tests
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(async () => {
  // Reset rate limiting between tests
  jest.advanceTimersByTime(60 * 1000); // Advance time by rate limit window (60s)
  jest.useRealTimers();
  
  // Reset table states that might have been modified
  try {
    // Reset QR codes
    await Table.updateMany({}, { qrCode: '' });
    
    // Reset occupied and active status to default values
    await Table.updateMany(
      { _id: { $in: testObjects.tables.map(t => t._id) } },
      { isOccupied: false, isActive: true }
    );
  } catch (error) {
    console.error('Error in test cleanup:', error);
  }
});

afterAll(async () => {
  // Clean up all data
  await Table.deleteMany({});
  await TableType.deleteMany({});
  await Venue.deleteMany({});
  await Restaurant.deleteMany({});
  
  await mongoose.disconnect();
  await mongoServer.stop();
});

async function seedTestData(): Promise<TestObjects> {
  // Create a test restaurant
  const restaurant = new Restaurant({
    _id: validRestaurantId,
    name: 'Test Restaurant',
    venues: [validVenueId],
    tables: [validTableId]
  });
  await restaurant.save();

  // Create a test venue
  const venue = new Venue({
    _id: validVenueId,
    name: 'Test Venue',
    restaurantId: validRestaurantId
  });
  await venue.save();

  // Create a test table type
  const tableType = new TableType({
    _id: validTableTypeId,
    name: 'Regular',
    restaurantId: validRestaurantId
  });
  await tableType.save();

  // Create a test table
  const table = new Table({
    _id: validTableId,
    number: 'T101',
    venueId: validVenueId,
    restaurantId: validRestaurantId,
    capacity: 4,
    isOccupied: false,
    isActive: true,
    tableTypeId: validTableTypeId,
    qrCode: ''
  });
  await table.save();
  
  // Create additional test tables with various properties for filtering tests
  const additionalTables = [
    // Active, occupied table
    new Table({
      number: 'T102',
      venueId: validVenueId,
      restaurantId: validRestaurantId,
      capacity: 2,
      isOccupied: true,
      isActive: true,
      tableTypeId: validTableTypeId
    }),
    // Inactive table
    new Table({
      number: 'T103',
      venueId: validVenueId,
      restaurantId: validRestaurantId,
      capacity: 6,
      isOccupied: false,
      isActive: false,
      tableTypeId: validTableTypeId
    }),
    // Different venue table
    new Table({
      number: 'T201',
      venueId: new mongoose.Types.ObjectId(),
      restaurantId: validRestaurantId,
      capacity: 8,
      isOccupied: false,
      isActive: true,
      tableTypeId: validTableTypeId
    })
  ];
  
  const savedTables = await Promise.all(
    additionalTables.map(table => table.save())
  );
  
  return {
    restaurant,
    venue,
    tableType,
    table,
    tables: [table, ...savedTables]
  };
}

// Adjust API paths to match actual implementation
const API_PREFIX = '/api'; // Adjust this to match your actual API prefix

// Test cases to verify table filtering functionality
describe('Table Filtering', () => {
  // Test basic filtering
  it('should return all active tables when no filters are provided', async () => {
    const response = await request(app).get(`${API_PREFIX}/tables/filtered`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test restaurant-specific filtering
  it('should return tables for a specific restaurant', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ restaurantId: validRestaurantId.toString() });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test venue-specific filtering
  it('should return tables for a specific venue', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        restaurantId: validRestaurantId.toString(),
        venueId: validVenueId.toString() 
      });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test pagination and sorting
  it('should handle pagination and sorting', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        limit: 10,
        page: 1,
        sortBy: 'number:asc'
      });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(10);
  });

  // Test filtering by active status
  it('should filter by active status', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ isActive: 'true' });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.every((table: any) => table.isActive === true)).toBe(true);
  });

  // Test filtering by occupied status
  it('should filter by occupied status', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ isOccupied: 'false' });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.every((table: any) => table.isOccupied === false)).toBe(true);
  });

  // Test error handling
  it('should handle invalid query parameters', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        restaurantId: 'invalid-id',
        limit: 'not-a-number'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  // Test inclusion of metadata 
  it('should include metadata when requested', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ includeMetadata: 'true' });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // If tables are returned, check for metadata fields
    if (response.body.length > 0) {
      const table = response.body[0];
      // Check for metadata fields like fullName
      expect(table.fullName).toBeDefined();
    }
  });

  // Test combined filtering
  it('should support combined filtering criteria', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        restaurantId: validRestaurantId.toString(),
        isActive: 'true',
        isOccupied: 'false',
        sortBy: 'capacity:desc'
      });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check combined filtering results
    response.body.forEach((table: any) => {
      expect(table.restaurantId.toString()).toBe(validRestaurantId.toString());
      expect(table.isActive).toBe(true);
      expect(table.isOccupied).toBe(false);
    });
    
    // Check sorting - capacity should be in descending order
    if (response.body.length > 1) {
      expect(response.body[0].capacity).toBeGreaterThanOrEqual(response.body[1].capacity);
    }
  });

  // Test edge case: empty results
  it('should return empty array for non-existent restaurant', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ restaurantId: nonExistentId.toString() });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  // Test invalid sorting parameters
  it('should handle invalid sorting parameters gracefully', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ sortBy: 'invalidField:asc' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.validFields).toBeDefined(); // Should return valid sort fields
  });

  // Test boundary conditions for pagination
  it('should enforce pagination limits', async () => {
    // Test with excessive limit
    const responseTooLarge = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ limit: 1000 });
    
    // Even with large limit request, response should be capped 
    expect(responseTooLarge.status).toBe(200);
    
    // Test with negative page
    const responseNegativePage = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ page: -1 });
    
    expect(responseNegativePage.status).toBe(400);
    expect(responseNegativePage.body.error).toMatch(/must be a positive number/);
  });

  // Test filtering by capacity range
  it('should filter tables by capacity range', async () => {
    // Create tables with various capacities for testing
    const capacities = [2, 4, 6, 8, 10];
    const tables = [];
    
    for (let i = 0; i < capacities.length; i++) {
      const response = await request(app)
        .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
        .send({
          number: `CAP-${capacities[i]}`,
          capacity: capacities[i],
          tableTypeId: validTableTypeId.toString()
        });
      tables.push(response.body);
    }
    
    // Test minimum capacity filter
    const minCapacityResponse = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        minCapacity: 6,
        restaurantId: validRestaurantId.toString()
      });
    
    expect(minCapacityResponse.status).toBe(200);
    expect(Array.isArray(minCapacityResponse.body)).toBe(true);
    minCapacityResponse.body.forEach((table: any) => {
      expect(table.capacity).toBeGreaterThanOrEqual(6);
    });
    
    // Test maximum capacity filter
    const maxCapacityResponse = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        maxCapacity: 4,
        restaurantId: validRestaurantId.toString()
      });
    
    expect(maxCapacityResponse.status).toBe(200);
    expect(Array.isArray(maxCapacityResponse.body)).toBe(true);
    maxCapacityResponse.body.forEach((table: any) => {
      expect(table.capacity).toBeLessThanOrEqual(4);
    });
    
    // Test capacity range filter
    const rangeResponse = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        minCapacity: 4,
        maxCapacity: 8,
        restaurantId: validRestaurantId.toString()
      });
    
    expect(rangeResponse.status).toBe(200);
    expect(Array.isArray(rangeResponse.body)).toBe(true);
    rangeResponse.body.forEach((table: any) => {
      expect(table.capacity).toBeGreaterThanOrEqual(4);
      expect(table.capacity).toBeLessThanOrEqual(8);
    });
  });

  // Test filtering by creation date
  it('should filter tables by creation date', async () => {
    // Create a new table with current timestamp
    const currentDate = new Date();
    const response = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: `DATE-TEST-${Date.now()}`,
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    
    // Format date strings for query parameters
    const yesterdayStr = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrowStr = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
    
    // Test creation date range filter
    const dateRangeResponse = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        createdAfter: yesterdayStr,
        createdBefore: tomorrowStr,
        restaurantId: validRestaurantId.toString()
      });
    
    expect(dateRangeResponse.status).toBe(200);
    expect(Array.isArray(dateRangeResponse.body)).toBe(true);
    
    // The new table should be in the results
    const tableIds = dateRangeResponse.body.map((t: any) => t._id);
    expect(tableIds).toContain(response.body._id);
  });

  // Test filtering with multiple venues
  it('should support filtering across multiple venues', async () => {
    // Create a second venue
    const secondVenue = new Venue({
      name: 'Second Test Venue',
      restaurantId: validRestaurantId
    });
    const savedVenue = await secondVenue.save();
    
    // Create tables in both venues
    await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${savedVenue._id}/tables`)
      .send({
        number: 'MULTI-V1',
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    
    await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: 'MULTI-V2',
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    
    // Test multiple venue filtering
    const multiVenueResponse = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ 
        restaurantId: validRestaurantId.toString(),
        venueIds: [validVenueId.toString(), savedVenue._id.toString()].join(',')
      });
    
    expect(multiVenueResponse.status).toBe(200);
    expect(Array.isArray(multiVenueResponse.body)).toBe(true);
    
    // Check that tables from both venues are included
    const venueIds = multiVenueResponse.body.map((t: any) => t.venueId.toString());
    expect(venueIds).toContain(validVenueId.toString());
    expect(venueIds).toContain(savedVenue._id.toString());
  });
});

// Test QR code functionality
describe('QR Code Operations', () => {
  // Reset QR codes before each test to ensure clean state
  beforeEach(async () => {
    await Table.updateMany({}, { qrCode: '' });
    await delay(50); // Small delay to prevent rate limit issues
  });
  // Test QR code generation
  it('should generate a QR code for a valid table', async () => {
    const response = await request(app)
      .post(`${API_PREFIX}/tables/${validTableId}/qrcode`);
    expect(response.status).toBe(200);
    expect(response.body.qrCode).toBeDefined();
    expect(response.body.qrCode).toMatch(/^data:image\//);
  });

  // Test QR code retrieval
  it('should retrieve a generated QR code', async () => {
    // First generate a QR code
    await request(app).post(`${API_PREFIX}/tables/${validTableId}/qrcode`);
    
    await delay(50); // Small delay to ensure QR code is saved
    
    // Then retrieve it
    const response = await request(app).get(`${API_PREFIX}/tables/${validTableId}/qrcode`);
    expect(response.status).toBe(200);
    expect(response.body.qrCode).toBeDefined();
  });

  // Test QR code deletion
  it('should delete a QR code', async () => {
    // First generate a QR code
    await request(app).post(`${API_PREFIX}/tables/${validTableId}/qrcode`);
    
    await delay(50); // Small delay to ensure QR code is saved
    
    // Then delete it
    const deleteResponse = await request(app).delete(`${API_PREFIX}/tables/${validTableId}/qrcode`);
    expect(deleteResponse.status).toBe(204);
    
    await delay(50); // Small delay to ensure deletion is processed
    
    // Verify it's gone
    const getResponse = await request(app).get(`${API_PREFIX}/tables/${validTableId}/qrcode`);
    expect(getResponse.status).toBe(404);
  });

  // Test rate limiting
  it('should enforce rate limits on QR code generation', async () => {
    // Reset any rate limits
    jest.advanceTimersByTime(60 * 1000);
    
    // Make 11 requests (1 over limit)
    const requests = Array(11).fill(null).map(() => 
      request(app).post(`${API_PREFIX}/tables/${validTableId}/qrcode`)
    );
    
    const responses = await Promise.all(requests);
    const lastResponse = responses[responses.length - 1];
    
    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.error).toMatch(/Too many QR code operations/);
  });

  // Test concurrent QR code operations
  it('should handle concurrent QR code operations correctly', async () => {
    // Set up multiple tables first
    const newTables = [];
    for (let i = 1; i <= 3; i++) {
      const createResponse = await request(app)
        .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
        .send({
          number: `CONCURRENT-${i}`,
          capacity: 2,
          tableTypeId: validTableTypeId.toString()
        });
      newTables.push(createResponse.body);
    }

    // Generate QR codes concurrently for different tables
    const concurrentRequests = newTables.map(table => 
      request(app).post(`${API_PREFIX}/tables/${table._id}/qrcode`)
    );
    
    // All should succeed as they're for different tables
    const responses = await Promise.all(concurrentRequests);
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.qrCode).toBeDefined();
    });
  });
});
// Test table operations
describe('Table Operations', () => {
  // Temporary tables created during tests
  let tempTableIds: string[] = [];
  
  // Clean up temp tables after tests
  afterAll(async () => {
    if (tempTableIds.length > 0) {
      await Table.deleteMany({ _id: { $in: tempTableIds } });
    }
  });
  // Test table creation
  it('should create a new table with valid data', async () => {
    const response = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: 'T123',
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    expect(response.status).toBe(201);
    expect(response.body._id).toBeDefined();
    
    // Save temp table ID for cleanup
    if (response.body._id) {
      tempTableIds.push(response.body._id);
    }
  });

  // Test table retrieval
  it('should retrieve a specific table by ID', async () => {
    const response = await request(app).get(`${API_PREFIX}/tables/${validTableId}`);
    expect(response.status).toBe(200);
    expect(response.body._id).toBe(validTableId.toString());
  });

  // Test table update
  it('should update an existing table', async () => {
    const response = await request(app)
      .put(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables/${validTableId}`)
      .send({
        capacity: 6
      });
    expect(response.status).toBe(200);
    expect(response.body.capacity).toBe(6);
  });

  // Test table status update
  it('should update table active status', async () => {
    const response = await request(app)
      .patch(`${API_PREFIX}/tables/${validTableId}/status`)
      .send({
        isActive: false
      });
    expect(response.status).toBe(200);
    expect(response.body.isActive).toBe(false);
  });

  // Test table occupied status update
  it('should update table occupied status', async () => {
    const response = await request(app)
      .patch(`${API_PREFIX}/tables/${validTableId}/occupied`)
      .send({
        isOccupied: true
      });
    expect(response.status).toBe(200);
    expect(response.body.isOccupied).toBe(true);
  });

  // Test validation errors
  it('should reject invalid table data', async () => {
    const response = await request(app)
      .post(`/api/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        // Missing required fields
        capacity: 'not-a-number'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  // Test invalid ObjectId formats
  it('should reject requests with invalid ObjectId formats', async () => {
    // Test invalid restaurant ID
    const responseInvalidRestaurant = await request(app)
      .get(`${API_PREFIX}/restaurants/invalid-id/tables`);
    expect(responseInvalidRestaurant.status).toBe(400);
    
    // Test invalid venue ID
    const responseInvalidVenue = await request(app)
      .get(`${API_PREFIX}/venues/invalid-id/tables`);
    expect(responseInvalidVenue.status).toBe(400);
    
    // Test invalid table ID
    const responseInvalidTable = await request(app)
      .get(`${API_PREFIX}/tables/invalid-id`);
    expect(responseInvalidTable.status).toBe(400);
  });

  // Test missing required fields
  it('should reject table creation with missing required fields', async () => {
    // Test missing number
    const responseMissingNumber = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
        // number is missing
      });
    expect(responseMissingNumber.status).toBe(400);
    expect(responseMissingNumber.body.error).toMatch(/number/i);
    
    // Test missing capacity
    const responseMissingCapacity = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: 'T999',
        tableTypeId: validTableTypeId.toString()
        // capacity is missing
      });
    expect(responseMissingCapacity.status).toBe(400);
    expect(responseMissingCapacity.body.error).toMatch(/capacity/i);
    
    // Test missing tableTypeId
    const responseMissingType = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: 'T999',
        capacity: 4
        // tableTypeId is missing
      });
    expect(responseMissingType.status).toBe(400);
    expect(responseMissingType.body.error).toMatch(/table.*type/i);
  });

  // Test table number uniqueness within a venue
  it('should enforce table number uniqueness within a venue', async () => {
    // Create a table first
    const tableNumber = 'UNIQUE-TEST';
    await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: tableNumber,
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    
    // Try to create another table with the same number in the same venue
    const duplicateResponse = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: tableNumber,
        capacity: 6,
        tableTypeId: validTableTypeId.toString()
      });
    
    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.error).toMatch(/already exists/i);

    // Create a different venue
    const newVenue = new Venue({
      name: 'Another Venue',
      restaurantId: validRestaurantId
    });
    const savedVenue = await newVenue.save();
    
    // Create a table with the same number but in a different venue - should succeed
    const differentVenueResponse = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${savedVenue._id}/tables`)
      .send({
        number: tableNumber,
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    
    expect(differentVenueResponse.status).toBe(201);
  });

  // Test special characters in table numbers
  it('should validate table number format', async () => {
    // Test with invalid characters
    const responseInvalidChars = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: 'T@ble#123!',  // Contains special characters not allowed
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    
    expect(responseInvalidChars.status).toBe(400);
    expect(responseInvalidChars.body.error).toMatch(/valid.*number/i);
    
    // Test with valid format
    const responseValid = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: 'Table-123_XYZ',  // Valid format with allowed characters
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    
    expect(responseValid.status).toBe(201);
  });

  // Test table deletion
  it('should delete a table', async () => {
    // Create a temporary table to delete
    const createResponse = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: 'TEMP-DEL',
        capacity: 2,
        tableTypeId: validTableTypeId.toString()
      });
    
    const tempTableId = createResponse.body._id;
    
    // Delete the table
    const deleteResponse = await request(app)
      .delete(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables/${tempTableId}`);
    expect(deleteResponse.status).toBe(204);
    
    await delay(50); // Small delay to ensure deletion is processed
    
    // Verify it's gone
    const getResponse = await request(app).get(`${API_PREFIX}/tables/${tempTableId}`);
    expect(getResponse.status).toBe(404);
  });
});

// Test deprecated endpoints still work but emit warnings
describe('Deprecated Endpoints', () => {
  // Test old restaurant tables endpoint
  it('should handle legacy restaurant tables endpoint', async () => {
    const response = await request(app)
      .get(`/api/restaurants/${validRestaurantId}/tables`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
  
  // Test old venue tables endpoint
  it('should handle legacy venue tables endpoint', async () => {
    const response = await request(app)
      .get(`/api/venues/${validVenueId}/tables`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

// Test middleware functionality
describe('Middleware Tests', () => {
  // Test validation middleware
  describe('Validation Middleware', () => {
    it('should reject invalid IDs', async () => {
      // Test validateIds middleware with invalid restaurant ID
      const response = await request(app)
        .get(`${API_PREFIX}/restaurants/invalid-id-format/tables`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid.*id/i);
    });
    
    it('should validate table body correctly', async () => {
      // Test validateTableBody middleware with invalid capacity
      const response = await request(app)
        .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
        .send({
          number: 'TEST-VAL',
          capacity: -5, // Negative capacity should be rejected
          tableTypeId: validTableTypeId.toString()
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/capacity/i);
    });
    
    it('should validate filter parameters', async () => {
      // Test validateFilterParams middleware with invalid parameters
      const response = await request(app)
        .get(`${API_PREFIX}/tables/filtered`)
        .query({
          sortBy: 'invalid:direction'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
  
  // Test rate limiting middleware
  describe('Rate Limiting Middleware', () => {
    beforeEach(() => {
      // Reset rate limits before each test
      jest.advanceTimersByTime(60 * 1000);
    });
    
    it('should enforce QR code operation rate limits', async () => {
      // Make requests up to the limit
      const withinLimitRequests = Array(10).fill(null).map(() => 
        request(app).post(`${API_PREFIX}/tables/${validTableId}/qrcode`)
      );
      
      const withinLimitResponses = await Promise.all(withinLimitRequests);
      
      // All should succeed
      withinLimitResponses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // One more should fail
      const overLimitResponse = await request(app)
        .post(`${API_PREFIX}/tables/${validTableId}/qrcode`);
      
      expect(overLimitResponse.status).toBe(429);
      expect(overLimitResponse.body.resetIn).toBeDefined();
    });
    
    it('should reset rate limits after time window expires', async () => {
      // Make requests up to the limit
      const requests = Array(10).fill(null).map(() => 
        request(app).post(`${API_PREFIX}/tables/${validTableId}/qrcode`)
      );
      
      await Promise.all(requests);
      
      // Next request should fail
      const failedResponse = await request(app)
        .post(`${API_PREFIX}/tables/${validTableId}/qrcode`);
      expect(failedResponse.status).toBe(429);
      
      // Advance time to reset rate limit
      jest.advanceTimersByTime(60 * 1000);
      
      // Request should now succeed
      const successResponse = await request(app)
        .post(`${API_PREFIX}/tables/${validTableId}/qrcode`);
      expect(successResponse.status).toBe(200);
    });
  });
});

// Test concurrent operations
describe('Concurrent Operations', () => {
  // Test concurrent table creation
  it('should handle concurrent table creation', async () => {
    // Create tables with different numbers concurrently
    const tableData = Array(5).fill(null).map((_, i) => ({
      number: `CONCURRENT-CREATE-${i}`,
      capacity: 4,
      tableTypeId: validTableTypeId.toString()
    }));
    
    const requests = tableData.map(data => 
      request(app)
        .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
        .send(data)
    );
    
    const responses = await Promise.all(requests);
    
    // All creations should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.body._id).toBeDefined();
    });
    
    // Verify all tables were created
    const allTablesResponse = await request(app)
      .get(`${API_PREFIX}/tables/filtered`)
      .query({ restaurantId: validRestaurantId.toString() });
    
    const tableNumbers = allTablesResponse.body.map((t: any) => t.number);
    tableData.forEach(data => {
      expect(tableNumbers).toContain(data.number);
    });
  });
  
  // Test concurrent status updates
  it('should handle concurrent status updates', async () => {
    // Create a table for testing
    const createResponse = await request(app)
      .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
      .send({
        number: 'CONCURRENT-STATUS',
        capacity: 4,
        tableTypeId: validTableTypeId.toString()
      });
    
    const tableId = createResponse.body._id;
    
    // Perform concurrent status updates
    const statusUpdates = [
      { isActive: false },
      { isActive: true },
      { isActive: false },
      { isActive: true }
    ];
    
    const updateRequests = statusUpdates.map(data => 
      request(app)
        .patch(`${API_PREFIX}/tables/${tableId}/status`)
        .send(data)
    );
    
    const updateResponses = await Promise.all(updateRequests);
    
    // All updates should succeed
    updateResponses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Last value should win
    const finalResponse = await request(app).get(`${API_PREFIX}/tables/${tableId}`);
    expect(finalResponse.status).toBe(200);
    expect(finalResponse.body.isActive).toBe(statusUpdates[statusUpdates.length - 1].isActive);
  });
  
  // Test race condition handling for table creation
  it('should handle race conditions when creating tables with the same number', async () => {
    // Try to create multiple tables with the same number in the same venue concurrently
    const tableNumber = `RACE-CONDITION-${Date.now()}`;
    
    const requests = Array(5).fill(null).map(() => 
      request(app)
        .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
        .send({
          number: tableNumber, // Same number for all requests
          capacity: 4,
          tableTypeId: validTableTypeId.toString()
        })
    );
    
    const responses = await Promise.all(requests);
    
    // Exactly one request should succeed, others should fail
    const successResponses = responses.filter(response => response.status === 201);
    const failureResponses = responses.filter(response => response.status === 400);
    
    expect(successResponses.length).toBe(1);
    expect(failureResponses.length).toBe(requests.length - 1);
    
    // All failures should indicate duplicate table number
    failureResponses.forEach(response => {
      expect(response.body.error).toMatch(/already exists/i);
    });
  });
  
  // Test concurrent QR code operations on the same table
  it('should handle concurrent QR code operations on the same table', async () => {
    // Reset any QR code
    await Table.findByIdAndUpdate(validTableId, { qrCode: '' });
    
    // Reset rate limits
    jest.advanceTimersByTime(60 * 1000);
    
    // Generate multiple QR codes for the same table concurrently
    const concurrentRequests = Array(3).fill(null).map(() => 
      request(app).post(`${API_PREFIX}/tables/${validTableId}/qrcode`)
    );
    
    const responses = await Promise.all(concurrentRequests);
    
    // All responses should be successful
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.qrCode).toBeDefined();
    });
    
    // Get the final QR code
    const getResponse = await request(app).get(`${API_PREFIX}/tables/${validTableId}/qrcode`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.qrCode).toBeDefined();
    
    // The QR codes generated might be different due to including unique IDs or timestamps
    // But the table should have a valid QR code stored
  });
  
  // Test table number uniqueness enforcement under load
  it('should maintain table number uniqueness under load', async () => {
    // Create tables with sequential numbers
    const baseNumber = `LOAD-TEST-${Date.now()}`;
    const tableNumbers = Array(10).fill(null).map((_, i) => `${baseNumber}-${i}`);
    
    // Create tables sequentially first
    const createdTables = [];
    for (const number of tableNumbers) {
      const response = await request(app)
        .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
        .send({
          number,
          capacity: 4,
          tableTypeId: validTableTypeId.toString()
        });
      
      expect(response.status).toBe(201);
      createdTables.push(response.body);
    }
    
    // Now try to create tables with the same numbers concurrently
    const duplicateRequests = tableNumbers.map(number => 
      request(app)
        .post(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables`)
        .send({
          number,
          capacity: 4,
          tableTypeId: validTableTypeId.toString()
        })
    );
    
    const duplicateResponses = await Promise.all(duplicateRequests);
    
    // All duplicate requests should fail
    duplicateResponses.forEach(response => {
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already exists/i);
    });
    
    // Clean up created tables
    for (const table of createdTables) {
      await request(app)
        .delete(`${API_PREFIX}/restaurants/${validRestaurantId}/venues/${validVenueId}/tables/${table._id}`);
    }
  });
  
  afterAll(async () => {
    // Clean up any tables created during concurrent tests
    try {
      // Find and delete tables created for concurrent tests
      const concurrentTables = await Table.find({
        number: { 
          $in: [
            /^CONCURRENT-/,
            /^RACE-CONDITION-/,
            /^LOAD-TEST-/
          ] 
        }
      });
      
      if (concurrentTables.length > 0) {
        const tableIds = concurrentTables.map(t => t._id);
        await Table.deleteMany({ _id: { $in: tableIds } });
        console.log(`Cleaned up ${tableIds.length} tables from concurrent tests`);
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  });
});
