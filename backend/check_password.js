require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campushub');

async function checkAndResetPassword() {
  try {
    // Find the user with password field included
    const user = await User.findOne({ email: '1mj23is047@mvcje.edu.in' }).select('+password');
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', {
      id: user._id,
      name: user.name,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    // Reset password to a known value
    user.password = 'password123';
    await user.save();
    
    console.log('Password has been reset to: password123');
    console.log('You can now login with email: 1mj23is047@mvcje.edu.in and password: password123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAndResetPassword();