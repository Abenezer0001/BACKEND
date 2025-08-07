/**
 * Tables and Table Types Seed Script (TypeScript)
 * 
 * This script creates table types and tables for all existing venues in the INSEAT system.
 * - Creates various table types for each restaurant (Regular, VIP, Counter, Booth, etc.)
 * - Generates 10+ tables per venue with proper numbering starting from "Table-101"
 * - Maintains proper associations between tables, table types, venues, and restaurants
 * 
 * Run with: npx ts-node table-seed.ts
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

// Import models and interfaces
import Restaurant, { IRestaurant } from './services/restaurant-service/src/models/Restaurant';
import Venue, { IVenue } from './services/restaurant-service/src/models/Venue';
import Table, { ITable } from './services/restaurant-service/src/models/Table';
import TableType, { ITableType } from './services/restaurant-service/src/models/TableType';

// MongoDB connection
const connectToMongoDB = async (): Promise<boolean> => {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    return false;
  }
};

// Predefined table types for restaurants
const tableTypeTemplates = [
  {
    name: 'Regular Table',
    description: 'Standard dining table for regular customers'
  },
  {
    name: 'VIP Table',
    description: 'Premium table with enhanced service and privacy'
  },
  {
    name: 'Counter Seats',
    description: 'Bar-style counter seating for quick dining'
  },
  {
    name: 'Booth',
    description: 'Comfortable booth seating for intimate dining'
  },
  {
    name: 'Outdoor Table',
    description: 'Patio or terrace seating for outdoor dining'
  },
  {
    name: 'Family Table',
    description: 'Large table designed for families and groups'
  },
  {
    name: 'High Top',
    description: 'Elevated table for casual dining experience'
  },
  {
    name: 'Private Dining',
    description: 'Exclusive table for private events and business meals'
  }
];

// Create table types for a restaurant
const createTableTypesForRestaurant = async (restaurantId: mongoose.Types.ObjectId, restaurantName: string): Promise<ITableType[]> => {
  console.log(`\n📋 Creating table types for restaurant: ${restaurantName}`);
  
  const createdTableTypes: ITableType[] = [];
  
  for (const template of tableTypeTemplates) {
    try {
      // Check if table type already exists
      const existingTableType = await TableType.findOne({
        name: template.name,
        restaurantId: restaurantId
      });
      
      if (existingTableType) {
        console.log(`   ⚠️  Table type "${template.name}" already exists, skipping...`);
        createdTableTypes.push(existingTableType);
        continue;
      }
      
      const tableType = new TableType({
        name: template.name,
        description: template.description,
        restaurantId: restaurantId
      });
      
      const savedTableType = await tableType.save();
      createdTableTypes.push(savedTableType);
      console.log(`   ✅ Created table type: ${template.name}`);
      
    } catch (error: any) {
      console.error(`   ❌ Failed to create table type "${template.name}":`, error.message);
    }
  }
  
  console.log(`   📊 Created ${createdTableTypes.length} table types for ${restaurantName}`);
  return createdTableTypes;
};

// Generate QR code placeholder
const generateQRCodePlaceholder = (tableNumber: string, venueName: string, restaurantName: string): string => {
  // In a real application, you would generate actual QR codes here
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/><text x="50" y="30" text-anchor="middle" font-size="8" fill="black">${restaurantName}</text><text x="50" y="50" text-anchor="middle" font-size="8" fill="black">${venueName}</text><text x="50" y="70" text-anchor="middle" font-size="10" fill="black">${tableNumber}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
};

// Create tables for a venue
const createTablesForVenue = async (venue: IVenue, tableTypes: ITableType[], restaurant: IRestaurant): Promise<ITable[]> => {
  console.log(`\n🪑 Creating tables for venue: ${venue.name} (${restaurant.name})`);
  
  const createdTables: ITable[] = [];
  const tableCount = 12; // Create 12 tables per venue (more than 10 as requested)
  const startingNumber = 101; // Starting from Table-101
  
  for (let i = 0; i < tableCount; i++) {
    const tableNumber = `${startingNumber + i}`;
    const tableName = `Table-${tableNumber}`;
    
    try {
      // Check if table already exists
      const existingTable = await Table.findOne({
        number: tableNumber,
        venueId: venue._id
      });
      
      if (existingTable) {
        console.log(`   ⚠️  Table "${tableName}" already exists in venue, skipping...`);
        createdTables.push(existingTable);
        continue;
      }
      
      // Assign table type based on table number pattern
      let selectedTableType: ITableType;
      if (i === 0 || i === 1) {
        selectedTableType = tableTypes.find(t => t.name === 'VIP Table') || tableTypes[0];
      } else if (i === tableCount - 1) {
        selectedTableType = tableTypes.find(t => t.name === 'Private Dining') || tableTypes[0];
      } else if (i % 4 === 0) {
        selectedTableType = tableTypes.find(t => t.name === 'Booth') || tableTypes[0];
      } else if (i % 5 === 0) {
        selectedTableType = tableTypes.find(t => t.name === 'Family Table') || tableTypes[0];
      } else if (i % 6 === 0) {
        selectedTableType = tableTypes.find(t => t.name === 'High Top') || tableTypes[0];
      } else if (i % 7 === 0) {
        selectedTableType = tableTypes.find(t => t.name === 'Counter Seats') || tableTypes[0];
      } else {
        selectedTableType = tableTypes.find(t => t.name === 'Regular Table') || tableTypes[0];
      }
      
      // Determine capacity based on table type
      let capacity: number;
      switch (selectedTableType.name) {
        case 'Counter Seats':
          capacity = 1 + Math.floor(Math.random() * 2); // 1-2 seats
          break;
        case 'VIP Table':
        case 'Private Dining':
          capacity = 4 + Math.floor(Math.random() * 5); // 4-8 seats
          break;
        case 'Family Table':
          capacity = 6 + Math.floor(Math.random() * 4); // 6-9 seats
          break;
        case 'Booth':
          capacity = 2 + Math.floor(Math.random() * 3); // 2-4 seats
          break;
        case 'High Top':
          capacity = 2 + Math.floor(Math.random() * 3); // 2-4 seats
          break;
        default: // Regular Table, Outdoor Table
          capacity = 2 + Math.floor(Math.random() * 5); // 2-6 seats
      }
      
      const table = new Table({
        number: tableNumber,
        venueId: venue._id,
        restaurantId: restaurant._id,
        capacity: capacity,
        tableTypeId: selectedTableType._id,
        qrCode: generateQRCodePlaceholder(tableName, venue.name, restaurant.name),
        isOccupied: false,
        isActive: true
      });
      
      const savedTable = await table.save();
      createdTables.push(savedTable);
      
      console.log(`   ✅ Created ${tableName} (${selectedTableType.name}, ${capacity} seats)`);
      
    } catch (error: any) {
      console.error(`   ❌ Failed to create table "${tableName}":`, error.message);
    }
  }
  
  // Update venue's tables array if it exists
  try {
    const newTableIds = createdTables.map(t => t._id);
    await Venue.findByIdAndUpdate(
      venue._id,
      { $addToSet: { tables: { $each: newTableIds } } }
    );
    console.log(`   🔗 Updated venue with ${createdTables.length} table references`);
  } catch (error: any) {
    console.error(`   ⚠️  Could not update venue tables array:`, error.message);
  }
  
  console.log(`   📊 Created ${createdTables.length} tables for venue: ${venue.name}`);
  return createdTables;
};

// Main seeding function
const seedTablesAndTableTypes = async (): Promise<void> => {
  console.log('🚀 Starting Tables and Table Types Seed Script\n');
  
  try {
    // Get all restaurants (restaurants don't have isActive property)
    const restaurants = await Restaurant.find({});
    console.log(`📍 Found ${restaurants.length} restaurants`);
    
    if (restaurants.length === 0) {
      console.log('❌ No restaurants found in database. Please create restaurants first.');
      return;
    }
    
    // List restaurant names for debugging
    console.log('Available restaurants:');
    restaurants.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name}`);
    });
    
    let totalTableTypes = 0;
    let totalTables = 0;
    
    // Process each restaurant
    for (const restaurant of restaurants) {
      console.log(`\n🏪 Processing restaurant: ${restaurant.name}`);
      
      // Create table types for this restaurant
      const tableTypes = await createTableTypesForRestaurant(restaurant._id, restaurant.name);
      totalTableTypes += tableTypes.length;
      
      if (tableTypes.length === 0) {
        console.log(`   ⚠️  No table types created for ${restaurant.name}, skipping table creation`);
        continue;
      }
      
      // Get all venues for this restaurant
      let venues = await Venue.find({ 
        restaurantId: restaurant._id, 
        isActive: true 
      });
      
      console.log(`   📍 Found ${venues.length} active venues for ${restaurant.name}`);
      
      if (venues.length === 0) {
        console.log(`   ⚠️  No active venues found. Checking for any venues...`);
        venues = await Venue.find({ restaurantId: restaurant._id });
        console.log(`   📍 Found ${venues.length} total venues (including inactive) for ${restaurant.name}`);
        
        if (venues.length === 0) {
          console.log(`   ❌ No venues found for ${restaurant.name}`);
          continue;
        }
        
        // List venue names for debugging
        console.log('   Available venues:');
        venues.forEach((v, i) => {
          console.log(`      ${i + 1}. ${v.name} (Active: ${v.isActive})`);
        });
      }
      
      // Create tables for each venue
      for (const venue of venues) {
        const tables = await createTablesForVenue(venue, tableTypes, restaurant);
        totalTables += tables.length;
      }
    }
    
    console.log('\n🎉 Tables and Table Types Seed Complete!');
    console.log(`📊 Summary:`);
    console.log(`   • Total Table Types Created: ${totalTableTypes}`);
    console.log(`   • Total Tables Created: ${totalTables}`);
    console.log(`   • Restaurants Processed: ${restaurants.length}`);
    
  } catch (error) {
    console.error('❌ Error during seeding process:', error);
    throw error;
  }
};

// Script execution
const main = async (): Promise<void> => {
  console.log('===== INSEAT TABLES & TABLE TYPES SEED SCRIPT =====\n');
  
  // Connect to MongoDB
  const connected = await connectToMongoDB();
  if (!connected) {
    console.error('Failed to connect to MongoDB. Exiting...');
    process.exit(1);
  }
  
  try {
    await seedTablesAndTableTypes();
    console.log('\n✅ Table seed script completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running seed script:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('�� MongoDB connection closed');
  }
};

// Run the script
if (require.main === module) {
  main();
}

export {
  seedTablesAndTableTypes,
  createTableTypesForRestaurant,
  createTablesForVenue
}; 