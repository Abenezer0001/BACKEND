"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
const Venue_1 = __importDefault(require("../models/Venue"));
const Table_1 = __importDefault(require("../models/Table"));
const TableType_1 = __importDefault(require("../models/TableType"));
const data_1 = require("./data");
async function seed() {
    try {
        // Connect to MongoDB
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inseat';
        await mongoose_1.default.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        // Clear existing data
        await Promise.all([
            Restaurant_1.default.deleteMany({}),
            Venue_1.default.deleteMany({}),
            Table_1.default.deleteMany({}),
            TableType_1.default.deleteMany({})
        ]);
        console.log('Cleared existing data');
        for (const restaurantInfo of data_1.restaurantData.restaurants) {
            // Create restaurant
            const restaurant = await Restaurant_1.default.create({
                name: restaurantInfo.name,
                locations: [{
                        address: restaurantInfo.address,
                        coordinates: {
                            latitude: 40.7128, // Default coordinates
                            longitude: -74.0060
                        }
                    }],
                schedule: [
                    { dayOfWeek: 0, openTime: '10:00', closeTime: '22:00', isHoliday: false },
                    { dayOfWeek: 1, openTime: '10:00', closeTime: '22:00', isHoliday: false },
                    { dayOfWeek: 2, openTime: '10:00', closeTime: '22:00', isHoliday: false },
                    { dayOfWeek: 3, openTime: '10:00', closeTime: '22:00', isHoliday: false },
                    { dayOfWeek: 4, openTime: '10:00', closeTime: '22:00', isHoliday: false },
                    { dayOfWeek: 5, openTime: '09:00', closeTime: '23:00', isHoliday: false },
                    { dayOfWeek: 6, openTime: '09:00', closeTime: '23:00', isHoliday: false }
                ]
            });
            console.log(`Created restaurant: ${restaurant.name}`);
            // Create venues for this restaurant
            const venuePromises = restaurantInfo.venues.map(async (venueName) => {
                const venue = await Venue_1.default.create({
                    name: venueName,
                    description: `${venueName} at ${restaurantInfo.name}`,
                    capacity: Math.floor(Math.random() * 50) + 50, // Random capacity between 50-100
                    isActive: true,
                    restaurantId: restaurant._id
                });
                return venue;
            });
            const venues = await Promise.all(venuePromises);
            console.log(`Created ${venues.length} venues for ${restaurant.name}`);
            // Create table types for this restaurant
            const tableTypePromises = restaurantInfo.tableTypes.map(async (tableTypeInfo) => {
                return TableType_1.default.create({
                    name: tableTypeInfo.name,
                    description: tableTypeInfo.description,
                    restaurantId: restaurant._id
                });
            });
            const tableTypes = await Promise.all(tableTypePromises);
            console.log(`Created ${tableTypes.length} table types for ${restaurant.name}`);
            // Create tables for this restaurant's venues
            const tablePromises = [];
            restaurantInfo.tables.forEach((tableNumber, index) => {
                const venueIndex = index % venues.length;
                const tableTypeIndex = index % tableTypes.length;
                tablePromises.push(Table_1.default.create({
                    number: tableNumber,
                    venueId: venues[venueIndex]._id,
                    capacity: Math.floor(Math.random() * 6) + 2, // Random capacity between 2-8
                    tableTypeId: tableTypes[tableTypeIndex]._id, // Use tableTypeId instead of type
                    isActive: true,
                    isOccupied: false
                }));
            });
            const tables = await Promise.all(tablePromises);
            console.log(`Created ${tables.length} tables for ${restaurant.name}`);
            // Update restaurant with references to venues and tables
            await Restaurant_1.default.findByIdAndUpdate(restaurant._id, {
                venues: venues.map(venue => venue._id),
                tables: tables.map(table => table._id)
            });
        }
        console.log('Seed completed successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}
// Run the seed function
seed();
