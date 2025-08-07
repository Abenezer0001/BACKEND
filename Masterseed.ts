import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import path from 'path';

// Load dotenv from the correct path
dotenv.config();

// Load models with proper paths
// Auth service models
import { User } from './services/auth-service/src/models/User';
import { Role } from './services/auth-service/src/models/Role';
import { Permission } from './services/auth-service/src/models/Permission';
// Restaurant service models
import Restaurant from './services/restaurant-service/src/models/Restaurant';
import Venue from './services/restaurant-service/src/models/Venue';
import TableType from './services/restaurant-service/src/models/TableType';
import Table from './services/restaurant-service/src/models/Table';
import Category from './services/restaurant-service/src/models/Category';
import SubCategory from './services/restaurant-service/src/models/SubCategory';
import SubSubCategory from './services/restaurant-service/src/models/SubSubCategory';
import Menu from './services/restaurant-service/src/models/Menu';
import MenuItem from './services/restaurant-service/src/models/MenuItem';
import Modifier from './services/restaurant-service/src/models/Modifier';
// Other service models
import Order from './services/order-service/src/models/Order';
import Payment from './services/payment-service/src/models/payment.model';
import Notification from './services/notification-service/src/models/notification.model';

// Define interfaces for type safety
interface IModifierOption {
  name: string;
  price?: number;
  isAvailable: boolean;
  order?: number;
}

interface IModifierDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  options: IModifierOption[];
  isRequired: boolean;
  multiSelect: boolean;
  minSelect?: number;
  maxSelect?: number;
  isActive: boolean;
  order?: number;
}

interface IOrderItem {
  menuItem: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  modifiers: {
    modifierId: mongoose.Types.ObjectId;
    options: string[];
    price: number;
  }[];
  notes?: string;
}

// Configuration
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0";
const SALT_ROUNDS = 10;
const NUM_TABLES_PER_VENUE_APPROX = 40;
const NUM_MENU_ITEMS_PER_SUB_SUB_CATEGORY = 5;

// Helper Functions
const getRandomElement = <T>(arr: T[]): T | undefined => {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
};

const getRandomSubset = <T>(arr: T[], maxCount: number): T[] => {
  if (!arr || arr.length === 0) return [];
  const count = Math.floor(Math.random() * (maxCount + 1));
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Utility functions
const getPlaceholderImage = (category = 'food', width = 640, height = 480): string => {
  return faker.image.urlLoremFlickr({ category, width, height });
};

// Pexels-like image URLs
const foodImages = [
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
  "https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg",
  "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg",
  "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg",
  "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg",
  "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg",
  "https://images.pexels.com/photos/842571/pexels-photo-842571.jpeg",
  "https://images.pexels.com/photos/414555/pexels-photo-414555.jpeg",
  "https://images.pexels.com/photos/1633525/pexels-photo-1633525.jpeg",
  "https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg"
];

const drinkImages = [
  "https://images.pexels.com/photos/2789328/pexels-photo-2789328.jpeg",
  "https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg",
  "https://images.pexels.com/photos/1187766/pexels-photo-1187766.jpeg",
  "https://images.pexels.com/photos/128242/pexels-photo-128242.jpeg",
  "https://images.pexels.com/photos/1600209/pexels-photo-1600209.jpeg"
];

const dessertImages = [
  "https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg",
  "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
  "https://images.pexels.com/photos/2144112/pexels-photo-2144112.jpeg",
  "https://images.pexels.com/photos/132694/pexels-photo-132694.jpeg",
  "https://images.pexels.com/photos/139746/pexels-photo-139746.jpeg"
];

const categoryImages = [
  "https://images.pexels.com/photos/5779787/pexels-photo-5779787.jpeg",
  "https://images.pexels.com/photos/2955819/pexels-photo-2955819.jpeg",
  "https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg",
  "https://images.pexels.com/photos/2983098/pexels-photo-2983098.jpeg",
  "https://images.pexels.com/photos/9511090/pexels-photo-9511090.jpeg"
];

const getRandomImage = (imageArray: string[]): string => {
  return imageArray[Math.floor(Math.random() * imageArray.length)];
};

// Sample restaurant data based on the provided examples
const restaurantData = [
  {
    name: "CINEMA CITY ARABIAN CENTRE",
    address: "Arabian Centre, Dubai",
    coordinates: { latitude: 25.2285, longitude: 55.3273 },
    venues: [
      "Screen 1",
      "Screen 2",
      "Screen 3",
      "Barista Counter",
      "Outdoor Space",
      "Dining Area",
      "Lounge Seating"
    ],
    tableTypes: [
      {
        name: "Standard Seating",
        description: "Regular cinema seating with cup holders"
      },
      {
        name: "Premium Seating",
        description: "Luxury recliner seats with extra legroom"
      },
      {
        name: "Dining Table",
        description: "Table service with full menu available during screening"
      }
    ]
  },
  {
    name: "CINEMA CITY AL QANA",
    address: "Al Qana",
    coordinates: { latitude: 24.4290, longitude: 54.5889 },
    venues: [
      "Screen 1",
      "Screen 2",
      "Screen 3",
      "Barista Counter"
    ],
    tableTypes: [
      {
        name: "Standard Seating",
        description: "Regular cinema seating with cup holders"
      },
      {
        name: "Family Seating",
        description: "Group seating arrangement for families"
      }
    ]
  },
  {
    name: "CINEMA CITY AL QANA VIP",
    address: "Al Qana",
    coordinates: { latitude: 24.4291, longitude: 54.5890 },
    venues: [
      "VIP Room",
      "Dining Area"
    ],
    tableTypes: [
      {
        name: "VIP Recliner",
        description: "Fully reclining leather seats with personal service"
      },
      {
        name: "VIP Couple Suite",
        description: "Private seating for two with dedicated waiter"
      }
    ]
  }
];

// Menu data
const foodCategories = [
  {
    name: "Popcorn & Snacks",
    description: "Cinema classics and movie munchies",
    subcategories: [
      {
        name: "Popcorn",
        description: "Freshly popped movie popcorn",
        subSubCategories: [
          {
            name: "Classic Popcorn",
            description: "Traditional cinema popcorn varieties"
          },
          {
            name: "Gourmet Popcorn",
            description: "Premium flavored popcorn options"
          }
        ]
      },
      {
        name: "Nachos",
        description: "Crunchy nachos with dips",
        subSubCategories: [
          {
            name: "Cheese Nachos",
            description: "Nachos with cheese and toppings"
          },
          {
            name: "Loaded Nachos",
            description: "Fully loaded nachos with premium toppings"
          }
        ]
      }
    ]
  },
  {
    name: "Beverages",
    description: "Refreshing drinks for your movie",
    subcategories: [
      {
        name: "Cold Drinks",
        description: "Soft drinks and cold beverages",
        subSubCategories: [
          {
            name: "Sodas",
            description: "Classic and diet sodas"
          },
          {
            name: "Iced Teas",
            description: "Refreshing iced tea options"
          }
        ]
      },
      {
        name: "Hot Drinks",
        description: "Coffee, tea and hot chocolate",
        subSubCategories: [
          {
            name: "Coffee",
            description: "Premium coffee options"
          },
          {
            name: "Tea",
            description: "Hot tea selections"
          }
        ]
      }
    ]
  },
  {
    name: "Meals",
    description: "Substantial food options for cinema dining",
    subcategories: [
      {
        name: "Burgers",
        description: "Gourmet cinema burgers",
        subSubCategories: [
          {
            name: "Beef Burgers",
            description: "Premium beef burger selections"
          },
          {
            name: "Chicken Burgers",
            description: "Tasty chicken burger options"
          }
        ]
      },
      {
        name: "Pizza",
        description: "Fresh-baked pizzas",
        subSubCategories: [
          {
            name: "Classic Pizzas",
            description: "Traditional pizza favorites"
          },
          {
            name: "Specialty Pizzas",
            description: "Gourmet pizza creations"
          }
        ]
      }
    ]
  }
];

// Menu items and modifiers data structure
const menuItemsTemplates = [
  // Popcorn items
  {
    category: "Popcorn & Snacks",
    subcategory: "Popcorn",
    subSubCategory: "Classic Popcorn",
    items: [
      { name: "Small Salted Popcorn", price: 15, preparationTime: 1 },
      { name: "Medium Salted Popcorn", price: 20, preparationTime: 1 },
      { name: "Large Salted Popcorn", price: 25, preparationTime: 1 },
      { name: "Small Caramel Popcorn", price: 18, preparationTime: 1 },
      { name: "Large Caramel Popcorn", price: 28, preparationTime: 1 }
    ]
  },
  {
    category: "Popcorn & Snacks",
    subcategory: "Popcorn",
    subSubCategory: "Gourmet Popcorn",
    items: [
      { name: "Truffle Parmesan Popcorn", price: 35, preparationTime: 2 },
      { name: "Chocolate Drizzle Popcorn", price: 30, preparationTime: 2 },
      { name: "Spicy Buffalo Popcorn", price: 32, preparationTime: 2 },
      { name: "White Cheddar Popcorn", price: 28, preparationTime: 2 },
      { name: "Kettle Corn", price: 25, preparationTime: 2 }
    ]
  },
  // Nachos items
  {
    category: "Popcorn & Snacks",
    subcategory: "Nachos",
    subSubCategory: "Cheese Nachos",
    items: [
      { name: "Regular Cheese Nachos", price: 25, preparationTime: 3 },
      { name: "Large Cheese Nachos", price: 35, preparationTime: 3 },
      { name: "Jalapeño Cheese Nachos", price: 30, preparationTime: 3 },
      { name: "Double Cheese Nachos", price: 32, preparationTime: 3 },
      { name: "Kids Cheese Nachos", price: 18, preparationTime: 3 }
    ]
  },
  // Beverages
  {
    category: "Beverages",
    subcategory: "Cold Drinks",
    subSubCategory: "Sodas",
    items: [
      { name: "Small Coca-Cola", price: 12, preparationTime: 1 },
      { name: "Large Coca-Cola", price: 18, preparationTime: 1 },
      { name: "Small Sprite", price: 12, preparationTime: 1 },
      { name: "Large Sprite", price: 18, preparationTime: 1 },
      { name: "Diet Coke", price: 15, preparationTime: 1 }
    ]
  }
];

// Modifier templates
const modifierTemplates = [
  {
    name: "Popcorn Size",
    isRequired: true,
    multiSelect: false,
    options: [
      { name: "Small", price: 0 },
      { name: "Medium", price: 5 },
      { name: "Large", price: 10 }
    ]
  },
  {
    name: "Popcorn Flavor",
    isRequired: false,
    multiSelect: false,
    options: [
      { name: "Regular", price: 0 },
      { name: "Butter", price: 2 },
      { name: "Caramel", price: 3 },
      { name: "Cheese", price: 3 }
    ]
  },
  {
    name: "Nacho Toppings",
    isRequired: false,
    multiSelect: true,
    options: [
      { name: "Extra Cheese", price: 5 },
      { name: "Jalapeños", price: 3 },
      { name: "Sour Cream", price: 4 },
      { name: "Guacamole", price: 6 }
    ]
  },
  {
    name: "Drink Size",
    isRequired: true,
    multiSelect: false,
    options: [
      { name: "Small", price: 0 },
      { name: "Medium", price: 4 },
      { name: "Large", price: 8 }
    ]
  },
  {
    name: "Ice Option",
    isRequired: false,
    multiSelect: false,
    options: [
      { name: "Regular Ice", price: 0 },
      { name: "Less Ice", price: 0 },
      { name: "No Ice", price: 0 }
    ]
  }
];

// Database Connection with Retry Logic
const connectWithRetry = async (retries = 5, delay = 5000): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to MongoDB Atlas (attempt ${i + 1}/${retries})...`);
      await mongoose.connect(MONGO_URI);
      console.log('Successfully connected to MongoDB Atlas');
      return true;
    } catch (error: any) {
      console.error(`Failed to connect to MongoDB (attempt ${i + 1}/${retries}):`, error.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
};

// Clean Database
const cleanDatabase = async (): Promise<void> => {
  console.log('Cleaning database...');
  const models = [
    User, Role, Permission, Restaurant, Venue, TableType, Table,
    Category, SubCategory, SubSubCategory, Menu, MenuItem, Modifier,
    Order, Payment, Notification
  ];
  
  for (const model of models) {
    try {
      if (model && typeof model.deleteMany === 'function') {
        await model.deleteMany({});
        console.log(`Cleaned ${model.modelName || 'Unknown model'}`);
      } else {
        console.warn(`Warning: Invalid model or deleteMany not available for ${model?.modelName || 'Unknown model'}`);
      }
    } catch (error: any) {
      console.warn(`Warning: Could not delete ${model?.modelName || 'Unknown model'}: ${error.message}`);
    }
  }
  console.log('Database cleaned');
};

// Seeding functions
// 1. Create Roles and Permissions
const seedRolesAndPermissions = async (): Promise<{
  adminRoleId: mongoose.Types.ObjectId,
  userRoleId: mongoose.Types.ObjectId,
  permissions: mongoose.Types.ObjectId[]
}> => {
  console.log('Creating roles and permissions...');
  
  // Create permissions
  const permissions = [
    { name: 'create:users', description: 'Create users', action: 'create', resource: 'users' },
    { name: 'read:users', description: 'Read users', action: 'read', resource: 'users' },
    { name: 'update:users', description: 'Update users', action: 'update', resource: 'users' },
    { name: 'delete:users', description: 'Delete users', action: 'delete', resource: 'users' },
    { name: 'create:restaurants', description: 'Create restaurants', action: 'create', resource: 'restaurants' },
    { name: 'read:restaurants', description: 'Read restaurants', action: 'read', resource: 'restaurants' },
    { name: 'update:restaurants', description: 'Update restaurants', action: 'update', resource: 'restaurants' },
    { name: 'delete:restaurants', description: 'Delete restaurants', action: 'delete', resource: 'restaurants' },
    { name: 'create:menus', description: 'Create menus', action: 'create', resource: 'menus' },
    { name: 'read:menus', description: 'Read menus', action: 'read', resource: 'menus' },
    { name: 'update:menus', description: 'Update menus', action: 'update', resource: 'menus' },
    { name: 'delete:menus', description: 'Delete menus', action: 'delete', resource: 'menus' },
    { name: 'create:orders', description: 'Create orders', action: 'create', resource: 'orders' },
    { name: 'read:orders', description: 'Read orders', action: 'read', resource: 'orders' },
    { name: 'update:orders', description: 'Update orders', action: 'update', resource: 'orders' },
    { name: 'delete:orders', description: 'Delete orders', action: 'delete', resource: 'orders' },
  ];
  
  const permissionDocs = await Permission.insertMany(permissions);
  
  const permissionIds = permissionDocs.map(p => p._id);
  
  // Create admin role with all permissions
  const adminRole = await Role.create({
    name: 'admin',
    description: 'Administrator with full access',
    permissions: permissionIds
  });
  
  // Create user role with limited permissions
  const userPermissions = permissionDocs
    .filter(p => ['read:restaurants', 'read:menus', 'create:orders', 'read:orders'].includes(p.name))
    .map(p => p._id);
  
  const userRole = await Role.create({
    name: 'user',
    description: 'Regular user with limited access',
    permissions: userPermissions
  });
  
  console.log(`Created ${permissionDocs.length} permissions`);
  console.log(`Created admin and user roles`);
  
  return {
    adminRoleId: adminRole._id,
    userRoleId: userRole._id,
    permissions: permissionIds
  };
};

// 2. Create Restaurants
const seedRestaurants = async (): Promise<mongoose.Types.ObjectId[]> => {
  console.log('Creating restaurants...');
  
  const restaurantIds: mongoose.Types.ObjectId[] = [];
  
  for (const restaurant of restaurantData) {
    try {
      const newRestaurant = await Restaurant.create({
        name: restaurant.name,
        locations: [{
          address: restaurant.address,
          coordinates: {
            latitude: restaurant.coordinates.latitude,
            longitude: restaurant.coordinates.longitude
          }
        }],
        schedule: [
          { dayOfWeek: 0, openTime: '10:00', closeTime: '22:00', isHoliday: false },
          { dayOfWeek: 1, openTime: '10:00', closeTime: '22:00', isHoliday: false },
          { dayOfWeek: 2, openTime: '10:00', closeTime: '22:00', isHoliday: false },
          { dayOfWeek: 3, openTime: '10:00', closeTime: '22:00', isHoliday: false },
          { dayOfWeek: 4, openTime: '10:00', closeTime: '23:00', isHoliday: false },
          { dayOfWeek: 5, openTime: '10:00', closeTime: '23:00', isHoliday: false },
          { dayOfWeek: 6, openTime: '10:00', closeTime: '23:00', isHoliday: false }
        ]
      });
      
      restaurantIds.push(newRestaurant._id);
      console.log(`Created restaurant: ${restaurant.name}`);
    } catch (error: any) {
      console.error(`Error creating restaurant ${restaurant.name}:`, error.message);
    }
  }
  
  console.log(`Created ${restaurantIds.length} restaurants`);
  return restaurantIds;
};

// 3. Create TableTypes, Venues and Tables for each restaurant
const seedVenuesAndTables = async (restaurantIds: mongoose.Types.ObjectId[]): Promise<{
  venueIds: Map<string, mongoose.Types.ObjectId[]>,
  tableTypeIds: Map<string, mongoose.Types.ObjectId[]>
}> => {
  console.log('Creating venues and tables...');
  
  const venueIds = new Map<string, mongoose.Types.ObjectId[]>();
  const tableTypeIds = new Map<string, mongoose.Types.ObjectId[]>();
  
  // Process each restaurant
  for (let i = 0; i < restaurantIds.length; i++) {
    const restaurantId = restaurantIds[i];
    const currentRestaurant = restaurantData[i];
    const restaurantVenues: mongoose.Types.ObjectId[] = [];
    const restaurantTableTypes: mongoose.Types.ObjectId[] = [];
    
    // Create table types for this restaurant
    for (const tableType of currentRestaurant.tableTypes) {
      try {
        const newTableType = await TableType.create({
          name: tableType.name,
          description: tableType.description,
          restaurantId
        });
        
        restaurantTableTypes.push(newTableType._id);
        console.log(`Created table type: ${tableType.name} for restaurant ID: ${restaurantId}`);
      } catch (error: any) {
        console.error(`Error creating table type ${tableType.name}:`, error.message);
      }
    }
    
    // Create venues for this restaurant
    for (let venueIndex = 0; venueIndex < currentRestaurant.venues.length; venueIndex++) {
      const venueName = currentRestaurant.venues[venueIndex];
      const venueNumber = venueIndex + 1; // 1-based venue numbering
      try {
        const newVenue = await Venue.create({
          name: venueName,
          description: `${venueName} at ${currentRestaurant.name}`,
          capacity: Math.floor(Math.random() * 100) + 50, // Random capacity between 50 and 150
          isActive: true,
          restaurantId,
          tables: [] // Initialize empty tables array
        });
        
        restaurantVenues.push(newVenue._id);
        
        // Create tables for the venue
        // Create at least 5 tables per venue, more for larger venues
        const tableCount = Math.floor(Math.random() * 21) + 5; // 5 to 25 tables
        const venueTables: mongoose.Types.ObjectId[] = [];
        
        for (let t = 0; t < tableCount; t++) {
          // Assign a random table type from this restaurant's table types
          const tableTypeId = restaurantTableTypes[Math.floor(Math.random() * restaurantTableTypes.length)];
          // Create unique table number using venue number: V{venueNumber}T{tableNumber}
          const tableNumber = `V${venueNumber}T${(t + 1).toString().padStart(3, '0')}`; // e.g., V1T001, V1T002
          
          try {
            const newTable = await Table.create({
              name: `Table ${tableNumber}`,
              number: tableNumber,
              capacity: Math.floor(Math.random() * 6) + 2, // 2 to 8 capacity
              restaurantId,
              venueId: newVenue._id,
              tableTypeId,
              isAvailable: true,
              isActive: true,
              order: t + 1
            });
            
            venueTables.push(newTable._id);
          } catch (error: any) {
            console.error(`Error creating table ${tableNumber}:`, error.message);
          }
        }
        
        // Update venue with table IDs
        await Venue.findByIdAndUpdate(newVenue._id, { tables: venueTables });
        console.log(`Created ${venueTables.length} tables for venue: ${venueName}`)
        
        console.log(`Created venue: ${venueName} for restaurant ID: ${restaurantId}`);
      } catch (error: any) {
        console.error(`Error creating venue ${venueName}:`, error.message);
      }
    }
    
    // Update the restaurant with venue IDs
    // Update the restaurant with venue IDs
    await Restaurant.findByIdAndUpdate(restaurantId, { venues: restaurantVenues });
    
    // Store IDs for this restaurant
    venueIds.set(restaurantId.toString(), restaurantVenues);
    tableTypeIds.set(restaurantId.toString(), restaurantTableTypes);
  }
  
  console.log('Finished creating venues and tables');
  return { venueIds, tableTypeIds };
};

// 4. Create Menu Structure (Categories, SubCategories, SubSubCategories)
const seedMenuStructure = async (restaurantIds: mongoose.Types.ObjectId[], venueIds: Map<string, mongoose.Types.ObjectId[]>): Promise<{
  categoryMap: Map<string, Map<string, mongoose.Types.ObjectId>>,
  subcategoryMap: Map<string, Map<string, mongoose.Types.ObjectId>>,
  subsubcategoryMap: Map<string, Map<string, mongoose.Types.ObjectId>>,
  menuMap: Map<string, mongoose.Types.ObjectId[]>
}> => {
  console.log('Creating menu structure (categories, subcategories, subsubcategories)...');
  
  const categoryMap = new Map<string, Map<string, mongoose.Types.ObjectId>>();
  const subcategoryMap = new Map<string, Map<string, mongoose.Types.ObjectId>>();
  const subsubcategoryMap = new Map<string, Map<string, mongoose.Types.ObjectId>>();
  const menuMap = new Map<string, mongoose.Types.ObjectId[]>();
  
  // Process each restaurant
  for (const restaurantId of restaurantIds) {
    const restaurantIdStr = restaurantId.toString();
    const restaurantCategoryMap = new Map<string, mongoose.Types.ObjectId>();
    const restaurantSubcategoryMap = new Map<string, mongoose.Types.ObjectId>();
    const restaurantSubsubcategoryMap = new Map<string, mongoose.Types.ObjectId>();
    
    // Get restaurant venues
    const venues = venueIds.get(restaurantIdStr) || [];
    if (venues.length === 0) {
      console.warn(`No venues found for restaurant ID: ${restaurantId}`);
      continue;
    }
    
    // Create menus for each venue
    const restaurantMenus: mongoose.Types.ObjectId[] = [];
    
    for (const venueId of venues) {
      try {
        // Create a menu for this venue
        const newMenu = await Menu.create({
          name: `${(await Venue.findById(venueId))?.name || 'Venue'} Menu`,
          description: `Menu for ${(await Venue.findById(venueId))?.name || 'Venue'}`,
          restaurantId,
          venueId,
          categories: [], // Will be populated later
          subCategories: [] // Will be populated later
        });
        
        restaurantMenus.push(newMenu._id);
        console.log(`Created menu for venue ID: ${venueId}`);
      } catch (error: any) {
        console.error(`Error creating menu for venue ID ${venueId}:`, error.message);
      }
    }
    
    // Store menus for this restaurant
    menuMap.set(restaurantIdStr, restaurantMenus);
    
    // Create categories, subcategories, and subsubcategories
    for (const category of foodCategories) {
      try {
        // Create category
        const newCategory = await Category.create({
          name: category.name,
          description: category.description,
          image: getRandomImage(categoryImages),
          isActive: true,
          order: Math.floor(Math.random() * 10) + 1,
          restaurantId
        });
        
        restaurantCategoryMap.set(category.name, newCategory._id);
        console.log(`Created category: ${category.name} for restaurant ID: ${restaurantId}`);
        
        // Create subcategories for this category
        for (const subcategory of category.subcategories) {
          try {
            // Create subcategory
            const newSubcategory = await SubCategory.create({
              name: subcategory.name,
              description: subcategory.description,
              image: category.name.includes('Beverage') ? getRandomImage(drinkImages) : getRandomImage(foodImages),
              restaurantId,
              category: newCategory._id, // This is correct - schema uses 'category'
              isActive: true,
              order: Math.floor(Math.random() * 10) + 1
            });
            
            restaurantSubcategoryMap.set(subcategory.name, newSubcategory._id);
            console.log(`Created subcategory: ${subcategory.name} for category: ${category.name}`);
            
            // Create subsubcategories for this subcategory
            for (const subsubcategory of subcategory.subSubCategories) {
              try {
                // Create subsubcategory
                const newSubsubcategory = await SubSubCategory.create({
                  name: subsubcategory.name,
                  description: subsubcategory.description,
                  image: category.name.includes('Beverage') ? getRandomImage(drinkImages) : 
                         (subcategory.name.includes('Dessert') ? getRandomImage(dessertImages) : getRandomImage(foodImages)),
                  restaurantId,
                  category: newCategory._id, // This is correct - schema uses 'category'
                  subCategory: newSubcategory._id, // This is correct - schema uses 'subCategory'
                  isActive: true,
                  order: Math.floor(Math.random() * 10) + 1
                });
                
                restaurantSubsubcategoryMap.set(subsubcategory.name, newSubsubcategory._id);
                console.log(`Created subsubcategory: ${subsubcategory.name} for subcategory: ${subcategory.name}`);
              } catch (error: any) {
                console.error(`Error creating subsubcategory ${subsubcategory.name}:`, error.message);
              }
            }
          } catch (error: any) {
            console.error(`Error creating subcategory ${subcategory.name}:`, error.message);
          }
        }
      } catch (error: any) {
        console.error(`Error creating category ${category.name}:`, error.message);
      }
    }
    
    // Update menus with category and subcategory IDs
    for (const menuId of restaurantMenus) {
      try {
        const categoryIds = Array.from(restaurantCategoryMap.values());
        const subcategoryIds = Array.from(restaurantSubcategoryMap.values());
        
        await Menu.findByIdAndUpdate(menuId, {
          categories: categoryIds,
          subCategories: subcategoryIds
        });
        
        console.log(`Updated menu ID: ${menuId} with categories and subcategories`);
      } catch (error: any) {
        console.error(`Error updating menu ID ${menuId}:`, error.message);
      }
    }
    
    // Store maps for this restaurant
    categoryMap.set(restaurantIdStr, restaurantCategoryMap);
    subcategoryMap.set(restaurantIdStr, restaurantSubcategoryMap);
    subsubcategoryMap.set(restaurantIdStr, restaurantSubsubcategoryMap);
  }
  
  console.log('Finished creating menu structure');
  return { categoryMap, subcategoryMap, subsubcategoryMap, menuMap };
};

// 5. Create Menu Items with Modifiers
const seedMenuItems = async (
  restaurantIds: mongoose.Types.ObjectId[],
  venueIds: Map<string, mongoose.Types.ObjectId[]>,
  categoryMap: Map<string, Map<string, mongoose.Types.ObjectId>>,
  subcategoryMap: Map<string, Map<string, mongoose.Types.ObjectId>>,
  subsubcategoryMap: Map<string, Map<string, mongoose.Types.ObjectId>>
): Promise<void> => {
  console.log('Creating menu items and modifiers...');
  
  // First, create modifiers for each restaurant
  const modifierMap = new Map<string, mongoose.Types.ObjectId[]>();
  
  for (const restaurantId of restaurantIds) {
    const restaurantIdStr = restaurantId.toString();
    const restaurantModifiers: mongoose.Types.ObjectId[] = [];
    
    // Create modifiers for this restaurant
    for (const modifierTemplate of modifierTemplates) {
      try {
        const newModifier = await Modifier.create({
          name: modifierTemplate.name,
          description: `${modifierTemplate.name} options`,
          restaurantId,
          options: modifierTemplate.options.map(option => ({
            name: option.name,
            price: option.price,
            isAvailable: true,
            order: Math.floor(Math.random() * 10) + 1
          })),
          isRequired: modifierTemplate.isRequired,
          multiSelect: modifierTemplate.multiSelect,
          minSelect: modifierTemplate.multiSelect ? 1 : undefined,
          maxSelect: modifierTemplate.multiSelect ? modifierTemplate.options.length : 1,
          isActive: true,
          order: Math.floor(Math.random() * 10) + 1
        });
        
        restaurantModifiers.push(newModifier._id);
        console.log(`Created modifier: ${modifierTemplate.name} for restaurant ID: ${restaurantId}`);
      } catch (error: any) {
        console.error(`Error creating modifier ${modifierTemplate.name}:`, error.message);
      }
    }
    
    modifierMap.set(restaurantIdStr, restaurantModifiers);
  }
  
  // Now create menu items for each restaurant
  for (const restaurantId of restaurantIds) {
    const restaurantIdStr = restaurantId.toString();
    const restaurantVenues = venueIds.get(restaurantIdStr) || [];
    
    if (restaurantVenues.length === 0) {
      console.warn(`No venues found for restaurant ID: ${restaurantId}`);
      continue;
    }
    
    const restaurantCategoryMap = categoryMap.get(restaurantIdStr);
    const restaurantSubcategoryMap = subcategoryMap.get(restaurantIdStr);
    const restaurantSubsubcategoryMap = subsubcategoryMap.get(restaurantIdStr);
    const restaurantModifiers = modifierMap.get(restaurantIdStr) || [];
    
    if (!restaurantCategoryMap || !restaurantSubcategoryMap || !restaurantSubsubcategoryMap) {
      console.warn(`Missing category maps for restaurant ID: ${restaurantId}`);
      continue;
    }
    
    // Create menu items based on templates
    for (const menuItemTemplate of menuItemsTemplates) {
      try {
        // Get category, subcategory, and subsubcategory IDs
        const categoryId = restaurantCategoryMap.get(menuItemTemplate.category);
        const subcategoryId = restaurantSubcategoryMap.get(menuItemTemplate.subcategory);
        const subsubcategoryId = restaurantSubsubcategoryMap.get(menuItemTemplate.subSubCategory);
        
        if (!categoryId) {
          console.warn(`Missing category for menu item template: ${menuItemTemplate.category}. Available categories: ${Array.from(restaurantCategoryMap.keys()).join(', ')}`);
          continue; // Skip completely if no category
        }
        
        // Log missing subcategories but continue with items
        if (!subcategoryId) {
          console.warn(`Missing subcategory for menu item template: ${menuItemTemplate.subcategory} in category ${menuItemTemplate.category}`);
          // Try to find a fallback subcategory in this category
          const fallbackSubcategories = Array.from(restaurantSubcategoryMap.entries())
            .filter(([name, id]) => name.toLowerCase().includes(menuItemTemplate.subcategory.toLowerCase()));
          
          if (fallbackSubcategories.length > 0) {
            console.log(`Found fallback subcategory: ${fallbackSubcategories[0][0]} for ${menuItemTemplate.subcategory}`);
          }
        }
        
        if (!subsubcategoryId) {
          console.warn(`Missing subsubcategory for menu item template: ${menuItemTemplate.subSubCategory} in subcategory ${menuItemTemplate.subcategory}`);
        }
        
        // Assign relevant modifiers based on the item category
        // We need a simpler approach that doesn't use async in a filter
        const relevantModifiers = restaurantModifiers.filter(modifierId => {
          // Use a simple heuristic instead of async lookup
          if (menuItemTemplate.category.includes('Popcorn')) return true;
          if (menuItemTemplate.category.includes('Beverages')) return true;
          if (menuItemTemplate.subcategory && menuItemTemplate.subcategory.includes('Nachos')) return true;
          return false;
        });
        
        // For each venue, create these menu items
        for (const venueId of restaurantVenues) {
          // Create each menu item in the template
          for (const item of menuItemTemplate.items) {
            try {
              const itemImage = menuItemTemplate.category.includes('Beverages') ? 
                                getRandomImage(drinkImages) : 
                                (menuItemTemplate.subcategory && menuItemTemplate.subcategory.includes('Dessert') ? 
                                 getRandomImage(dessertImages) : 
                                 getRandomImage(foodImages));
            
            try {
              const menuItemData = {
                name: item.name,
                description: `Delicious ${item.name} - perfect for your movie experience`,
                venueId,
                categories: [categoryId],
                subCategories: subcategoryId ? [subcategoryId] : [], // Use empty array if subcategoryId is missing
                subSubCategory: subsubcategoryId || null, // Use null if subsubcategoryId is missing
                price: item.price,
                modifierGroups: getRandomSubset(relevantModifiers, 2),
                image: itemImage,
                preparationTime: item.preparationTime,
                isAvailable: true,
                isActive: true,
                allergens: getRandomSubset(['Gluten', 'Dairy', 'Nuts', 'Soy', 'Eggs'], 2),
                nutritionalInfo: {
                  calories: Math.floor(Math.random() * 500) + 100,
                  protein: Math.floor(Math.random() * 20),
                  carbohydrates: Math.floor(Math.random() * 50),
                  fats: Math.floor(Math.random() * 30)
                },
                restaurantId
              };
              
              const newMenuItem = await MenuItem.create(menuItemData);
              console.log(`Created menu item: ${item.name} for venue ID: ${venueId} with ID: ${newMenuItem._id}`);
            } catch (error: any) {
              console.error(`Error creating menu item ${item.name}:`, error.message);
              // Log more detailed error info for debugging
              if (error.errors) {
                Object.keys(error.errors).forEach(field => {
                  console.error(`Field ${field}: ${error.errors[field].message}`);
                });
              }
            }
          } catch (error: any) {
            console.error(`Error preparing menu item ${item.name}:`, error.message);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error processing menu item template ${menuItemTemplate.category}/${menuItemTemplate.subcategory}:`, error.message);
      }
    }
  }
  
  console.log('Finished creating menu items and modifiers');
};

// 6. Create Orders based on menu items and tables
const seedOrders = async (
  restaurantIds: mongoose.Types.ObjectId[],
  venueIds: Map<string, mongoose.Types.ObjectId[]>
): Promise<void> => {
  console.log('Creating orders...');
  
  // Create 5-10 orders for each restaurant
  for (const restaurantId of restaurantIds) {
    const restaurantIdStr = restaurantId.toString();
    const restaurantVenues = venueIds.get(restaurantIdStr) || [];
    
    if (restaurantVenues.length === 0) {
      console.warn(`No venues found for restaurant ID: ${restaurantId}`);
      continue;
    }
    
    // Get tables from all venues
    const tables: mongoose.Types.ObjectId[] = [];
    for (const venueId of restaurantVenues) {
      try {
        const venue = await Venue.findById(venueId).populate('tables');
        if (venue && venue.tables) {
          tables.push(...venue.tables);
        }
      } catch (error: any) {
        console.error(`Error getting tables for venue ${venueId}:`, error.message);
      }
    }
    
    if (tables.length === 0) {
      console.warn(`No tables found for restaurant ID: ${restaurantId}`);
      continue;
    }
    
    // Get menu items for this restaurant
    let menuItems: any[] = [];
    try {
      menuItems = await MenuItem.find({ restaurantId }).lean();
    } catch (error: any) {
      console.error(`Error getting menu items for restaurant ${restaurantId}:`, error.message);
    }
    
    if (menuItems.length === 0) {
      console.warn(`No menu items found for restaurant ID: ${restaurantId}`);
      continue;
    }
    
    // Get users to assign to orders
    let users: any[] = [];
    try {
      users = await User.find().lean();
    }
    
    // Create an anonymous user if no users found
    let anonymousUserId: mongoose.Types.ObjectId | undefined;
    if (users.length === 0) {
      console.warn('No users found. Creating anonymous user for orders.');
      try {
        const anonymousPassword = await bcrypt.hash('anonymous123', SALT_ROUNDS);
        const anonymousUser = await User.create({
          email: 'anonymous@inseat.com',
          password: anonymousPassword,
          roles: [],
          permissions: []
        });
        anonymousUserId = anonymousUser._id;
        console.log(`Created anonymous user with email: ${anonymousUser.email}`);
      } catch (error: any) {
        console.error(`Error creating anonymous user:`, error.message);
      }
    }
    
    // Helper function to generate a unique order number
    const generateOrderNumber = (): string => {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `ORD-${timestamp}-${random}`;
    };
    
    // Create 5-10 orders
    const orderCount = Math.floor(Math.random() * 6) + 5; // 5-10 orders
    for (let i = 0; i < orderCount; i++) {
      try {
        // Select a random table
        const tableId = getRandomElement(tables);
        if (!tableId) continue;
        
        // Select a random user if available
        const userId = users.length > 0 ? getRandomElement(users)?._id : anonymousUserId;
        // Select a random user if available
        if (!userId) {
          console.warn('No user ID available for order. Skipping.');
          continue;
        }

        // Create 1-5 order items
        const itemCount = Math.floor(Math.random() * 5) + 1;
        const orderItems: IOrderItem[] = [];
        let orderSubtotal = 0;
        
        for (let j = 0; j < itemCount; j++) {
          // Select a random menu item
          const menuItem = getRandomElement(menuItems);
          if (!menuItem) continue;
          
          // Random quantity between 1 and 3
          const quantity = Math.floor(Math.random() * 3) + 1;
          
          // Calculate price for this item
          const basePrice = menuItem.price;
          let modifiersPrice = 0;
          const modifiers: { modifierId: mongoose.Types.ObjectId; options: string[]; price: number }[] = [];
          
          // Add modifiers if available
          if (menuItem.modifierGroups && menuItem.modifierGroups.length > 0) {
            for (const modifierId of menuItem.modifierGroups) {
              try {
                const modifier = await Modifier.findById(modifierId).lean() as unknown as IModifierDocument;
                if (modifier && modifier.options && modifier.options.length > 0) {
                  // Select 1 option for single select, or 1-3 for multi select
                  const selectedOptions = modifier.multiSelect 
                    ? getRandomSubset(modifier.options, Math.min(3, modifier.options.length))
                    : [getRandomElement(modifier.options)].filter(Boolean) as IModifierOption[];
                  
                  // Calculate price for selected options
                  let optionsPrice = 0;
                  const optionNames: string[] = [];
                  
                  for (const option of selectedOptions) {
                    if (option) {
                      optionsPrice += option.price || 0;
                      optionNames.push(option.name);
                    }
                  }
                  
                  modifiersPrice += optionsPrice;
                  
                  // Add modifier to order item
                  modifiers.push({
                    modifierId,
                    options: optionNames,
                    price: optionsPrice
                  });
                }
              } catch (error: any) {
                console.error(`Error processing modifier ${modifierId}:`, error.message);
              }
            }
          }
          
          // Calculate total price for this item
          const itemSubtotal = (basePrice + modifiersPrice) * quantity;
          orderSubtotal += itemSubtotal;
          
          // Add item to order
          orderItems.push({
            menuItem: menuItem._id,
            name: menuItem.name,
            quantity,
            price: basePrice,
            subtotal: itemSubtotal,
            modifiers,
            notes: Math.random() > 0.7 ? `Special request for ${menuItem.name}` : undefined
          });
        }
        
        // Create the order
        if (orderItems.length > 0) {
          // Calculate tax and total
          const taxRate = 0.05; // 5% tax
          const taxAmount = Math.round(orderSubtotal * taxRate * 100) / 100;
          const orderTotal = orderSubtotal + taxAmount;
          
          // Determine order type and status
          const orderTypes = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
          const randomOrderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
          
          const orderStatuses = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
          const randomStatus = orderStatuses[Math.floor(Math.random() * (orderStatuses.length - 1))]; // Exclude CANCELLED most of the time
          
          // Generate unique order number
          const orderNumber = generateOrderNumber();
          
          const newOrder = await Order.create({
            restaurantId,
            userId,
            items: orderItems,
            status: randomStatus,
            orderType: randomOrderType,
            orderNumber,
            tableId,
            subtotal: orderSubtotal,
            tax: taxAmount,
            total: orderTotal,
            paymentStatus: Math.random() > 0.3 ? 'PAID' : 'PENDING' // 70% chance of being paid
          });
          
          console.log(`Created order ID: ${newOrder._id} for table ID: ${tableId} with ${orderItems.length} items`);
        }
      } catch (error: any) {
        console.error(`Error creating order:`, error.message);
      }
    }
  }
  
  console.log('Finished creating orders');
};

// 6. Main seeding function to orchestrate the entire process
const seedAll = async (): Promise<void> => {
  console.log('Starting database seeding process...');
  
  try {
    // 1. Create roles and permissions
    const { adminRoleId, userRoleId, permissions } = await seedRolesAndPermissions();
    
    // 2. Create restaurants
    const restaurantIds = await seedRestaurants();
    if (restaurantIds.length === 0) {
      throw new Error('Failed to create any restaurants. Aborting seeding process.');
    }
    
    // 3. Create venues and tables
    const { venueIds, tableTypeIds } = await seedVenuesAndTables(restaurantIds);
    
    // 4. Create menu structure
    const { categoryMap, subcategoryMap, subsubcategoryMap, menuMap } = await seedMenuStructure(restaurantIds, venueIds);
    
    // 5. Create menu items with modifiers
    await seedMenuItems(restaurantIds, venueIds, categoryMap, subcategoryMap, subsubcategoryMap);
    
    // 6. Create orders
    await seedOrders(restaurantIds, venueIds);
    
    // 6. Create admin user
    const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    const adminUser = await User.create({
      email: 'admin@inseat.com',
      password: adminPassword,
      roles: [adminRoleId],
      permissions: permissions
    });
    console.log(`Created admin user with email: ${adminUser.email}`);
    
    // 7. Create regular user
    const userPassword = await bcrypt.hash('user123', SALT_ROUNDS);
    const regularUser = await User.create({
      email: 'user@inseat.com',
      password: userPassword,
      roles: [userRoleId],
      permissions: []
    });
    console.log(`Created regular user with email: ${regularUser.email}`);
    
    console.log('✅ Database seeding completed successfully');
  } catch (error: any) {
    console.error('❌ Database seeding failed:', error.message);
    throw error;
  }
};

// Start the seeding process
const init = async () => {
  try {
    // Connect to the database with retry logic
    const connected = await connectWithRetry();
    if (!connected) {
      console.error('Failed to connect to MongoDB after maximum retries');
      process.exit(1);
    }
    
    // Clean the database before seeding
    await cleanDatabase();
    
    // Seed the database
    await seedAll();
    
    console.log('✨ All operations completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('Fatal error during execution:', error);
    process.exit(1);
  }
};

// Execute the initialization function
init();
