require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

const checkAllUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');
    console.log('='.repeat(80));
    console.log('ALL USERS IN DATABASE');
    console.log('='.repeat(80));

    const users = await User.find({}).select('name email role password isEmailVerified');
    
    console.log(`\nTotal users found: ${users.length}\n`);
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n${i + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.isEmailVerified}`);
      console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);
      
      // Test common passwords
      const testPasswords = ['admin@123', 'password123', 'test123', '123456', 'password'];
      for (const testPass of testPasswords) {
        const isMatch = await bcrypt.compare(testPass, user.password);
        if (isMatch) {
          console.log(`   ✅ PASSWORD FOUND: ${testPass}`);
          break;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY - VERIFIED USERS WITH KNOWN PASSWORDS:');
    console.log('='.repeat(80));

    for (const user of users) {
      if (user.isEmailVerified) {
        const testPasswords = ['admin@123', 'password123', 'test123', '123456', 'password'];
        for (const testPass of testPasswords) {
          const isMatch = await bcrypt.compare(testPass, user.password);
          if (isMatch) {
            console.log(`\n✅ ${user.email}`);
            console.log(`   Password: ${testPass}`);
            console.log(`   Role: ${user.role}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

checkAllUsers();
