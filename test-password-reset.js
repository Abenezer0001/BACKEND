const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0');

// Define schemas
const UserSchema = new mongoose.Schema({
  email: String,
  role: String,
  passwordResetToken: String,
  passwordResetExpires: Date
});

const User = mongoose.model('User', UserSchema);

async function testPasswordResetTokens() {
  try {
    console.log('=== Testing Password Reset Tokens ===');
    
    // Find users with active reset tokens
    const usersWithTokens = await User.find({
      passwordResetToken: { $exists: true },
      passwordResetExpires: { $exists: true }
    }).select('email role passwordResetExpires passwordResetToken');
    
    console.log(`Found ${usersWithTokens.length} users with reset tokens:`);
    
    for (const user of usersWithTokens) {
      const now = new Date();
      const isExpired = now > user.passwordResetExpires;
      
      console.log(`\nUser: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Token expires: ${user.passwordResetExpires}`);
      console.log(`Current time: ${now}`);
      console.log(`Is expired: ${isExpired}`);
      console.log(`Token (first 16 chars): ${user.passwordResetToken?.substring(0, 16)}...`);
      
      if (isExpired) {
        console.log('⚠️  This token is EXPIRED');
      } else {
        console.log('✅ This token is VALID');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testPasswordResetTokens(); 