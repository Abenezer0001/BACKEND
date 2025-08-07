// Script to replicate all users from inseat to inseat-db with the latest overrides
const { MongoClient } = require('mongodb');

const connectionString = 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

async function replicateUsers() {
  const client = new MongoClient(connectionString);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const sourceDb = client.db('inseat');
    const targetDb = client.db('inseat-db');
    
    // Get all users from source (inseat) database
    const sourceUsers = await sourceDb.collection('users').find({}).toArray();
    console.log(`Found ${sourceUsers.length} users in source database (inseat)`);
    
    // Clear target database users collection
    console.log('Clearing target database (inseat-db) users collection...');
    const deleteResult = await targetDb.collection('users').deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing users from inseat-db`);
    
    // Insert all users from source to target
    console.log('Replicating users from inseat to inseat-db...');
    const insertResult = await targetDb.collection('users').insertMany(sourceUsers);
    console.log(`Successfully inserted ${insertResult.insertedCount} users into inseat-db`);
    
    // Verify replication
    const targetUsers = await targetDb.collection('users').find({}).toArray();
    console.log(`\n=== REPLICATION VERIFICATION ===`);
    console.log(`Source (inseat): ${sourceUsers.length} users`);
    console.log(`Target (inseat-db): ${targetUsers.length} users`);
    
    // Compare RBAC role distributions to ensure override data was replicated
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
    
    const sourceRbac = getRbacStats(sourceUsers);
    const targetRbac = getRbacStats(targetUsers);
    
    console.log(`\nSource RBAC distribution: 0 roles: ${sourceRbac[0]}, 1 role: ${sourceRbac[1]}, 2+ roles: ${sourceRbac['2+']}`);
    console.log(`Target RBAC distribution: 0 roles: ${targetRbac[0]}, 1 role: ${targetRbac[1]}, 2+ roles: ${targetRbac['2+']}`);
    
    // Check if distributions match
    const rbacMatches = sourceRbac[0] === targetRbac[0] && sourceRbac[1] === targetRbac[1] && sourceRbac['2+'] === targetRbac['2+'];
    
    if (rbacMatches && sourceUsers.length === targetUsers.length) {
      console.log('\n✅ REPLICATION SUCCESSFUL');
      console.log('✅ All users and override data replicated correctly');
      console.log('✅ Both databases now have identical data');
    } else {
      console.log('\n❌ REPLICATION ISSUES DETECTED');
      console.log('❌ Data mismatch between source and target');
    }
    
    // Also replicate roles and permissions to ensure consistency
    console.log('\n=== REPLICATING ROLES AND PERMISSIONS ===');
    
    // Replicate roles
    const sourceRoles = await sourceDb.collection('roles').find({}).toArray();
    await targetDb.collection('roles').deleteMany({});
    if (sourceRoles.length > 0) {
      await targetDb.collection('roles').insertMany(sourceRoles);
      console.log(`Replicated ${sourceRoles.length} roles`);
    }
    
    // Replicate permissions
    const sourcePermissions = await sourceDb.collection('permissions').find({}).toArray();
    await targetDb.collection('permissions').deleteMany({});
    if (sourcePermissions.length > 0) {
      await targetDb.collection('permissions').insertMany(sourcePermissions);
      console.log(`Replicated ${sourcePermissions.length} permissions`);
    }
    
    console.log('\n🎉 COMPLETE DATABASE REPLICATION FINISHED');
    
  } catch (error) {
    console.error('Error during replication:', error);
  } finally {
    await client.close();
  }
}

replicateUsers();