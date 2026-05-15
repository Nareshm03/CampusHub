require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

const testLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    const email = 'admin@mvjce.edu.in';
    const testPassword = 'admin@123';

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('User found:');
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Verified:', user.isEmailVerified);
    console.log('  Password hash:', user.password.substring(0, 30) + '...');
    
    console.log('\nTesting password:', testPassword);
    const isMatch = await user.matchPassword(testPassword);
    
    if (isMatch) {
      console.log('✅ Password matches!');
      console.log('\nLogin credentials:');
      console.log('  Email:', email);
      console.log('  Password:', testPassword);
    } else {
      console.log('❌ Password does NOT match');
      console.log('\nTrying other common passwords...');
      
      const passwords = ['admin123', 'Admin@123', 'admin@1234', 'password123', 'Password@123'];
      for (const pwd of passwords) {
        const match = await bcrypt.compare(pwd, user.password);
        if (match) {
          console.log(`✅ Found matching password: ${pwd}`);
          break;
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

testLogin();
