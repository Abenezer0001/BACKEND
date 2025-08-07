const mongoose = require('mongoose');

// Connect to MongoDB
const mongoUrl = 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

async function checkUserData() {
  try {
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    // Get the User model
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema, 'users');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@inseat.com' });
    console.log('Admin user data:', JSON.stringify(adminUser, null, 2));

    // Find the restaurant admin user
    const restaurantAdmin = await User.findOne({ email: 'abenu77z@gmail.com' });
    console.log('Restaurant admin user data:', JSON.stringify(restaurantAdmin, null, 2));

    // Check businesses
    const businessSchema = new mongoose.Schema({}, { strict: false });
    const Business = mongoose.model('Business', businessSchema, 'businesses');
    const businesses = await Business.find({});
    console.log('Businesses:', JSON.stringify(businesses, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserData(); 