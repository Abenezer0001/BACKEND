const mongoose = require('mongoose');

// Define the User schema (simplified)
const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  role: String,
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
});

const User = mongoose.model('User', userSchema);

async function checkUsers() {
  try {
    await mongoose.connect('mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0');
    
    const users = await User.find({ role: 'restaurant_admin' }).select('email firstName lastName role');
    console.log('Restaurant admin users:', JSON.stringify(users, null, 2));
    
    // Also check all users to see their emails
    const allUsers = await User.find({}).select('email firstName lastName role').limit(10);
    console.log('\nAll users (first 10):', JSON.stringify(allUsers, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers(); 