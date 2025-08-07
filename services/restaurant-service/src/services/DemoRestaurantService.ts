import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant';
import Business from '../models/Business';
import Venue from '../models/Venue';
import Table from '../models/Table';
import TableType from '../models/TableType';
import Category from '../models/Category';
import Modifier from '../models/Modifier';
import MenuItem from '../models/MenuItem';

/**
 * Service responsible for creating demo restaurant data
 */
class DemoRestaurantService {
  /**
   * Create a complete demo restaurant with business, tables, menu items, and categories
   */
  async createDemoRestaurant(restaurantData: {
    name: string;
    email: string;
    ownerId: string;
  }): Promise<any> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      // 1. Create business first
      const business = await this.createDemoBusinessRecord(restaurantData, session);
      
      // 2. Create restaurant with businessId
      const restaurant = await this.createRestaurantRecord(restaurantData, business._id, session);
      
      // 3. Create demo venues
      const venues = await this.createDemoVenues(restaurant._id, session);
      
      // 4. Create demo table types
      const tableTypes = await this.createDemoTableTypes(restaurant._id, session);
      
      // 5. Create tables
      await this.createDemoTables(restaurant._id, venues[0]._id, tableTypes[0]._id, session);
      
      // 6. Create menu categories
      const categories = await this.createDemoCategories(restaurant._id, session);
      
      // 7. Create modifiers
      const modifiers = await this.createDemoModifiers(restaurant._id, session);
      
      // 8. Create menu items with categories and modifiers
      await this.createDemoMenuItems(restaurant._id, venues[0]._id, categories, modifiers, session);
      
      await session.commitTransaction();
      
      return restaurant;
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating demo restaurant:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Create the demo business record
   */
  private async createDemoBusinessRecord(
    data: { name: string; email: string; ownerId: string },
    session: mongoose.ClientSession
  ) {
    const business = new Business({
      name: `${data.name} Business`,
      legalName: `${data.name} LLC`,
      contactInfo: {
        email: data.email,
        phone: '+1234567890',
        address: '123 Demo Business Street, Demo City, DS 12345'
      },
      ownerId: data.ownerId,
      isActive: true,
      loyaltyProgramEnabled: true,
      platformSettings: {
        platformFeePercentage: 5.0,
        enableAutomaticPayouts: true,
        payoutSchedule: 'weekly'
      }
    });
    
    return await business.save({ session });
  }
  
  /**
   * Create the restaurant record
   */
  private async createRestaurantRecord(
    data: { name: string; email: string; ownerId: string },
    businessId: mongoose.Types.ObjectId,
    session: mongoose.ClientSession
  ) {
    const restaurant = new Restaurant({
      name: data.name,
      businessId: businessId,
      locations: [{
        address: '123 Demo Street, Demo City, DS 12345',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      }],
      venues: [],
      tables: [],
      menu: [],
      adminIds: [data.ownerId], // Keep for backwards compatibility
      schedule: [
        { dayOfWeek: 1, openTime: '09:00', closeTime: '22:00', isHoliday: false },
        { dayOfWeek: 2, openTime: '09:00', closeTime: '22:00', isHoliday: false },
        { dayOfWeek: 3, openTime: '09:00', closeTime: '22:00', isHoliday: false },
        { dayOfWeek: 4, openTime: '09:00', closeTime: '22:00', isHoliday: false },
        { dayOfWeek: 5, openTime: '09:00', closeTime: '23:00', isHoliday: false },
        { dayOfWeek: 6, openTime: '10:00', closeTime: '23:00', isHoliday: false },
        { dayOfWeek: 0, openTime: '10:00', closeTime: '21:00', isHoliday: false }
      ],
      service_charge: {
        enabled: true,
        percentage: 15
      }
    });
    
    return await restaurant.save({ session });
  }
  
  /**
   * Create demo venues
   */
  private async createDemoVenues(restaurantId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
    const venues = [
      {
        name: 'Main Dining Room',
        description: 'The main dining area with comfortable seating',
        capacity: 60,
        restaurantId,
        isActive: true,
        tables: [],
        serviceCharge: {
          type: 'percentage',
          value: 10,
          enabled: true
        }
      },
      {
        name: 'Outdoor Patio',
        description: 'Beautiful outdoor seating area',
        capacity: 30,
        restaurantId,
        isActive: true,
        tables: [],
        serviceCharge: {
          type: 'percentage',
          value: 10,
          enabled: true
        }
      }
    ];
    
    return await Venue.insertMany(venues, { session });
  }
  
  /**
   * Create demo table types
   */
  private async createDemoTableTypes(restaurantId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
    const tableTypes = [
      {
        name: 'Standard',
        description: 'Standard dining table',
        restaurantId
      },
      {
        name: 'Window',
        description: 'Table by the window with a view',
        restaurantId
      },
      {
        name: 'Corner',
        description: 'Corner table for more privacy',
        restaurantId
      }
    ];
    
    return await TableType.insertMany(tableTypes, { session });
  }
  
  /**
   * Create demo tables
   */
  private async createDemoTables(
    restaurantId: mongoose.Types.ObjectId, 
    venueId: mongoose.Types.ObjectId, 
    tableTypeId: mongoose.Types.ObjectId, 
    session: mongoose.ClientSession
  ) {
    const tables: Array<{
      number: string;
      capacity: number;
      restaurantId: mongoose.Types.ObjectId;
      venueId: mongoose.Types.ObjectId;
      tableTypeId: mongoose.Types.ObjectId;
      isOccupied: boolean;
      isActive: boolean;
      qrCode?: string;
    }> = [];
    
    // Create 15 tables with different capacities
    for (let i = 1; i <= 15; i++) {
      let capacity = 2;
      
      // Vary table capacity
      if (i % 3 === 0) capacity = 4;
      if (i % 5 === 0) capacity = 6;
      if (i % 10 === 0) capacity = 8;
      
      tables.push({
        number: i.toString(),
        capacity,
        restaurantId,
        venueId,
        tableTypeId,
        isOccupied: false,
        isActive: true
      });
    }
    
    return await Table.insertMany(tables, { session });
  }
  
  /**
   * Create demo categories
   */
  private async createDemoCategories(restaurantId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
    const categories = [
      {
        name: 'Starters',
        description: 'Appetizers and small plates',
        restaurantId,
        sortOrder: 1,
        image: 'https://via.placeholder.com/300'
      },
      {
        name: 'Main Courses',
        description: 'Hearty entrées and specialties',
        restaurantId,
        sortOrder: 2,
        image: 'https://via.placeholder.com/300'
      },
      {
        name: 'Sides',
        description: 'Perfect accompaniments',
        restaurantId,
        sortOrder: 3,
        image: 'https://via.placeholder.com/300'
      },
      {
        name: 'Desserts',
        description: 'Sweet treats to finish your meal',
        restaurantId,
        sortOrder: 4,
        image: 'https://via.placeholder.com/300'
      },
      {
        name: 'Drinks',
        description: 'Refreshing beverages',
        restaurantId,
        sortOrder: 5,
        image: 'https://via.placeholder.com/300'
      }
    ];
    
    return await Category.insertMany(categories, { session });
  }
  
  /**
   * Create demo modifiers
   */
  private async createDemoModifiers(restaurantId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
    const modifiers = [
      {
        name: 'Spice Level',
        description: 'Choose your preferred spice level',
        restaurantId,
        required: true,
        multiSelect: false,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: 'Mild', price: 0 },
          { name: 'Medium', price: 0 },
          { name: 'Hot', price: 0 },
          { name: 'Extra Hot', price: 0.5 }
        ]
      },
      {
        name: 'Add Extras',
        description: 'Enhance your dish with extras',
        restaurantId,
        required: false,
        multiSelect: true,
        minSelections: 0,
        maxSelections: 3,
        options: [
          { name: 'Extra Cheese', price: 1.5 },
          { name: 'Bacon', price: 2.0 },
          { name: 'Avocado', price: 1.5 },
          { name: 'Mushrooms', price: 1.0 },
          { name: 'Caramelized Onions', price: 1.0 }
        ]
      },
      {
        name: 'Cooking Preference',
        description: 'How would you like your meat cooked?',
        restaurantId,
        required: true,
        multiSelect: false,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: 'Rare', price: 0 },
          { name: 'Medium Rare', price: 0 },
          { name: 'Medium', price: 0 },
          { name: 'Medium Well', price: 0 },
          { name: 'Well Done', price: 0 }
        ]
      },
      {
        name: 'Size',
        description: 'Choose your size',
        restaurantId,
        required: true,
        multiSelect: false,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: 'Small', price: -1.0 },
          { name: 'Regular', price: 0 },
          { name: 'Large', price: 2.0 }
        ]
      }
    ];
    
    return await Modifier.insertMany(modifiers, { session });
  }
  
  /**
   * Create demo menu items
   */
  private async createDemoMenuItems(
    restaurantId: mongoose.Types.ObjectId, 
    venueId: mongoose.Types.ObjectId,
    categories: any[], 
    modifiers: any[],
    session: mongoose.ClientSession
  ) {
    // Map categories by name for easier reference
    const categoryMap = categories.reduce((map, category) => {
      map[category.name] = category._id;
      return map;
    }, {} as any);
    
    // Map modifiers by name for easier reference
    const modifierMap = modifiers.reduce((map, modifier) => {
      map[modifier.name] = modifier._id;
      return map;
    }, {} as any);
    
    // Create menu items for each category
    const menuItems = [
      // Starters
      {
        name: 'Garlic Bread',
        description: 'Freshly baked bread with garlic butter',
        price: 4.99,
        basePrice: 4.99,
        preparationTime: 15,
        restaurantId,
        venueId,
        categories: [categoryMap['Starters']],
        modifierGroups: [],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      {
        name: 'Chicken Wings',
        description: 'Crispy wings with choice of sauce',
        price: 8.99,
        basePrice: 8.99,
        preparationTime: 25,
        restaurantId,
        venueId,
        categories: [categoryMap['Starters']],
        modifierGroups: [modifierMap['Spice Level']],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      {
        name: 'Mozzarella Sticks',
        description: 'Breaded mozzarella with marinara sauce',
        price: 6.99,
        basePrice: 6.99,
        preparationTime: 20,
        restaurantId,
        venueId,
        categories: [categoryMap['Starters']],
        modifierGroups: [],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      
      // Main Courses
      {
        name: 'Classic Burger',
        description: 'Beef patty with lettuce, tomato, and special sauce',
        price: 12.99,
        basePrice: 12.99,
        preparationTime: 30,
        restaurantId,
        venueId,
        categories: [categoryMap['Main Courses']],
        modifierGroups: [modifierMap['Add Extras'], modifierMap['Cooking Preference']],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      {
        name: 'Grilled Salmon',
        description: 'Fresh salmon with lemon butter sauce',
        price: 16.99,
        basePrice: 16.99,
        preparationTime: 35,
        restaurantId,
        venueId,
        categories: [categoryMap['Main Courses']],
        modifierGroups: [],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      {
        name: 'Vegetable Stir Fry',
        description: 'Mixed vegetables in a savory sauce',
        price: 10.99,
        basePrice: 10.99,
        preparationTime: 25,
        restaurantId,
        venueId,
        categories: [categoryMap['Main Courses']],
        modifierGroups: [modifierMap['Spice Level']],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      
      // Sides
      {
        name: 'French Fries',
        description: 'Crispy golden fries',
        price: 3.99,
        basePrice: 3.99,
        preparationTime: 12,
        restaurantId,
        venueId,
        categories: [categoryMap['Sides']],
        modifierGroups: [modifierMap['Size']],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      {
        name: 'Side Salad',
        description: 'Mixed greens with house dressing',
        price: 4.99,
        basePrice: 4.99,
        preparationTime: 10,
        restaurantId,
        venueId,
        categories: [categoryMap['Sides']],
        modifierGroups: [],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      
      // Desserts
      {
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake with ganache',
        price: 6.99,
        basePrice: 6.99,
        preparationTime: 5,
        restaurantId,
        venueId,
        categories: [categoryMap['Desserts']],
        modifierGroups: [modifierMap['Size']],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      {
        name: 'Ice Cream Sundae',
        description: 'Vanilla ice cream with toppings',
        price: 5.99,
        basePrice: 5.99,
        preparationTime: 8,
        restaurantId,
        venueId,
        categories: [categoryMap['Desserts']],
        modifierGroups: [],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      
      // Drinks
      {
        name: 'Soft Drink',
        description: 'Choice of soda',
        price: 2.49,
        basePrice: 2.49,
        preparationTime: 2,
        restaurantId,
        venueId,
        categories: [categoryMap['Drinks']],
        modifierGroups: [modifierMap['Size']],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      },
      {
        name: 'Fresh Lemonade',
        description: 'Freshly squeezed lemonade',
        price: 3.49,
        basePrice: 3.49,
        preparationTime: 5,
        restaurantId,
        venueId,
        categories: [categoryMap['Drinks']],
        modifierGroups: [modifierMap['Size']],
        image: 'https://via.placeholder.com/300',
        isAvailable: true,
        isActive: true
      }
    ];
    
    return await MenuItem.insertMany(menuItems, { session });
  }
}

export default new DemoRestaurantService();