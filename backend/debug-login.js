require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const testLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    const email = 'testadmin@mvjce.edu.in';
    const password = 'Test@123';

    console.log('Testing login for:', email);
    console.log('Password:', password);
    console.log('');

    // Simulate the exact login flow
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Verified:', user.isEmailVerified);
    console.log('  Password hash:', user.password.substring(0, 30) + '...');
    console.log('');

    // Test password match
    console.log('Testing password match...');
    const isMatch = await user.matchPassword(password);
    
    if (isMatch) {
      console.log('✅ PASSWORD MATCHES!');
      console.log('');
      console.log('Login should work with:');
      console.log('  Email:', email);
      console.log('  Password:', password);
    } else {
      console.log('❌ PASSWORD DOES NOT MATCH!');
      console.log('');
      console.log('This is the problem. Let me check the password validation...');
      
      // Check if password meets requirements
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const isLongEnough = password.length >= 8;
      
      console.log('Password validation:');
      console.log('  Has lowercase:', hasLowercase);
      console.log('  Has number:', hasNumber);
      console.log('  Length >= 8:', isLongEnough);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    mongoose.connection.close();
  }
};

testLogin();
