const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Sample data for creating realistic ratings
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
  "Disappointed with this order. The food didn't match the description."
];

const customerNames = [
  "Alex Johnson", "Sarah Chen", "Mike Rodriguez", "Emma Thompson", "David Kim",
  "Lisa Wang", "James Brown", "Maria Garcia", "Robert Davis", "Jennifer Lee",
  "Chris Martinez", "Amanda Wilson", "Kevin Taylor", "Michelle Anderson", "Jason Moore"
];

async function createRatingData() {
  try {
    console.log('🚀 Starting rating data creation...');

    // First, get existing restaurants
    const restaurantsResponse = await axios.get(`${API_BASE}/v1/restaurants`, {
      headers: {
        'Authorization': 'Bearer restaurant_admin_token'
      }
    });

    if (!restaurantsResponse.data?.restaurants?.length) {
      console.log('❌ No restaurants found. Please create some restaurants first.');
      return;
    }

    const restaurants = restaurantsResponse.data.restaurants.slice(0, 3); // Use first 3 restaurants
    console.log(`📍 Found ${restaurants.length} restaurants to create ratings for`);

    for (const restaurant of restaurants) {
      console.log(`\n🏪 Processing restaurant: ${restaurant.name} (${restaurant._id})`);

      // Get menu items for this restaurant
      try {
        const menuItemsResponse = await axios.get(`${API_BASE}/v1/menu-items/restaurant/${restaurant._id}`, {
          headers: {
            'Authorization': 'Bearer restaurant_admin_token'
          }
        });

        if (!menuItemsResponse.data?.menuItems?.length) {
          console.log(`   ⚠️  No menu items found for ${restaurant.name}`);
          continue;
        }

        const menuItems = menuItemsResponse.data.menuItems.slice(0, 8); // Use first 8 menu items
        console.log(`   🍽️  Found ${menuItems.length} menu items`);

        // Create ratings for each menu item
        for (const menuItem of menuItems) {
          const numRatings = Math.floor(Math.random() * 8) + 3; // 3-10 ratings per item
          console.log(`      📝 Creating ${numRatings} ratings for "${menuItem.name}"`);

          for (let i = 0; i < numRatings; i++) {
            // Generate realistic rating distribution (more 4s and 5s)
            const ratingWeights = [0.05, 0.1, 0.15, 0.35, 0.35]; // 1-5 star weights
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

            const ratingData = {
              menuItemId: menuItem._id,
              restaurantId: restaurant._id,
              rating: rating,
              comment: comment,
              customerName: customerName,
              customerEmail: `${customerName.toLowerCase().replace(' ', '.')}@example.com`
            };

            try {
              const response = await axios.post(`${API_BASE}/v1/ratings`, ratingData, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer customer_token'
                }
              });

              if (response.status === 201) {
                console.log(`         ✅ Created ${rating}⭐ rating: "${comment.substring(0, 30)}..."`);
              }
            } catch (error) {
              if (error.response?.status === 401) {
                console.log(`         ⚠️  Auth error - creating rating without token`);
                // Try without auth for testing
                try {
                  const response = await axios.post(`${API_BASE}/v1/ratings`, ratingData);
                  console.log(`         ✅ Created ${rating}⭐ rating (no auth): "${comment.substring(0, 30)}..."`);
                } catch (innerError) {
                  console.log(`         ❌ Failed to create rating: ${innerError.message}`);
                }
              } else {
                console.log(`         ❌ Failed to create rating: ${error.response?.data?.message || error.message}`);
              }
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.log(`   ❌ Failed to get menu items for ${restaurant.name}: ${error.message}`);
      }
    }

    console.log('\n🎉 Rating data creation completed!');
    console.log('\n📊 You should now see data in:');
    console.log('   - Rating Analytics Dashboard');
    console.log('   - Review Management');
    console.log('   - Menu Performance');
    console.log('   - Customer Insights');

  } catch (error) {
    console.error('❌ Error creating rating data:', error.response?.data || error.message);
  }
}

// Also create a simpler version that bypasses auth if needed
async function createRatingDataSimple() {
  try {
    console.log('🚀 Creating simple rating data (bypassing detailed restaurant lookup)...');
    
    // Use sample IDs - replace these with actual IDs from your database
    const sampleData = [
      {
        restaurantId: '507f1f77bcf86cd799439011', // Replace with actual restaurant ID
        menuItemId: '507f1f77bcf86cd799439012',   // Replace with actual menu item ID
        rating: 5,
        comment: "Absolutely amazing! Best pizza in town.",
      },
      {
        restaurantId: '507f1f77bcf86cd799439011',
        menuItemId: '507f1f77bcf86cd799439013',
        rating: 4,
        comment: "Great pasta, very flavorful sauce.",
      },
      {
        restaurantId: '507f1f77bcf86cd799439011',
        menuItemId: '507f1f77bcf86cd799439014',
        rating: 3,
        comment: "Good burger but could be better seasoned.",
      }
    ];

    for (const data of sampleData) {
      try {
        const response = await axios.post(`${API_BASE}/v1/ratings`, data, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ Created rating: ${data.rating}⭐ - ${data.comment}`);
      } catch (error) {
        console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check if we should run simple or full version
const args = process.argv.slice(2);
if (args.includes('--simple')) {
  createRatingDataSimple();
} else {
  createRatingData();
}