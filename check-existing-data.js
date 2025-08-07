const mongoose = require('mongoose');

async function checkExistingData() {
  try {
    const MONGO_URL = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Available collections:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Check restaurants
    console.log('\n🏪 Checking restaurants...');
    const restaurantsCollection = mongoose.connection.db.collection('restaurants');
    const restaurants = await restaurantsCollection.find({}).limit(5).toArray();
    
    if (restaurants.length > 0) {
      console.log(`Found ${restaurants.length} restaurants:`);
      restaurants.forEach((restaurant, index) => {
        console.log(`   [${index + 1}] ${restaurant.name} (${restaurant._id})`);
      });
    } else {
      console.log('   No restaurants found');
    }

    // Check menu items
    console.log('\n🍽️ Checking menu items...');
    const menuItemsCollection = mongoose.connection.db.collection('menuitems');
    const menuItems = await menuItemsCollection.find({}).limit(10).toArray();
    
    if (menuItems.length > 0) {
      console.log(`Found ${menuItems.length} menu items:`);
      menuItems.forEach((item, index) => {
        console.log(`   [${index + 1}] ${item.name} (${item._id}) - Restaurant: ${item.restaurantId}`);
      });
    } else {
      console.log('   No menu items found');
    }

    // Check existing ratings
    console.log('\n⭐ Checking existing ratings...');
    const ratingsCollection = mongoose.connection.db.collection('ratings');
    const ratings = await ratingsCollection.find({}).limit(5).toArray();
    
    if (ratings.length > 0) {
      console.log(`Found ${ratings.length} existing ratings:`);
      ratings.forEach((rating, index) => {
        console.log(`   [${index + 1}] ${rating.rating}⭐ - ${rating.comment?.substring(0, 30)}...`);
      });
    } else {
      console.log('   No ratings found');
    }

    // Check group orders
    console.log('\n👥 Checking group orders...');
    const groupOrdersCollection = mongoose.connection.db.collection('grouporders');
    const groupOrders = await groupOrdersCollection.find({}).limit(5).toArray();
    
    if (groupOrders.length > 0) {
      console.log(`Found ${groupOrders.length} group orders:`);
      groupOrders.forEach((order, index) => {
        console.log(`   [${index + 1}] ${order.joinCode} - Status: ${order.status}`);
      });
    } else {
      console.log('   No group orders found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkExistingData();