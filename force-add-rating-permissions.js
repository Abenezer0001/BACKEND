const mongoose = require('mongoose');

async function forceAddRatingPermissions() {
  try {
    const MONGO_URL = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    // Work directly with collections
    const permissionsCollection = mongoose.connection.db.collection('permissions');
    const rolesCollection = mongoose.connection.db.collection('roles');

    // 1. First, create rating permissions if they don't exist
    const ratingPermissions = [
      { resource: 'rating', action: 'create', description: 'Create rating resources' },
      { resource: 'rating', action: 'read', description: 'Read rating resources' },
      { resource: 'rating', action: 'update', description: 'Update rating resources' },
      { resource: 'rating', action: 'delete', description: 'Delete rating resources' },
      { resource: 'review', action: 'create', description: 'Create review resources' },
      { resource: 'review', action: 'read', description: 'Read review resources' },
      { resource: 'review', action: 'update', description: 'Update review resources' },
      { resource: 'review', action: 'delete', description: 'Delete review resources' }
    ];

    console.log('\n🔧 Creating rating permissions...');
    const createdPermissions = [];

    for (const perm of ratingPermissions) {
      // Check if exists
      const existing = await permissionsCollection.findOne({ 
        resource: perm.resource, 
        action: perm.action 
      });

      if (!existing) {
        console.log(`   Creating: ${perm.resource}:${perm.action}`);
        const result = await permissionsCollection.insertOne({
          ...perm,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        createdPermissions.push(result.insertedId);
      } else {
        console.log(`   Exists: ${perm.resource}:${perm.action} (${existing._id})`);
        createdPermissions.push(existing._id);
      }
    }

    console.log(`\n✅ Rating permissions ready: ${createdPermissions.length}`);

    // 2. Get the restaurant_admin role
    const restaurantAdminRole = await rolesCollection.findOne({ name: 'restaurant_admin' });
    
    if (!restaurantAdminRole) {
      console.log('❌ Restaurant admin role not found!');
      process.exit(1);
    }

    console.log(`\n📋 Restaurant admin role: ${restaurantAdminRole._id}`);
    console.log(`   Current permissions: ${restaurantAdminRole.permissions?.length || 0}`);

    // 3. Add missing rating permissions to the role
    const currentPermissionIds = (restaurantAdminRole.permissions || []).map(id => id.toString());
    const missingPermissionIds = createdPermissions.filter(id => 
      !currentPermissionIds.includes(id.toString())
    );

    if (missingPermissionIds.length > 0) {
      console.log(`\n🔧 Adding ${missingPermissionIds.length} missing permissions to restaurant_admin role...`);
      
      const updateResult = await rolesCollection.updateOne(
        { _id: restaurantAdminRole._id },
        { 
          $push: { 
            permissions: { 
              $each: missingPermissionIds 
            } 
          },
          $set: {
            updatedAt: new Date()
          }
        }
      );

      console.log(`   Update result: ${updateResult.modifiedCount} role(s) modified`);
    } else {
      console.log('\n✅ All rating permissions already assigned to restaurant_admin role');
    }

    // 4. Verify the final state
    console.log('\n🔍 Final verification:');
    const updatedRole = await rolesCollection.findOne({ name: 'restaurant_admin' });
    console.log(`   Restaurant admin permissions: ${updatedRole.permissions?.length || 0}`);

    const allRatingPermissions = await permissionsCollection.find({
      $or: [
        { resource: 'rating' },
        { resource: 'review' }
      ]
    }).toArray();
    console.log(`   Total rating permissions in DB: ${allRatingPermissions.length}`);

    // Check which ones are assigned
    const assignedRatingPerms = allRatingPermissions.filter(perm => 
      (updatedRole.permissions || []).some(rolePermId => 
        rolePermId.toString() === perm._id.toString()
      )
    );
    console.log(`   Rating permissions assigned to restaurant_admin: ${assignedRatingPerms.length}`);

    assignedRatingPerms.forEach(perm => {
      console.log(`     ✅ ${perm.resource}:${perm.action}`);
    });

    // 5. Also add to system_admin role
    console.log('\n🔧 Updating system_admin role...');
    const systemAdminRole = await rolesCollection.findOne({ name: 'system_admin' });
    
    if (systemAdminRole) {
      const sysCurrentPermissions = (systemAdminRole.permissions || []).map(id => id.toString());
      const sysMissingPermissions = createdPermissions.filter(id => 
        !sysCurrentPermissions.includes(id.toString())
      );

      if (sysMissingPermissions.length > 0) {
        await rolesCollection.updateOne(
          { _id: systemAdminRole._id },
          { 
            $push: { 
              permissions: { 
                $each: sysMissingPermissions 
              } 
            },
            $set: {
              updatedAt: new Date()
            }
          }
        );
        console.log(`   Added ${sysMissingPermissions.length} permissions to system_admin`);
      } else {
        console.log('   System admin already has all rating permissions');
      }
    }

    console.log('\n🎉 Rating permissions setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

forceAddRatingPermissions();