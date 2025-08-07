const mongoose = require('mongoose');

async function checkIndexes() {
  const databases = ['inseat-db', 'inseat'];
  
  for (const dbName of databases) {
    try {
      await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
      console.log(`\n=== Connected to ${dbName} ===`);
      
      const db = mongoose.connection.db;
      
      // List all collections
      const collections = await db.listCollections().toArray();
      console.log('Collections:', collections.map(c => c.name));
      
      // Check grouporders collection if it exists
      const hasGroupOrders = collections.some(c => c.name === 'grouporders');
      
      if (hasGroupOrders) {
        const collection = db.collection('grouporders');
        const indexes = await collection.indexes();
        
        console.log('\n=== Existing indexes for grouporders collection ===');
        indexes.forEach((index, i) => {
          console.log(`${i + 1}. ${JSON.stringify(index, null, 2)}`);
        });
        
        // Check if there are any documents in the collection
        const count = await collection.countDocuments();
        console.log(`\nDocument count: ${count}`);
        
        if (count > 0) {
          const sample = await collection.findOne({});
          console.log('\nSample document structure:');
          console.log(JSON.stringify(sample, null, 2));
        }
      } else {
        console.log('No grouporders collection found in this database');
      }
      
      await mongoose.disconnect();
      
    } catch (error) {
      console.error(`Error checking ${dbName}:`, error.message);
      try {
        await mongoose.disconnect();
      } catch (e) {}
    }
  }
  
  process.exit(0);
}

checkIndexes();