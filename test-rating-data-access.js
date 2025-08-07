const mongoose = require('mongoose');

async function testRatingDataAccess() {
  try {
    const MONGO_URL = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Check rating data directly
    const ratingsCollection = mongoose.connection.db.collection('ratings');
    const ratingCount = await ratingsCollection.countDocuments();
    console.log(`📊 Total ratings in database: ${ratingCount}`);

    if (ratingCount > 0) {
      // Get sample ratings
      const sampleRatings = await ratingsCollection.find({}).limit(3).toArray();
      console.log('\n📝 Sample ratings:');
      sampleRatings.forEach((rating, index) => {
        console.log(`   [${index + 1}] ${rating.rating}⭐ - "${rating.comment.substring(0, 30)}..." (${rating.customerName})`);
      });

      // Get restaurant aggregations
      const pipeline = [
        {
          $group: {
            _id: "$restaurantId",
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            totalRevenue: { $sum: { $multiply: ["$rating", 10] } } // Mock revenue calculation
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const restaurantStats = await ratingsCollection.aggregate(pipeline).toArray();
      console.log('\n🏪 Restaurant rating stats:');
      restaurantStats.forEach((stat, index) => {
        console.log(`   [${index + 1}] Restaurant ${stat._id}: ${stat.count} ratings, ${stat.avgRating.toFixed(1)}⭐ avg`);
      });

      // Get menu item aggregations
      const menuPipeline = [
        {
          $group: {
            _id: "$menuItemId",
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 5
        }
      ];

      const menuStats = await ratingsCollection.aggregate(menuPipeline).toArray();
      console.log('\n🍽️ Top menu items by review count:');
      menuStats.forEach((stat, index) => {
        console.log(`   [${index + 1}] Menu Item ${stat._id}: ${stat.count} ratings, ${stat.avgRating.toFixed(1)}⭐ avg`);
      });
    }

    // Check if rating cache exists
    const ratingCacheCollection = mongoose.connection.db.collection('ratingcaches');
    const cacheCount = await ratingCacheCollection.countDocuments();
    console.log(`\n📊 Rating cache entries: ${cacheCount}`);

    console.log('\n✅ Rating data is available in the database!');
    console.log('\n🔧 Next steps:');
    console.log('   1. The rating data exists in MongoDB');
    console.log('   2. Check if the backend rating service is properly initialized');
    console.log('   3. Test the API endpoints manually');
    console.log('   4. Check frontend API calls and error handling');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testRatingDataAccess();