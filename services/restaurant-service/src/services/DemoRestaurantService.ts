import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant';
import Table from '../models/Table';
import Category from '../models/Category';
import Modifier from '../models/Modifier';
import MenuItem from '../models/MenuItem';

/**
 * Service responsible for creating demo restaurant data
 */
class DemoRestaurantService {
  /**
   * Create a complete demo restaurant with tables, menu items, and categories
   */
  async createDemoRestaurant(restaurantData: {
    name: string;
    email: string;
    ownerId: string;
  }): Promise<any> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      // 1. Create restaurant
      const restaurant = await this.createRestaurantRecord(restaurantData, session);
      
      // 2. Create tables
      await this.createDemoTables(restaurant._id, session);
      
      // 3. Create menu categories
      const categories = await this.createDemoCategories(restaurant._id, session);
      
      // 4. Create modifiers
      const modifiers = await this.createDemoModifiers(restaurant._id, session);
      
      // 5. Create menu items with categories and modifiers
      await this.createDemoMenuItems(restaurant._id, categories, modifiers, session);
      
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
   * Create the restaurant record
   */
  private async createRestaurantRecord(
    data: { name: string; email: string; ownerId: string }, 
    session: mongoose.mongo.ClientSession
  ) {
    const restaurant = new Restaurant({
      name: data.name,
      email: data.email,
      phone: '+1234567890', // Dummy phone
      address: {
        street: '123 Demo Street',
        city: 'Demo City',
        state: 'DS',
        zipCode: '12345',
        country: 'Demo Country'
      },
      ownerId: data.ownerId,
      logo: 'https://via.placeholder.com/150',
      coverImage: 'https://via.placeholder.com/1200x300',
      openingHours: {
        monday: { open: '09:00', close: '22:00', isOpen: true },
        tuesday: { open: '09:00', close: '22:00', isOpen: true },
        wednesday: { open: '09:00', close: '22:00', isOpen: true },
        thursday: { open: '09:00', close: '22:00', isOpen: true },
        friday: { open: '09:00', close: '23:00', isOpen: true },
        saturday: { open: '10:00', close: '23:00', isOpen: true },
        sunday: { open: '10:00', close: '21:00', isOpen: true }
      },
      settings: {
        currency: 'USD',
        taxRate: 5,
        serviceCharge: 0,
        allowReservations: true,
        requireCustomerLogin: false
      },
      isDemo: true
    });
    
    return await restaurant.save({ session });
  }
  
  /**
   * Create demo tables
   */
  private async createDemoTables(restaurantId: mongoose.Types.ObjectId, session: mongoose.mongo.ClientSession) {
    const tables: Array<{
      number: number;
      name: string;
      capacity: number;
      restaurantId: mongoose.Types.ObjectId;
      status: string;
      zoneId: null;
    }> = [];
    
    // Create 15 tables with different capacities
    for (let i = 1; i <= 15; i++) {
      let capacity = 2;
      
      // Vary table capacity
      if (i % 3 === 0) capacity = 4;
      if (i % 5 === 0) capacity = 6;
      if (i % 10 === 0) capacity = 8;
      
      tables.push({
        number: i,
        name: `Table ${i}`,
        capacity,
        restaurantId,
        status: 'available',
        zoneId: null // No zones for demo simplicity
      });
    }
    
    return await Table.insertMany(tables, { session });
  }
  
  /**
   * Create demo categories
   */
  private async createDemoCategories(restaurantId: mongoose.Types.ObjectId, session: mongoose.mongo.ClientSession) {
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
  private async createDemoModifiers(restaurantId: mongoose.Types.ObjectId, session: mongoose.mongo.ClientSession) {
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
    categories: any[], 
    modifiers: any[],
    session: mongoose.mongo.ClientSession
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
        restaurantId,
        categoryId: categoryMap['Starters'],
        modifierIds: [],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      {
        name: 'Chicken Wings',
        description: 'Crispy wings with choice of sauce',
        price: 8.99,
        restaurantId,
        categoryId: categoryMap['Starters'],
        modifierIds: [modifierMap['Spice Level']],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      {
        name: 'Mozzarella Sticks',
        description: 'Breaded mozzarella with marinara sauce',
        price: 6.99,
        restaurantId,
        categoryId: categoryMap['Starters'],
        modifierIds: [],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      
      // Main Courses
      {
        name: 'Classic Burger',
        description: 'Beef patty with lettuce, tomato, and special sauce',
        price: 12.99,
        restaurantId,
        categoryId: categoryMap['Main Courses'],
        modifierIds: [modifierMap['Add Extras'], modifierMap['Cooking Preference']],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      {
        name: 'Grilled Salmon',
        description: 'Fresh salmon with lemon butter sauce',
        price: 16.99,
        restaurantId,
        categoryId: categoryMap['Main Courses'],
        modifierIds: [],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      {
        name: 'Vegetable Stir Fry',
        description: 'Mixed vegetables in a savory sauce',
        price: 10.99,
        restaurantId,
        categoryId: categoryMap['Main Courses'],
        modifierIds: [modifierMap['Spice Level']],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      
      // Sides
      {
        name: 'French Fries',
        description: 'Crispy golden fries',
        price: 3.99,
        restaurantId,
        categoryId: categoryMap['Sides'],
        modifierIds: [modifierMap['Size']],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      {
        name: 'Side Salad',
        description: 'Mixed greens with house dressing',
        price: 4.99,
        restaurantId,
        categoryId: categoryMap['Sides'],
        modifierIds: [],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      
      // Desserts
      {
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake with ganache',
        price: 6.99,
        restaurantId,
        categoryId: categoryMap['Desserts'],
        modifierIds: [modifierMap['Size']],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      {
        name: 'Ice Cream Sundae',
        description: 'Vanilla ice cream with toppings',
        price: 5.99,
        restaurantId,
        categoryId: categoryMap['Desserts'],
        modifierIds: [],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      
      // Drinks
      {
        name: 'Soft Drink',
        description: 'Choice of soda',
        price: 2.49,
        restaurantId,
        categoryId: categoryMap['Drinks'],
        modifierIds: [modifierMap['Size']],
        image: 'https://via.placeholder.com/300',
        available: true
      },
      {
        name: 'Fresh Lemonade',
        description: 'Freshly squeezed lemonade',
        price: 3.49,
        restaurantId,
        categoryId: categoryMap['Drinks'],
        modifierIds: [modifierMap['Size']],
        image: 'https://via.placeholder.com/300',
        available: true
      }
    ];
    
    return await MenuItem.insertMany(menuItems, { session });
  }
}

export default new DemoRestaurantService(); 