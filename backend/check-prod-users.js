require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

const PROD_URI = 'mongodb+srv://nareshmurthy080_db_user:wCO0hi3827r6I17O@databasetest.peyxbzx.mongodb.net/campushub_prod?retryWrites=true&w=majority&appName=Databasetest';

const checkProdUsers = async () => {
  try {
    await mongoose.connect(PROD_URI);
    console.log('✅ Connected to PRODUCTION database\n');

    const admins = await User.find({ role: 'ADMIN' }).select('+password');
    
    console.log(`Found ${admins.length} admin users:\n`);

    for (const admin of admins) {
      console.log('='.repeat(60));
      console.log(`Admin: ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Verified: ${admin.isEmailVerified}`);
      
      // Test common passwords
      const testPasswords = ['admin@123', 'password123', 'Admin@123', 'Prod@123', 'Test@123'];
      
      for (const pwd of testPasswords) {
        const isMatch = await bcrypt.compare(pwd, admin.password);
        if (isMatch) {
          console.log(`✅ PASSWORD: ${pwd}`);
          break;
        }
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('WORKING LOGIN CREDENTIALS:');
    console.log('='.repeat(60));

    for (const admin of admins) {
      const testPasswords = ['admin@123', 'password123', 'Admin@123', 'Prod@123', 'Test@123'];
      
      for (const pwd of testPasswords) {
        const isMatch = await bcrypt.compare(pwd, admin.password);
        if (isMatch) {
          console.log(`\n✅ Email: ${admin.email}`);
          console.log(`   Password: ${pwd}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

checkProdUsers();
