require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const listUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    const users = await User.find({}).select('name email role isEmailVerified').limit(20);
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.isEmailVerified}`);
      console.log('');
    });

    if (users.length === 0) {
      console.log('No users found in database.');
      console.log('You need to create users first.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

listUsers();
