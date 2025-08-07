const mongoose = require('mongoose');

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0";

// Simple schema definitions
const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String, required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  enabledVenues: [{ type: mongoose.Schema.Types.ObjectId }],
  isActive: { type: Boolean, default: true },
  displayOnSplash: { type: Boolean, default: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  combos: [{
    name: String,
    description: String,
    menuItems: [{ type: mongoose.Schema.Types.ObjectId }],
    discountRate: Number
  }],
}, { timestamps: true });

const Promotion = mongoose.model('Promotion', promotionSchema);

async function createTestPromotions() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing promotions
    await Promotion.deleteMany({});
    console.log('Cleared existing promotions');

    // Create test promotions
    const testPromotions = [
      {
        title: "Summer Special Combo",
        description: "Get 20% off on our summer combo meal",
        imageUrl: "https://example.com/summer-combo.jpg",
        restaurantId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        enabledVenues: [],
        isActive: true,
        displayOnSplash: true,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        combos: [
          {
            name: "Summer Delight",
            description: "Burger + Fries + Drink",
            menuItems: [
              new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
              new mongoose.Types.ObjectId("507f1f77bcf86cd799439013")
            ],
            discountRate: 20
          }
        ]
      },
      {
        title: "Weekend Special",
        description: "Exclusive weekend offer with 15% discount",
        imageUrl: "https://example.com/weekend-special.jpg",
        restaurantId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        enabledVenues: [new mongoose.Types.ObjectId("507f1f77bcf86cd799439014")],
        isActive: true,
        displayOnSplash: true,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        combos: [
          {
            name: "Weekend Combo",
            description: "Pizza + Salad + Dessert",
            menuItems: [
              new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"),
              new mongoose.Types.ObjectId("507f1f77bcf86cd799439016")
            ],
            discountRate: 15
          }
        ]
      },
      {
        title: "Happy Hour Deal",
        description: "Special pricing during happy hours",
        imageUrl: "https://example.com/happy-hour.jpg",
        restaurantId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        enabledVenues: [],
        isActive: true,
        displayOnSplash: false, // Not for splash screen
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        combos: []
      }
    ];

    // Insert test promotions
    const result = await Promotion.insertMany(testPromotions);
    console.log(`Created ${result.length} test promotions:`);
    result.forEach((promo, index) => {
      console.log(`  ${index + 1}. ${promo.title} (ID: ${promo._id})`);
    });

    console.log('\nTest promotions created successfully!');
    console.log('\nYou can now test the endpoints with:');
    console.log('  GET /api/promotions/splash?restaurantId=507f1f77bcf86cd799439011');
    console.log('  GET /api/promotions/all?restaurantId=507f1f77bcf86cd799439011');
    console.log('  GET /api/debug/promotions/all');

  } catch (error) {
    console.error('Error creating test promotions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestPromotions(); 