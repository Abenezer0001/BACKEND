const mongoose = require('mongoose');

// Group order schema based on typical structure
const GroupOrderSchema = new mongoose.Schema({
  joinCode: { type: String, required: true, unique: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  venueId: { type: mongoose.Schema.Types.ObjectId, required: false },
  tableId: { type: mongoose.Schema.Types.ObjectId, required: false },
  organizerId: { type: mongoose.Schema.Types.ObjectId, required: false },
  organizerName: { type: String, required: true },
  organizerEmail: { type: String, required: false },
  status: { 
    type: String, 
    enum: ['active', 'locked', 'completed', 'cancelled'], 
    default: 'active' 
  },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, required: false },
    name: { type: String, required: true },
    email: { type: String, required: false },
    items: [{
      menuItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
      quantity: { type: Number, default: 1 },
      price: { type: Number, required: true },
      specialInstructions: { type: String, default: '' }
    }],
    totalAmount: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now }
  }],
  totalAmount: { type: Number, default: 0 },
  totalParticipants: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  settings: {
    maxParticipants: { type: Number, default: 10 },
    allowLateJoin: { type: Boolean, default: true },
    autoLock: { type: Boolean, default: false },
    splitBill: { type: Boolean, default: true }
  }
}, { timestamps: true });

async function createGroupOrderData() {
  try {
    const MONGO_URL = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Create the GroupOrder model
    const GroupOrder = mongoose.models.GroupOrder || mongoose.model('GroupOrder', GroupOrderSchema);

    // Get existing restaurants and menu items
    const restaurantsCollection = mongoose.connection.db.collection('restaurants');
    const menuItemsCollection = mongoose.connection.db.collection('menuitems');
    const tablesCollection = mongoose.connection.db.collection('tables');

    const restaurants = await restaurantsCollection.find({}).limit(5).toArray();
    const menuItems = await menuItemsCollection.find({}).toArray();
    const tables = await tablesCollection.find({}).limit(10).toArray();

    console.log(`\n🏪 Found ${restaurants.length} restaurants`);
    console.log(`🍽️ Found ${menuItems.length} menu items`);
    console.log(`🪑 Found ${tables.length} tables`);

    // Sample participant names
    const participantNames = [
      "Alice Johnson", "Bob Smith", "Carol Davis", "David Wilson", "Emma Brown",
      "Frank Miller", "Grace Lee", "Henry Garcia", "Ivy Chen", "Jack Rodriguez",
      "Kate Anderson", "Liam Taylor", "Maya Thompson", "Noah Martinez", "Olivia Jones"
    ];

    const statusOptions = ['active', 'locked', 'completed', 'cancelled'];
    const statusWeights = [0.3, 0.2, 0.4, 0.1]; // Most completed, some active, few locked/cancelled

    let totalGroupOrdersCreated = 0;

    for (const restaurant of restaurants) {
      // Create 2-4 group orders per restaurant
      const numGroupOrders = Math.floor(Math.random() * 3) + 2;
      console.log(`\n🏪 Creating ${numGroupOrders} group orders for "${restaurant.name}"`);

      // Get menu items for this restaurant
      const restaurantMenuItems = menuItems.filter(item => 
        item.restaurantId.toString() === restaurant._id.toString()
      );

      if (restaurantMenuItems.length === 0) {
        console.log(`   ⚠️  No menu items found for ${restaurant.name}`);
        continue;
      }

      for (let i = 0; i < numGroupOrders; i++) {
        // Generate unique join code
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Select random status
        const random = Math.random();
        let status = 'completed';
        let cumulative = 0;
        for (let s = 0; s < statusWeights.length; s++) {
          cumulative += statusWeights[s];
          if (random < cumulative) {
            status = statusOptions[s];
            break;
          }
        }

        // Generate organizer
        const organizerName = participantNames[Math.floor(Math.random() * participantNames.length)];
        
        // Generate participants (2-8 people)
        const numParticipants = Math.floor(Math.random() * 7) + 2;
        const selectedParticipants = [];
        const usedNames = new Set([organizerName]);

        // Add organizer as first participant
        const organizerItems = [];
        const numOrganizerItems = Math.floor(Math.random() * 3) + 1;
        let organizerTotal = 0;

        for (let j = 0; j < numOrganizerItems; j++) {
          const randomItem = restaurantMenuItems[Math.floor(Math.random() * restaurantMenuItems.length)];
          const quantity = Math.floor(Math.random() * 2) + 1;
          const price = Math.floor(Math.random() * 20) + 8; // $8-28 per item
          
          organizerItems.push({
            menuItemId: new mongoose.Types.ObjectId(randomItem._id),
            quantity: quantity,
            price: price,
            specialInstructions: Math.random() > 0.7 ? "No onions please" : ""
          });
          organizerTotal += price * quantity;
        }

        selectedParticipants.push({
          name: organizerName,
          email: `${organizerName.toLowerCase().replace(' ', '.')}@example.com`,
          items: organizerItems,
          totalAmount: organizerTotal,
          joinedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Within last 7 days
        });

        // Add other participants
        for (let p = 1; p < numParticipants; p++) {
          let participantName;
          do {
            participantName = participantNames[Math.floor(Math.random() * participantNames.length)];
          } while (usedNames.has(participantName));
          usedNames.add(participantName);

          const participantItems = [];
          const numItems = Math.floor(Math.random() * 4) + 1;
          let participantTotal = 0;

          for (let j = 0; j < numItems; j++) {
            const randomItem = restaurantMenuItems[Math.floor(Math.random() * restaurantMenuItems.length)];
            const quantity = Math.floor(Math.random() * 2) + 1;
            const price = Math.floor(Math.random() * 20) + 8;
            
            participantItems.push({
              menuItemId: new mongoose.Types.ObjectId(randomItem._id),
              quantity: quantity,
              price: price,
              specialInstructions: Math.random() > 0.8 ? ["Extra spicy", "No sauce", "On the side", "Well done"][Math.floor(Math.random() * 4)] : ""
            });
            participantTotal += price * quantity;
          }

          selectedParticipants.push({
            name: participantName,
            email: `${participantName.toLowerCase().replace(' ', '.')}@example.com`,
            items: participantItems,
            totalAmount: participantTotal,
            joinedAt: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000 + (p * 60 * 60 * 1000)) // Staggered join times
          });
        }

        const totalAmount = selectedParticipants.reduce((sum, p) => sum + p.totalAmount, 0);

        // Select random table if available
        const randomTable = tables.length > 0 ? tables[Math.floor(Math.random() * tables.length)] : null;

        const groupOrderData = {
          joinCode: joinCode,
          restaurantId: new mongoose.Types.ObjectId(restaurant._id),
          tableId: randomTable ? new mongoose.Types.ObjectId(randomTable._id) : null,
          organizerName: organizerName,
          organizerEmail: `${organizerName.toLowerCase().replace(' ', '.')}@example.com`,
          status: status,
          participants: selectedParticipants,
          totalAmount: totalAmount,
          totalParticipants: selectedParticipants.length,
          expiresAt: new Date(Date.now() + (status === 'active' ? 2 * 60 * 60 * 1000 : -1 * 60 * 60 * 1000)), // 2 hours from now if active, expired if not
          settings: {
            maxParticipants: Math.floor(Math.random() * 8) + 5, // 5-12 max participants
            allowLateJoin: Math.random() > 0.3,
            autoLock: Math.random() > 0.7,
            splitBill: Math.random() > 0.2
          },
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last 7 days
          updatedAt: new Date()
        };

        try {
          const newGroupOrder = new GroupOrder(groupOrderData);
          await newGroupOrder.save();
          totalGroupOrdersCreated++;
          
          console.log(`   ✅ Created group order "${joinCode}" (${status})`);
          console.log(`      👥 ${selectedParticipants.length} participants, $${totalAmount.toFixed(2)} total`);
          console.log(`      🍽️  Organizer: ${organizerName}`);
          
        } catch (error) {
          console.log(`   ❌ Failed to create group order: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 Successfully created ${totalGroupOrdersCreated} group orders!`);
    
    // Show summary statistics
    const allGroupOrders = await GroupOrder.find({});
    const statusCounts = {};
    allGroupOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    console.log('\n📊 Group Order Statistics:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} orders`);
    });

    const totalRevenue = allGroupOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const avgOrderValue = totalRevenue / allGroupOrders.length;
    const totalParticipants = allGroupOrders.reduce((sum, order) => sum + order.totalParticipants, 0);

    console.log(`\n💰 Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`📊 Average Order Value: $${avgOrderValue.toFixed(2)}`);
    console.log(`👥 Total Participants: ${totalParticipants}`);
    console.log(`📈 Conversion Rate: ${((statusCounts.completed || 0) / allGroupOrders.length * 100).toFixed(1)}%`);

    console.log('\n✅ Group ordering data creation completed!');
    console.log('\n📱 The Group Ordering Dashboard should now show:');
    console.log('   • Active group orders');
    console.log('   • Total participants and revenue');
    console.log('   • Conversion rate statistics');
    console.log('   • Recent group order activity');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating group order data:', error);
    process.exit(1);
  }
}

createGroupOrderData();