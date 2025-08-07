const mongoose = require('mongoose');

async function createGroupOrdersFixed() {
  try {
    const MONGO_URL = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    const groupOrdersCollection = mongoose.connection.db.collection('grouporders');
    const restaurantsCollection = mongoose.connection.db.collection('restaurants');
    const menuItemsCollection = mongoose.connection.db.collection('menuitems');

    // Get existing data
    const restaurants = await restaurantsCollection.find({}).limit(5).toArray();
    const menuItems = await menuItemsCollection.find({}).toArray();

    // Clear existing and recreate
    await groupOrdersCollection.deleteMany({});
    console.log('🗑️ Cleared existing group orders');

    const participantNames = [
      "Alice Johnson", "Bob Smith", "Carol Davis", "David Wilson", "Emma Brown",
      "Frank Miller", "Grace Lee", "Henry Garcia", "Ivy Chen", "Jack Rodriguez",
      "Kate Anderson", "Liam Taylor", "Maya Thompson", "Noah Martinez", "Olivia Jones"
    ];

    let totalCreated = 0;

    for (const restaurant of restaurants) {
      const restaurantMenuItems = menuItems.filter(item => 
        item.restaurantId.toString() === restaurant._id.toString()
      );

      if (restaurantMenuItems.length === 0) {
        console.log(`   ⚠️  No menu items for ${restaurant.name}`);
        continue;
      }

      const numOrders = Math.floor(Math.random() * 3) + 2; // 2-4 orders per restaurant
      console.log(`\n🏪 Creating ${numOrders} group orders for "${restaurant.name}"`);

      for (let i = 0; i < numOrders; i++) {
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const sessionId = new mongoose.Types.ObjectId(); // Generate unique sessionId
        const status = ['active', 'locked', 'completed'][Math.floor(Math.random() * 3)];
        const organizerName = participantNames[Math.floor(Math.random() * participantNames.length)];
        
        const numParticipants = Math.floor(Math.random() * 6) + 2;
        const participants = [];
        let totalAmount = 0;

        for (let p = 0; p < numParticipants; p++) {
          const participantName = p === 0 ? organizerName : participantNames[Math.floor(Math.random() * participantNames.length)];
          const numItems = Math.floor(Math.random() * 3) + 1;
          const items = [];
          let participantTotal = 0;

          for (let j = 0; j < numItems; j++) {
            const randomItem = restaurantMenuItems[Math.floor(Math.random() * restaurantMenuItems.length)];
            const quantity = Math.floor(Math.random() * 2) + 1;
            const price = Math.floor(Math.random() * 15) + 10;

            items.push({
              menuItemId: new mongoose.Types.ObjectId(randomItem._id),
              menuItemName: randomItem.name,
              quantity: quantity,
              price: price,
              specialInstructions: Math.random() > 0.8 ? ["Extra spicy", "No onions", "On the side"][Math.floor(Math.random() * 3)] : ""
            });
            participantTotal += price * quantity;
          }

          participants.push({
            _id: new mongoose.Types.ObjectId(),
            name: participantName,
            email: `${participantName.toLowerCase().replace(' ', '.')}@example.com`,
            items: items,
            totalAmount: participantTotal,
            joinedAt: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000)
          });
          totalAmount += participantTotal;
        }

        const groupOrderData = {
          _id: new mongoose.Types.ObjectId(),
          joinCode: joinCode,
          sessionId: sessionId, // Add the required sessionId
          restaurantId: new mongoose.Types.ObjectId(restaurant._id),
          restaurantName: restaurant.name,
          organizerId: participants[0]._id,
          organizerName: organizerName,
          organizerEmail: `${organizerName.toLowerCase().replace(' ', '.')}@example.com`,
          status: status,
          participants: participants,
          totalAmount: totalAmount,
          totalParticipants: participants.length,
          expiresAt: new Date(Date.now() + (status === 'active' ? 2 * 60 * 60 * 1000 : -1 * 60 * 60 * 1000)),
          settings: {
            maxParticipants: Math.floor(Math.random() * 6) + 8, // 8-13 max
            allowLateJoin: Math.random() > 0.3,
            autoLock: Math.random() > 0.7,
            splitBill: Math.random() > 0.2
          },
          createdAt: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000), // Within last 2 days
          updatedAt: new Date()
        };

        try {
          await groupOrdersCollection.insertOne(groupOrderData);
          totalCreated++;
          console.log(`   ✅ "${joinCode}" (${status}) - ${participants.length} people, $${totalAmount.toFixed(2)}`);
        } catch (error) {
          console.log(`   ❌ Failed: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 Successfully created ${totalCreated} group orders!`);

    // Get final statistics
    const allOrders = await groupOrdersCollection.find({}).toArray();
    
    const activeOrders = allOrders.filter(o => o.status === 'active');
    const completedOrders = allOrders.filter(o => o.status === 'completed');
    const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalParticipants = allOrders.reduce((sum, o) => sum + o.totalParticipants, 0);
    const conversionRate = allOrders.length > 0 ? (completedOrders.length / allOrders.length * 100) : 0;

    console.log('\n📊 Final Statistics:');
    console.log(`   🟢 Active Groups: ${activeOrders.length}`);
    console.log(`   👥 Total Participants: ${totalParticipants}`);
    console.log(`   💰 Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`   📈 Conversion Rate: ${conversionRate.toFixed(1)}%`);

    if (activeOrders.length > 0) {
      console.log('\n🔥 Active Group Orders:');
      activeOrders.forEach(order => {
        console.log(`   • ${order.joinCode} - ${order.restaurantName} (${order.totalParticipants} people, $${order.totalAmount.toFixed(2)})`);
      });
    }

    console.log('\n✅ Group ordering dashboard should now show live data!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createGroupOrdersFixed();