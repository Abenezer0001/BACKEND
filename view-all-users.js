const { MongoClient } = require('mongodb');

const connectionString = 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

async function viewAllUsers() {
  const client = new MongoClient(connectionString);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('inseat');
    const users = await db.collection('users').find({}).toArray();
    
    console.log('\n=== ALL USERS IN INSEAT DATABASE ===');
    console.log('Total users found:', users.length);
    console.log('');

    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log('  ID:', user._id);
      console.log('  Email:', user.email);
      console.log('  Name:', user.firstName, user.lastName);
      console.log('  Role:', user.role);
      console.log('  Business ID:', user.businessId);
      console.log('  RBAC Roles:', user.roles ? user.roles.length : 0);
      console.log('  Created:', user.createdAt);
      console.log('  Status:', user.isActive !== false ? 'Active' : 'Inactive');
      console.log('  Phone:', user.phone);
      console.log('  Verified:', user.isVerified);
      console.log('  ---');
    });

    console.log('');
    console.log('=== USER SUMMARY BY ROLE ===');
    const roleStats = {};
    users.forEach(user => {
      const role = user.role || 'undefined';
      roleStats[role] = (roleStats[role] || 0) + 1;
    });

    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`${role}: ${count} users`);
    });

    console.log('');
    console.log('=== BUSINESS DISTRIBUTION ===');
    const businessStats = {};
    users.forEach(user => {
      const businessId = user.businessId ? user.businessId.toString() : 'no-business';
      businessStats[businessId] = (businessStats[businessId] || 0) + 1;
    });

    Object.entries(businessStats).forEach(([businessId, count]) => {
      console.log(`${businessId}: ${count} users`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

viewAllUsers();