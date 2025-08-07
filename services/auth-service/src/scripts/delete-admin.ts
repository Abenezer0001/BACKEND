const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root of the project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// A minimal User schema for deletion
const UserSchema = new mongoose.Schema({
  email: String,
});

async function deleteAdmin() {
  const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017/inseat';
  if (!MONGODB_URL) {
    console.error('MongoDB connection string not found. Set MONGODB_URL or MONGO_URL in .env file.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB to delete admin...');
    await mongoose.connect(MONGODB_URL);
    
    // Use mongoose.models.User if it exists, otherwise create it.
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    
    const email = process.env.INITIAL_SYSADMIN_EMAIL;
    if (!email) {
      console.error('INITIAL_SYSADMIN_EMAIL not set in .env file.');
      process.exit(1);
    }

    console.log(`Attempting to delete user with email: ${email}`);
    const result = await User.deleteOne({ email: email });
    
    if (result.deletedCount > 0) {
      console.log('Successfully deleted existing admin user.');
    } else {
      console.log('Admin user not found, proceeding to creation.');
    }
  } catch (error) {
    console.error('Error deleting admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

deleteAdmin(); 