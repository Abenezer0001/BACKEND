const mongoose = require('mongoose');

const ratingComments = [
  "Absolutely delicious! One of the best dishes I've ever had.",
  "Great taste and perfect portion size. Would definitely order again.",
  "Good food but could use more seasoning. Still enjoyed it overall.",
  "Average dish, nothing special but not bad either.",
  "Not impressed. The food was cold when it arrived and lacked flavor.",
  "Exceeded my expectations! Fresh ingredients and amazing presentation.",
  "Decent meal for the price. Service was quick and friendly.",
  "Love this place! Always consistent quality and great flavors.",
  "The dish was okay but a bit overpriced for what you get.",
  "Fantastic! Every bite was perfect. This is now my favorite restaurant.",
  "Good food but the wait time was longer than expected.",
  "Really enjoyed the unique flavors. Creative and well-executed dish.",
  "Standard fare, nothing wrong with it but nothing exciting either.",
  "Outstanding quality! You can taste the fresh, high-quality ingredients.",
  "Disappointed with this order. The food didn't match the description.",
  "Perfect comfort food! Exactly what I was craving.",
  "Innovative presentation and bold flavors. Impressed!",
  "Great value for money. Large portions and tasty food.",
  "Fresh and flavorful. Will definitely be back!",
  "Nice atmosphere but the food was just okay."
];

const customerNames = [
  "Alex Johnson", "Sarah Chen", "Mike Rodriguez", "Emma Thompson", "David Kim",
  "Lisa Wang", "James Brown", "Maria Garcia", "Robert Davis", "Jennifer Lee",
  "Chris Martinez", "Amanda Wilson", "Kevin Taylor", "Michelle Anderson", "Jason Moore",
  "Samantha Rodriguez", "Daniel Chang", "Ashley Miller", "Ryan Thompson", "Nicole Adams"
];

// Rating schema based on the actual MongoDB structure
const RatingSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, required: false },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: false },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  isVerifiedPurchase: { type: Boolean, default: false },
  isAnonymous: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 },
  notHelpful: { type: Number, default: 0 }
}, { timestamps: true });

async function createRealRatingData() {
  try {
    const MONGO_URL = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Create the Rating model
    const Rating = mongoose.models.Rating || mongoose.model('Rating', RatingSchema);

    // Get existing restaurants and menu items
    const restaurantsCollection = mongoose.connection.db.collection('restaurants');
    const menuItemsCollection = mongoose.connection.db.collection('menuitems');

    const restaurants = await restaurantsCollection.find({}).toArray();
    const menuItems = await menuItemsCollection.find({}).toArray();

    console.log(`\n🏪 Found ${restaurants.length} restaurants`);
    console.log(`🍽️ Found ${menuItems.length} menu items`);

    let totalRatingsCreated = 0;

    // Group menu items by restaurant for better data organization
    const menuItemsByRestaurant = {};
    menuItems.forEach(item => {
      const restaurantId = item.restaurantId.toString();
      if (!menuItemsByRestaurant[restaurantId]) {
        menuItemsByRestaurant[restaurantId] = [];
      }
      menuItemsByRestaurant[restaurantId].push(item);
    });

    console.log('\n📝 Creating ratings for menu items...');

    for (const restaurant of restaurants) {
      const restaurantId = restaurant._id.toString();
      const restaurantMenuItems = menuItemsByRestaurant[restaurantId] || [];
      
      if (restaurantMenuItems.length === 0) {
        console.log(`   ⚠️  No menu items found for ${restaurant.name}`);
        continue;
      }

      console.log(`\n🏪 ${restaurant.name} (${restaurantMenuItems.length} menu items)`);

      for (const menuItem of restaurantMenuItems) {
        // Generate 3-12 ratings per menu item for variety
        const numRatings = Math.floor(Math.random() * 10) + 3;
        console.log(`   📝 Creating ${numRatings} ratings for "${menuItem.name}"`);

        for (let i = 0; i < numRatings; i++) {
          // Generate realistic rating distribution (weighted towards higher ratings)
          const ratingWeights = [0.05, 0.08, 0.12, 0.35, 0.40]; // 1-5 star weights
          const random = Math.random();
          let rating = 5;
          let cumulative = 0;
          for (let r = 0; r < ratingWeights.length; r++) {
            cumulative += ratingWeights[r];
            if (random < cumulative) {
              rating = r + 1;
              break;
            }
          }

          const comment = ratingComments[Math.floor(Math.random() * ratingComments.length)];
          const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
          const isVerified = Math.random() > 0.3; // 70% chance of verified purchase
          const helpful = Math.floor(Math.random() * 15); // 0-14 helpful votes
          const notHelpful = Math.floor(Math.random() * 3); // 0-2 not helpful votes

          const ratingData = {
            menuItemId: new mongoose.Types.ObjectId(menuItem._id),
            restaurantId: new mongoose.Types.ObjectId(restaurant._id),
            customerName: customerName,
            customerEmail: `${customerName.toLowerCase().replace(' ', '.')}@example.com`,
            rating: rating,
            comment: comment,
            isVerifiedPurchase: isVerified,
            isAnonymous: Math.random() > 0.8, // 20% anonymous
            helpful: helpful,
            notHelpful: notHelpful,
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
            updatedAt: new Date()
          };

          try {
            const newRating = new Rating(ratingData);
            await newRating.save();
            totalRatingsCreated++;
            console.log(`      ✅ ${rating}⭐ ${isVerified ? '✓' : '○'} "${comment.substring(0, 25)}..." (+${helpful})`);
          } catch (error) {
            console.log(`      ❌ Failed to create rating: ${error.message}`);
          }
        }
      }
    }

    console.log(`\n🎉 Successfully created ${totalRatingsCreated} ratings!`);
    
    // Now let's create rating cache/aggregation data
    console.log('\n📊 Creating rating aggregations...');
    const ratingsCollection = mongoose.connection.db.collection('ratings');
    const ratingCacheCollection = mongoose.connection.db.collection('ratingcaches');

    // Aggregate ratings for each menu item and restaurant
    for (const menuItem of menuItems) {
      const ratings = await ratingsCollection.find({ 
        menuItemId: new mongoose.Types.ObjectId(menuItem._id) 
      }).toArray();

      if (ratings.length > 0) {
        const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / ratings.length;
        
        // Create rating distribution
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach(r => distribution[r.rating]++);

        // Calculate Wilson score for ranking (simplified)
        const wilsonScore = averageRating - (1.96 * Math.sqrt((averageRating * (5 - averageRating)) / ratings.length));

        const cacheData = {
          menuItemId: new mongoose.Types.ObjectId(menuItem._id),
          restaurantId: new mongoose.Types.ObjectId(menuItem.restaurantId),
          average: Math.round(averageRating * 100) / 100,
          count: ratings.length,
          distribution: distribution,
          wilsonScore: Math.max(0, wilsonScore),
          bayesianAverage: averageRating, // Simplified
          recentTrend: (Math.random() - 0.5) * 0.5, // Random trend between -0.25 and +0.25
          lastUpdated: new Date()
        };

        try {
          await ratingCacheCollection.replaceOne(
            { menuItemId: new mongoose.Types.ObjectId(menuItem._id) },
            cacheData,
            { upsert: true }
          );
          console.log(`   📊 Updated cache for "${menuItem.name}": ${averageRating.toFixed(1)}⭐ (${ratings.length} reviews)`);
        } catch (error) {
          console.log(`   ❌ Failed to update cache: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Rating data creation completed!');
    console.log('\n📱 The following pages should now have data:');
    console.log('   • Rating Analytics Dashboard - Overall stats and trends');
    console.log('   • Review Management - Individual review management');
    console.log('   • Menu Performance - Menu item rating analysis');
    console.log('   • Customer Insights - Customer rating patterns');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating rating data:', error);
    process.exit(1);
  }
}

createRealRatingData();