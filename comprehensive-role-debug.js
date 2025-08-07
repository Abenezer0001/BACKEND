const mongoose = require('mongoose');

async function comprehensiveRoleDebug() {
  try {
    const MONGO_URL = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Check what collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Available collections:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Check roles collection directly
    console.log('\n🔍 Checking roles collection directly...');
    const rolesCollection = mongoose.connection.db.collection('roles');
    const allRoles = await rolesCollection.find({}).toArray();
    
    console.log(`Found ${allRoles.length} roles:`);
    allRoles.forEach((role, index) => {
      console.log(`   [${index + 1}] ${role.name} (${role._id}): ${role.permissions?.length || 0} permissions`);
    });

    // Check permissions collection directly
    console.log('\n🔍 Checking permissions collection directly...');
    const permissionsCollection = mongoose.connection.db.collection('permissions');
    const ratingPermissions = await permissionsCollection.find({
      $or: [
        { resource: 'rating' },
        { resource: 'review' }
      ]
    }).toArray();
    
    console.log(`Found ${ratingPermissions.length} rating permissions:`);
    ratingPermissions.forEach((perm, index) => {
      console.log(`   [${index + 1}] ${perm.resource}:${perm.action} (${perm._id})`);
    });

    // Check restaurant_admin role specifically
    console.log('\n🔍 Checking restaurant_admin role specifically...');
    const restaurantAdminRole = await rolesCollection.findOne({ name: 'restaurant_admin' });
    
    if (restaurantAdminRole) {
      console.log(`Restaurant admin role details:`);
      console.log(`   ID: ${restaurantAdminRole._id}`);
      console.log(`   Permissions array: ${restaurantAdminRole.permissions?.length || 0}`);
      console.log(`   First 3 permission IDs:`, restaurantAdminRole.permissions?.slice(0, 3));
      console.log(`   Last 3 permission IDs:`, restaurantAdminRole.permissions?.slice(-3));
      
      // Check if rating permission IDs are in the role's permissions array
      const ratingPermissionIds = ratingPermissions.map(p => p._id.toString());
      const rolePermissionIds = restaurantAdminRole.permissions?.map(p => p.toString()) || [];
      
      console.log(`\n🔍 Rating permission inclusion check:`);
      ratingPermissionIds.forEach(ratingId => {
        const isIncluded = rolePermissionIds.includes(ratingId);
        const permission = ratingPermissions.find(p => p._id.toString() === ratingId);
        console.log(`   ${permission.resource}:${permission.action} (${ratingId}): ${isIncluded ? '✅' : '❌'}`);
      });
      
      // If not included, let's manually add them
      const missingRatingIds = ratingPermissionIds.filter(id => !rolePermissionIds.includes(id));
      if (missingRatingIds.length > 0) {
        console.log(`\n🔧 Adding ${missingRatingIds.length} missing rating permissions...`);
        
        await rolesCollection.updateOne(
          { _id: restaurantAdminRole._id },
          { 
            $push: { 
              permissions: { 
                $each: missingRatingIds.map(id => new mongoose.Types.ObjectId(id))
              } 
            } 
          }
        );
        
        console.log('✅ Added missing rating permissions!');
        
        // Verify the update
        const updatedRole = await rolesCollection.findOne({ name: 'restaurant_admin' });
        console.log(`   Updated permissions count: ${updatedRole.permissions?.length || 0}`);
      } else {
        console.log('\n✅ All rating permissions are already included');
      }
    } else {
      console.log('❌ Restaurant admin role not found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

comprehensiveRoleDebug();