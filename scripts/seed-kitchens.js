const mongoose = require('mongoose');
require('dotenv').config();

// Import the Kitchen model
const Kitchen = require('../services/auth-service/src/models/Kitchen');
const Restaurant = require('../services/auth-service/src/models/Restaurant');
const Venue = require('../services/auth-service/src/models/Venue');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inseat');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Sample kitchen data leveraging existing Kitchen model structure
const sampleKitchens = [
  {
    name: "Main Kitchen - Central Prep",
    description: "Primary kitchen handling all main course preparation including grills, stir-fries, and hot dishes. Equipped with commercial-grade equipment and staffed by head chefs.",
    kitchenType: "MAIN",
    isActive: true,
    hasKDS: true,
    status: "OPEN",
    maxStaffCapacity: 8,
    assignedStaff: [
      {
        staffId: new mongoose.Types.ObjectId(),
        name: "Chef Marcus Rodriguez",
        role: "HEAD_CHEF",
        shift: "MORNING",
        specialization: "GRILL_MASTER"
      },
      {
        staffId: new mongoose.Types.ObjectId(),
        name: "Sarah Chen",
        role: "SOUS_CHEF", 
        shift: "MORNING",
        specialization: "HOT_DISHES"
      },
      {
        staffId: new mongoose.Types.ObjectId(),
        name: "Ahmed Hassan",
        role: "LINE_COOK",
        shift: "EVENING",
        specialization: "PREP_COOK"
      }
    ],
    equipment: [
      { type: "GRILL", name: "Commercial Char Grill", isWorking: true },
      { type: "STOVE", name: "6-Burner Gas Range", isWorking: true },
      { type: "OVEN", name: "Convection Oven", isWorking: true },
      { type: "FRYER", name: "Deep Fryer - Double Basket", isWorking: true },
      { type: "PREP_STATION", name: "Stainless Steel Prep Counter", isWorking: true },
      { type: "OTHER", name: "Commercial Refrigerator", isWorking: true },
      { type: "OTHER", name: "Food Processor", isWorking: true }
    ],
    workingHours: [
      { dayOfWeek: 1, startTime: "06:00", endTime: "15:00", isOpen: true }, // Monday
      { dayOfWeek: 2, startTime: "06:00", endTime: "15:00", isOpen: true }, // Tuesday
      { dayOfWeek: 3, startTime: "06:00", endTime: "15:00", isOpen: true }, // Wednesday
      { dayOfWeek: 4, startTime: "06:00", endTime: "15:00", isOpen: true }, // Thursday
      { dayOfWeek: 5, startTime: "06:00", endTime: "22:00", isOpen: true }, // Friday - Extended hours
      { dayOfWeek: 6, startTime: "07:00", endTime: "22:00", isOpen: true }, // Saturday
      { dayOfWeek: 0, startTime: "08:00", endTime: "20:00", isOpen: true }  // Sunday
    ],
    kotPrinter: {
      ipAddress: "192.168.1.101",
      port: 9100,
      isEnabled: true,
      printerName: "Main Kitchen KOT"
    },
    labelPrinter: {
      ipAddress: "192.168.1.102", 
      port: 9100,
      isEnabled: true,
      printerName: "Main Kitchen Labels"
    },
    capabilities: ["GRILL", "FRY", "SAUTE", "ROAST", "PREP"],
    averagePreparationTime: 12, // minutes
    dailyOrdersProcessed: 150,
    efficiency: 88.5,
    accessPin: "1234"
  },
  {
    name: "Dessert & Pastry Station",
    description: "Specialized kitchen for all dessert preparation, pastries, ice cream, and cold beverages. Temperature-controlled environment with specialized baking equipment.",
    kitchenType: "DESSERT",
    isActive: true,
    hasKDS: true,
    status: "OPEN",
    maxStaffCapacity: 4,
    assignedStaff: [
      {
        staffId: new mongoose.Types.ObjectId(),
        name: "Isabella Moreau",
        role: "PASTRY_CHEF",
        shift: "MORNING",
        specialization: "DESSERTS"
      },
      {
        staffId: new mongoose.Types.ObjectId(),
        name: "David Kim",
        role: "BAKER",
        shift: "EARLY_MORNING",
        specialization: "PASTRIES"
      }
    ],
    equipment: [
      { type: "OVEN", name: "Convection Baking Oven", isWorking: true },
      { type: "OTHER", name: "Stand Mixer - 20Qt", isWorking: true },
      { type: "OTHER", name: "Blast Chiller", isWorking: true },
      { type: "OTHER", name: "Ice Cream Machine", isWorking: true },
      { type: "PREP_STATION", name: "Marble Pastry Counter", isWorking: true },
      { type: "OTHER", name: "Chocolate Tempering Machine", isWorking: true },
      { type: "OTHER", name: "Display Refrigerator", isWorking: true }
    ],
    workingHours: [
      { dayOfWeek: 1, startTime: "05:00", endTime: "18:00", isOpen: true }, // Monday - Early start for fresh pastries
      { dayOfWeek: 2, startTime: "05:00", endTime: "18:00", isOpen: true }, // Tuesday
      { dayOfWeek: 3, startTime: "05:00", endTime: "18:00", isOpen: true }, // Wednesday
      { dayOfWeek: 4, startTime: "05:00", endTime: "18:00", isOpen: true }, // Thursday
      { dayOfWeek: 5, startTime: "05:00", endTime: "20:00", isOpen: true }, // Friday
      { dayOfWeek: 6, startTime: "06:00", endTime: "20:00", isOpen: true }, // Saturday
      { dayOfWeek: 0, startTime: "07:00", endTime: "18:00", isOpen: true }  // Sunday
    ],
    kotPrinter: {
      ipAddress: "192.168.1.201",
      port: 9100,
      isEnabled: true,
      printerName: "Dessert Station KOT"
    },
    labelPrinter: {
      ipAddress: "192.168.1.202",
      port: 9100,
      isEnabled: true,
      printerName: "Dessert Station Labels"
    },
    capabilities: ["BAKE", "CHILL", "FREEZE", "DECORATE", "BLEND"],
    averagePreparationTime: 8, // minutes - Faster for most desserts
    dailyOrdersProcessed: 80,
    efficiency: 92.3,
    accessPin: "5678"
  },
  {
    name: "Cold Prep & Salad Station",
    description: "Dedicated cold food preparation area for salads, appetizers, cold sandwiches, and beverage preparation. Maintains optimal temperature for fresh ingredients.",
    kitchenType: "COLD",
    isActive: true,
    hasKDS: true,
    status: "OPEN",
    maxStaffCapacity: 3,
    assignedStaff: [
      {
        staffId: new mongoose.Types.ObjectId(),
        name: "Maria Gonzalez",
        role: "PREP_COOK",
        shift: "MORNING",
        specialization: "SALADS"
      },
      {
        staffId: new mongoose.Types.ObjectId(),
        name: "James Wilson",
        role: "LINE_COOK",
        shift: "EVENING",
        specialization: "COLD_PREP"
      }
    ],
    equipment: [
      { type: "PREP_STATION", name: "Refrigerated Prep Table", isWorking: true },
      { type: "OTHER", name: "Salad Spinner - Commercial", isWorking: true },
      { type: "OTHER", name: "Vegetable Slicer", isWorking: true },
      { type: "OTHER", name: "Walk-in Cooler Access", isWorking: true },
      { type: "OTHER", name: "Sandwich Press", isWorking: true },
      { type: "OTHER", name: "Juice Extractor", isWorking: true },
      { type: "OTHER", name: "Food Vacuum Sealer", isWorking: true }
    ],
    workingHours: [
      { dayOfWeek: 1, startTime: "07:00", endTime: "16:00", isOpen: true }, // Monday
      { dayOfWeek: 2, startTime: "07:00", endTime: "16:00", isOpen: true }, // Tuesday
      { dayOfWeek: 3, startTime: "07:00", endTime: "16:00", isOpen: true }, // Wednesday
      { dayOfWeek: 4, startTime: "07:00", endTime: "16:00", isOpen: true }, // Thursday
      { dayOfWeek: 5, startTime: "07:00", endTime: "21:00", isOpen: true }, // Friday
      { dayOfWeek: 6, startTime: "08:00", endTime: "21:00", isOpen: true }, // Saturday
      { dayOfWeek: 0, startTime: "09:00", endTime: "19:00", isOpen: true }  // Sunday
    ],
    kotPrinter: {
      ipAddress: "192.168.1.301",
      port: 9100,
      isEnabled: true,
      printerName: "Cold Prep KOT"
    },
    labelPrinter: {
      ipAddress: "192.168.1.302",
      port: 9100,
      isEnabled: true,
      printerName: "Cold Prep Labels"
    },
    capabilities: ["SLICE", "DICE", "MIX", "ASSEMBLE", "CHILL"],
    averagePreparationTime: 5, // minutes - Quick assembly
    dailyOrdersProcessed: 120,
    efficiency: 94.7,
    accessPin: "9012"
  }
];

// Function to seed kitchens
const seedKitchens = async () => {
  try {
    console.log('🔍 Checking for existing restaurants and venues...');
    
    // Get first available restaurant and venue for association
    const restaurant = await Restaurant.findOne().limit(1);
    const venue = await Venue.findOne().limit(1);
    
    if (!restaurant) {
      console.log('⚠️  No restaurants found. Please seed restaurants first.');
      return;
    }
    
    if (!venue) {
      console.log('⚠️  No venues found. Please seed venues first.');
      return;
    }
    
    console.log(`📍 Using Restaurant: ${restaurant.name} (${restaurant._id})`);
    console.log(`🏢 Using Venue: ${venue.name} (${venue._id})`);
    
    // Clear existing kitchens (optional - comment out if you want to keep existing data)
    await Kitchen.deleteMany({});
    console.log('🗑️  Cleared existing kitchens');
    
    // Add restaurant and venue references to each kitchen
    const kitchensToSeed = sampleKitchens.map(kitchen => ({
      ...kitchen,
      restaurantId: restaurant._id,
      venueId: venue._id
    }));
    
    // Insert kitchens
    console.log('🏭 Creating sample kitchens...');
    const createdKitchens = await Kitchen.insertMany(kitchensToSeed);
    
    console.log('\n✅ Successfully seeded kitchens:');
    createdKitchens.forEach((kitchen, index) => {
      console.log(`   ${index + 1}. ${kitchen.name} (${kitchen.kitchenType})`);
      console.log(`      ID: ${kitchen._id}`);
      console.log(`      Equipment: ${kitchen.equipment.length} items`);
      console.log(`      Staff: ${kitchen.assignedStaff.length} members`);
      console.log(`      Hours: ${kitchen.workingHours.length} day schedules`);
      console.log(`      Avg Prep Time: ${kitchen.averagePreparationTime} min`);
      console.log(`      Efficiency: ${kitchen.efficiency}%\n`);
    });
    
    // Summary
    console.log('📊 Kitchen Seeding Summary:');
    console.log(`   • Total Kitchens Created: ${createdKitchens.length}`);
    console.log(`   • Kitchen Types: ${[...new Set(createdKitchens.map(k => k.kitchenType))].join(', ')}`);
    console.log(`   • All kitchens have KDS enabled`);
    console.log(`   • All kitchens have printer configurations`);
    console.log(`   • Working hours configured for all days`);
    
    console.log('\n🔗 Kitchen IDs for Menu Item Association:');
    createdKitchens.forEach(kitchen => {
      console.log(`   ${kitchen.kitchenType}: ${kitchen._id}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding kitchens:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Starting Kitchen Seeding Process...\n');
  
  await connectDB();
  await seedKitchens();
  
  console.log('\n✨ Kitchen seeding completed successfully!');
  console.log('💡 These kitchens can now be associated with menu items via kitchenId field');
  
  await mongoose.connection.close();
  console.log('🔌 Database connection closed');
  process.exit(0);
};

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = { seedKitchens, sampleKitchens }; 