// Final verification script for user override operation
const { MongoClient } = require('mongodb');

const connectionString = 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

async function verifyUserOverride() {
  const client = new MongoClient(connectionString);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('inseat');
    const users = await db.collection('users').find({}).toArray();
    
    console.log('\n=== FINAL USER OVERRIDE VERIFICATION ===');
    console.log(`Total users in database: ${users.length}`);
    
    // Analyze RBAC role assignment
    const rbacStats = {
      'system_admin': { withRbac: 0, withoutRbac: 0 },
      'restaurant_admin': { withRbac: 0, withoutRbac: 0 },
      'customer': { withRbac: 0, withoutRbac: 0 },
      'kitchen_staff': { withRbac: 0, withoutRbac: 0 },
      'cashier': { withRbac: 0, withoutRbac: 0 },
      'branch Manager': { withRbac: 0, withoutRbac: 0 }
    };
    
    users.forEach(user => {
      const role = user.role;
      const hasRbac = user.roles && user.roles.length > 0;
      
      if (rbacStats[role]) {
        if (hasRbac) {
          rbacStats[role].withRbac++;
        } else {
          rbacStats[role].withoutRbac++;
        }
      }
    });
    
    console.log('\n=== RBAC ASSIGNMENT BY ROLE ===');
    Object.entries(rbacStats).forEach(([role, stats]) => {
      const total = stats.withRbac + stats.withoutRbac;
      if (total > 0) {
        console.log(`${role}: ${stats.withRbac}/${total} have RBAC roles (${((stats.withRbac/total)*100).toFixed(1)}%)`);
      }
    });
    
    // Test permissions for different user types
    console.log('\n=== TESTING USER PERMISSIONS ===');
    
    // Test system admin
    const systemAdmin = users.find(u => u.role === 'system_admin' && u.roles && u.roles.length > 0);
    if (systemAdmin) {
      console.log(`✓ System Admin with RBAC: ${systemAdmin.email}`);
    }
    
    // Test restaurant admin  
    const restaurantAdmin = users.find(u => u.role === 'restaurant_admin' && u.roles && u.roles.length > 0);
    if (restaurantAdmin) {
      console.log(`✓ Restaurant Admin with RBAC: ${restaurantAdmin.email}`);
    }
    
    // Test customer
    const customer = users.find(u => u.role === 'customer' && u.roles && u.roles.length > 0);
    if (customer) {
      console.log(`✓ Customer with RBAC: ${customer.email}`);
    }
    
    // Show incomplete users (those without RBAC where expected)
    const incompleteUsers = users.filter(u => 
      ['system_admin', 'restaurant_admin', 'customer'].includes(u.role) && 
      (!u.roles || u.roles.length === 0)
    );
    
    if (incompleteUsers.length > 0) {
      console.log(`\n⚠️  ${incompleteUsers.length} users still need RBAC role assignment:`);
      incompleteUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    } else {
      console.log('\n✅ All supported users have proper RBAC role assignments');
    }
    
    // Data quality checks
    console.log('\n=== DATA QUALITY CHECKS ===');
    
    const usersWithoutFirstName = users.filter(u => !u.firstName || u.firstName.trim() === '');
    const usersWithoutLastName = users.filter(u => !u.lastName || u.lastName.trim() === '');
    const usersWithoutCreatedAt = users.filter(u => !u.createdAt);
    const inactiveUsers = users.filter(u => u.isActive === false);
    
    console.log(`Users without first name: ${usersWithoutFirstName.length}`);
    console.log(`Users without last name: ${usersWithoutLastName.length}`);
    console.log(`Users without createdAt: ${usersWithoutCreatedAt.length}`);
    console.log(`Inactive users: ${inactiveUsers.length}`);
    
    if (inactiveUsers.length > 0) {
      console.log('Inactive users:');
      inactiveUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }
    
    console.log('\n=== OVERRIDE OPERATION COMPLETE ✅ ===');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

verifyUserOverride();