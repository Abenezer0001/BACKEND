const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Create test app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import the promotion model directly
const Promotion = require('./services/restaurant-service/src/models/Promotion').default;

// Create simple debug routes
app.get('/api/debug/promotions/all', async (req, res) => {
  try {
    console.log('[DEBUG] Getting all promotions');
    
    const allPromotions = await Promotion.find({});
    res.status(200).json({
      success: true,
      count: allPromotions.length,
      promotions: allPromotions
    });
  } catch (error) {
    console.error('[DEBUG] Error getting all promotions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
});

// Simple customer-facing endpoint  
app.get('/api/promotions/splash', async (req, res) => {
  try {
    const { restaurantId, venueId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    const currentDate = new Date();
    let filter = {
      restaurantId: restaurantId,
      isActive: true,
      displayOnSplash: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    };

    // If venue is specified, filter by venue
    if (venueId) {
      filter.enabledVenues = { $in: [venueId] };
    }

    const promotions = await Promotion.find(filter)
      .populate('enabledVenues', 'name description')
      .populate('combos.menuItems', 'name price image')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json(promotions);
  } catch (error) {
    console.error('Error fetching active splash promotions:', error);
    res.status(500).json({ error: `Error fetching active splash promotions: ${error.message}` });
  }
});

// Test root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Promotion test server is running' });
});

// Start server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`  GET http://localhost:${PORT}/`);
  console.log(`  GET http://localhost:${PORT}/api/debug/promotions/all`);
  console.log(`  GET http://localhost:${PORT}/api/promotions/splash?restaurantId=507f1f77bcf86cd799439011`);
}); 