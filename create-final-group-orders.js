const mongoose = require('mongoose');

async function createFinalGroupOrders() {
  try {
    const MONGO_URL = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    const groupOrdersCollection = mongoose.connection.db.collection('grouporders');
    const restaurantsCollection = mongoose.connection.db.collection('restaurants');
    const menuItemsCollection = mongoose.connection.db.collection('menuitems');

    // Get restaurants with menu items
    const restaurants = await restaurantsCollection.find({}).toArray();
    const menuItems = await menuItemsCollection.find({}).toArray();

    // Clear existing
    await groupOrdersCollection.deleteMany({});
    console.log('🗑️ Cleared existing group orders');

    const participantNames = [
      "Alice Johnson", "Bob Smith", "Carol Davis", "David Wilson", "Emma Brown",
      "Frank Miller", "Grace Lee", "Henry Garcia", "Ivy Chen", "Jack Rodriguez",
      "Kate Anderson", "Liam Taylor", "Maya Thompson", "Noah Martinez", "Olivia Jones"
    ];

    let totalCreated = 0;

    // Group menu items by restaurant
    const menuByRestaurant = {};
    menuItems.forEach(item => {
      const restId = item.restaurantId.toString();
      if (!menuByRestaurant[restId]) menuByRestaurant[restId] = [];
      menuByRestaurant[restId].push(item);
    });

    for (const restaurant of restaurants) {
      const restaurantMenuItems = menuByRestaurant[restaurant._id.toString()] || [];
      
      if (restaurantMenuItems.length === 0) {
        console.log(`   ⚠️  No menu items for ${restaurant.name}`);
        continue;
      }

      // Create 3-5 group orders per restaurant with menu items
      const numOrders = Math.floor(Math.random() * 3) + 3;
      console.log(`\n🏪 Creating ${numOrders} group orders for "${restaurant.name}"`);

      for (let i = 0; i < numOrders; i++) {
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Add inviteCode
        const sessionId = new mongoose.Types.ObjectId();
        const statusOptions = ['active', 'locked', 'completed', 'cancelled'];
        const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
        const organizerName = participantNames[Math.floor(Math.random() * participantNames.length)];
        
        // Create 2-7 participants
        const numParticipants = Math.floor(Math.random() * 6) + 2;
        const participants = [];
        let totalAmount = 0;

        for (let p = 0; p < numParticipants; p++) {
          let participantName;
          if (p === 0) {
            participantName = organizerName;
          } else {
            // Avoid duplicate names
            do {
              participantName = participantNames[Math.floor(Math.random() * participantNames.length)];
            } while (participants.some(existing => existing.name === participantName));
          }

          const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items per person
          const items = [];
          let participantTotal = 0;

          for (let j = 0; j < numItems; j++) {
            const randomItem = restaurantMenuItems[Math.floor(Math.random() * restaurantMenuItems.length)];
            const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
            const price = Math.floor(Math.random() * 20) + 8; // $8-28 per item

            items.push({
              menuItemId: new mongoose.Types.ObjectId(randomItem._id),
              menuItemName: randomItem.name,
              quantity: quantity,
              price: price,
              subtotal: price * quantity,
              specialInstructions: Math.random() > 0.7 ? 
                ["Extra spicy", "No onions", "On the side", "Well done", "Light sauce"][Math.floor(Math.random() * 5)] : ""
            });
            participantTotal += price * quantity;
          }

          participants.push({
            _id: new mongoose.Types.ObjectId(),
            name: participantName,
            email: `${participantName.toLowerCase().replace(' ', '.')}@example.com`,
            items: items,
            totalAmount: participantTotal,
            joinedAt: new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000) // Within last 4 hours
          });
          totalAmount += participantTotal;
        }

        const groupOrderData = {
          _id: new mongoose.Types.ObjectId(),
          joinCode: joinCode,
          inviteCode: inviteCode, // Add required inviteCode
          sessionId: sessionId,
          restaurantId: new mongoose.Types.ObjectId(restaurant._id),
          restaurantName: restaurant.name,
          organizerId: participants[0]._id,
          organizerName: organizerName,
          organizerEmail: `${organizerName.toLowerCase().replace(' ', '.')}@example.com`,
          status: status,
          participants: participants,
          totalAmount: totalAmount,
          totalParticipants: participants.length,
          expiresAt: new Date(Date.now() + (status === 'active' ? 
            Math.floor(Math.random() * 3 + 1) * 60 * 60 * 1000 : // 1-4 hours from now if active
            -Math.floor(Math.random() * 24) * 60 * 60 * 1000)), // Up to 24 hours ago if not active
          settings: {
            maxParticipants: Math.floor(Math.random() * 8) + 6, // 6-13 max
            allowLateJoin: Math.random() > 0.25,
            autoLock: Math.random() > 0.6,
            splitBill: Math.random() > 0.15
          },
          orderNotes: Math.random() > 0.6 ? "Please prepare all items at the same time" : "",
          createdAt: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000), // Within last 3 days
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

    // Calculate comprehensive statistics
    const allOrders = await groupOrdersCollection.find({}).toArray();
    
    const statusCounts = {
      active: allOrders.filter(o => o.status === 'active').length,
      locked: allOrders.filter(o => o.status === 'locked').length,
      completed: allOrders.filter(o => o.status === 'completed').length,
      cancelled: allOrders.filter(o => o.status === 'cancelled').length
    };

    const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedRevenue = allOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);
    const totalParticipants = allOrders.reduce((sum, o) => sum + o.totalParticipants, 0);
    const avgOrderValue = totalRevenue / allOrders.length;
    const conversionRate = allOrders.length > 0 ? (statusCounts.completed / allOrders.length * 100) : 0;

    console.log('\n📊 Group Order Analytics:');
    console.log(`   🟢 Active Groups: ${statusCounts.active}`);
    console.log(`   🔒 Locked Groups: ${statusCounts.locked}`);
    console.log(`   ✅ Completed Groups: ${statusCounts.completed}`);
    console.log(`   ❌ Cancelled Groups: ${statusCounts.cancelled}`);
    console.log(`   👥 Total Participants: ${totalParticipants}`);
    console.log(`   💰 Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`   💵 Completed Revenue: $${completedRevenue.toFixed(2)}`);
    console.log(`   📊 Average Order Value: $${avgOrderValue.toFixed(2)}`);
    console.log(`   📈 Conversion Rate: ${conversionRate.toFixed(1)}%`);

    // Show active orders for testing
    const activeOrders = allOrders.filter(o => o.status === 'active');
    if (activeOrders.length > 0) {
      console.log('\n🔥 Active Group Orders (can be joined):');
      activeOrders.forEach(order => {
        const timeLeft = Math.max(0, (order.expiresAt - new Date()) / (1000 * 60));
        console.log(`   • Code: ${order.joinCode} | ${order.restaurantName} | ${order.totalParticipants}/${order.settings.maxParticipants} people | $${order.totalAmount.toFixed(2)} | ${Math.floor(timeLeft)}min left`);
      });
    }

    console.log('\n✅ Group ordering dashboard is now fully populated!');
    console.log('\n📱 Dashboard should show:');
    console.log('   • Live active group counts');
    console.log('   • Real participant numbers');
    console.log('   • Actual revenue data');
    console.log('   • Working conversion metrics');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createFinalGroupOrders();