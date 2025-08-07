// MongoDB script to override all users in INSEAT database
// This script will standardize user data and fix inconsistencies

const { MongoClient, ObjectId } = require('mongodb');

const connectionString = 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

async function overrideAllUsers() {
  const client = new MongoClient(connectionString);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('inseat');
    
    // Get role IDs for RBAC assignment
    const systemAdminRole = await db.collection('roles').findOne({ name: 'system_admin' });
    const restaurantAdminRole = await db.collection('roles').findOne({ name: 'restaurant_admin' });
    const customerRole = await db.collection('roles').findOne({ name: 'customer' });
    
    console.log('System Admin Role ID:', systemAdminRole?._id);
    console.log('Restaurant Admin Role ID:', restaurantAdminRole?._id);
    console.log('Customer Role ID:', customerRole?._id);
    
    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log(`\n=== PROCESSING ${users.length} USERS ===`);
    
    let processedCount = 0;
    let updatedCount = 0;
    
    for (const user of users) {
      processedCount++;
      
      const updates = {};
      let needsUpdate = false;
      
      // 1. Fix RBAC roles based on legacy role
      const currentRoles = user.roles || [];
      let correctRoleId = null;
      
      switch (user.role) {
        case 'system_admin':
          correctRoleId = systemAdminRole?._id;
          break;
        case 'restaurant_admin':
          correctRoleId = restaurantAdminRole?._id;
          break;
        case 'customer':
          correctRoleId = customerRole?._id;
          break;
        case 'kitchen_staff':
        case 'cashier':
        case 'branch Manager':
          // These roles don't have RBAC equivalents yet, keep as is
          correctRoleId = null;
          break;
      }
      
      // Update RBAC roles if needed
      if (correctRoleId && (currentRoles.length === 0 || !currentRoles.some(roleId => roleId.equals(correctRoleId)))) {
        updates.roles = [correctRoleId];
        needsUpdate = true;
      }
      
      // 2. Standardize user status
      if (user.isActive === undefined) {
        updates.isActive = true;
        needsUpdate = true;
      }
      
      // 3. Standardize verification status
      if (user.isVerified === undefined) {
        updates.isVerified = false;
        needsUpdate = true;
      }
      
      // 4. Ensure required fields exist
      if (!user.firstName || user.firstName.trim() === '') {
        updates.firstName = user.email.split('@')[0];
        needsUpdate = true;
      }
      
      if (!user.lastName || user.lastName.trim() === '') {
        updates.lastName = 'User';
        needsUpdate = true;
      }
      
      // 5. Add timestamps if missing
      if (!user.createdAt) {
        updates.createdAt = new Date();
        needsUpdate = true;
      }
      
      if (!user.updatedAt) {
        updates.updatedAt = new Date();
        needsUpdate = true;
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: updates }
        );
        updatedCount++;
        
        console.log(`Updated user ${processedCount}: ${user.email}`);
        if (updates.roles) {
          console.log(`  - Fixed RBAC roles: ${user.role} -> ${updates.roles[0]}`);
        }
        if (updates.firstName || updates.lastName) {
          console.log(`  - Fixed name: ${updates.firstName || user.firstName} ${updates.lastName || user.lastName}`);
        }
        if (updates.isActive !== undefined) {
          console.log(`  - Set active status: ${updates.isActive}`);
        }
      }
    }
    
    console.log(`\n=== OVERRIDE COMPLETE ===`);
    console.log(`Processed: ${processedCount} users`);
    console.log(`Updated: ${updatedCount} users`);
    console.log(`No changes needed: ${processedCount - updatedCount} users`);
    
    // Verification - show final stats
    console.log(`\n=== FINAL VERIFICATION ===`);
    const finalUsers = await db.collection('users').find({}).toArray();
    
    const roleStats = {};
    const rbacStats = {};
    
    finalUsers.forEach(user => {
      const role = user.role || 'undefined';
      roleStats[role] = (roleStats[role] || 0) + 1;
      
      const rbacCount = user.roles ? user.roles.length : 0;
      rbacStats[rbacCount] = (rbacStats[rbacCount] || 0) + 1;
    });
    
    console.log('Role distribution:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`  ${role}: ${count} users`);
    });
    
    console.log('RBAC role assignment:');
    Object.entries(rbacStats).forEach(([count, users]) => {
      console.log(`  ${count} roles: ${users} users`);
    });
    
    // Show users without RBAC roles
    const usersWithoutRbac = finalUsers.filter(user => !user.roles || user.roles.length === 0);
    if (usersWithoutRbac.length > 0) {
      console.log(`\nUsers still without RBAC roles (${usersWithoutRbac.length}):`);
      usersWithoutRbac.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Execute if run directly
if (require.main === module) {
  overrideAllUsers();
}

module.exports = { overrideAllUsers };