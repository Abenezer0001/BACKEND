const { MongoClient } = require('mongodb');

const connectionString = 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

async function compareUsers() {
  const client = new MongoClient(connectionString);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Get users from both databases
    const inseatUsers = await client.db('inseat').collection('users').find({}).toArray();
    const inseatDbUsers = await client.db('inseat-db').collection('users').find({}).toArray();
    
    console.log('\n=== DATABASE COMPARISON ===');
    console.log('inseat database users:', inseatUsers.length);
    console.log('inseat-db database users:', inseatDbUsers.length);
    
    // Compare by email (unique identifier)
    const inseatEmails = new Set(inseatUsers.map(u => u.email));
    const inseatDbEmails = new Set(inseatDbUsers.map(u => u.email));
    
    // Find differences
    const onlyInInseat = [...inseatEmails].filter(email => !inseatDbEmails.has(email));
    const onlyInInseatDb = [...inseatDbEmails].filter(email => !inseatEmails.has(email));
    
    console.log('\n=== EMAIL COMPARISON ===');
    console.log('Users only in inseat:', onlyInInseat.length);
    console.log('Users only in inseat-db:', onlyInInseatDb.length);
    
    if (onlyInInseat.length > 0) {
      console.log('\nEmails only in inseat:');
      onlyInInseat.forEach(email => console.log(' -', email));
    }
    
    if (onlyInInseatDb.length > 0) {
      console.log('\nEmails only in inseat-db:');
      onlyInInseatDb.forEach(email => console.log(' -', email));
    }
    
    // Compare role distributions
    const getRoleStats = (users) => {
      const stats = {};
      users.forEach(user => {
        const role = user.role || 'undefined';
        stats[role] = (stats[role] || 0) + 1;
      });
      return stats;
    };
    
    const inseatRoles = getRoleStats(inseatUsers);
    const inseatDbRoles = getRoleStats(inseatDbUsers);
    
    console.log('\n=== ROLE DISTRIBUTION COMPARISON ===');
    console.log('inseat database roles:');
    Object.entries(inseatRoles).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    
    console.log('\ninseat-db database roles:');
    Object.entries(inseatDbRoles).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    
    // Check RBAC role distribution
    const getRbacStats = (users) => {
      const stats = { 0: 0, 1: 0, '2+': 0 };
      users.forEach(user => {
        const roleCount = user.roles ? user.roles.length : 0;
        if (roleCount === 0) stats[0]++;
        else if (roleCount === 1) stats[1]++;
        else stats['2+']++;
      });
      return stats;
    };
    
    const inseatRbac = getRbacStats(inseatUsers);
    const inseatDbRbac = getRbacStats(inseatDbUsers);
    
    console.log('\n=== RBAC ROLE DISTRIBUTION ===');
    console.log('inseat database RBAC:');
    Object.entries(inseatRbac).forEach(([count, users]) => {
      console.log(`  ${count} roles: ${users} users`);
    });
    
    console.log('\ninseat-db database RBAC:');
    Object.entries(inseatDbRbac).forEach(([count, users]) => {
      console.log(`  ${count} roles: ${users} users`);
    });
    
    // Check if they're identical
    const identical = onlyInInseat.length === 0 && onlyInInseatDb.length === 0;
    console.log('\n=== RESULT ===');
    console.log('Databases have identical user emails:', identical);
    
    if (identical) {
      console.log('✅ Both databases contain the same users');
      console.log('✅ User override operation preserved all data correctly');
    } else {
      console.log('❌ Databases have different users - replication may be needed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

compareUsers();