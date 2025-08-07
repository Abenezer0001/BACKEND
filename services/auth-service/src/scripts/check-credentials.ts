import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/user.model';
import { Role } from '../models/role.model';
import { hash, compare } from '../utils/hash.service';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../../.env');
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

async function checkCredentials() {
  if (process.argv.length < 4) {
    console.error('Usage: npm run ts-node -- services/auth-service/src/scripts/check-credentials.ts <email> <password>');
    process.exit(1);
  }

  const email = process.argv[2];
  const password = process.argv[3];

  console.log(`Checking credentials for email: ${email}`);

  // Database connection URL
  const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('Successfully connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found!`);
      process.exit(1);
    }

    console.log('User found:');
    console.log(`- ID: ${user._id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Roles array: ${JSON.stringify(user.roles)}`);
    console.log(`- Password hash length: ${user.password?.length}`);
    console.log(`- isPasswordSet: ${user.isPasswordSet}`);
    console.log(`- isActive: ${user.isActive}`);

    // Test password comparison directly
    const isMatch = await user.comparePassword(password);
    console.log(`\nPassword match using model method: ${isMatch}`);

    // Test with hash service directly
    const isMatchWithHashService = await compare(password, user.password);
    console.log(`Password match using hash service: ${isMatchWithHashService}`);

    // Find associated roles
    if (user.roles && user.roles.length > 0) {
      console.log('\nFetching associated roles...');
      const roles = await Role.find({ _id: { $in: user.roles } });
      console.log('Roles found:', roles.map(r => ({ id: r._id, name: r.name })));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking credentials:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Execute the function
checkCredentials(); 