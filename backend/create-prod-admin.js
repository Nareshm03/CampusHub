require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Department = require('./src/models/Department');

// IMPORTANT: Use production database
const PROD_MONGODB_URI = 'mongodb+srv://nareshmurthy080_db_user:wCO0hi3827r6I17O@databasetest.peyxbzx.mongodb.net/campushub_prod?retryWrites=true&w=majority&appName=Databasetest';

const createProdAdmin = async () => {
  try {
    await mongoose.connect(PROD_MONGODB_URI);
    console.log('✅ Connected to PRODUCTION database (campushub_prod)\n');

    // Delete existing test admin if exists
    await User.deleteOne({ email: 'prodadmin@mvjce.edu.in' });

    // Get or create department
    let department = await Department.findOne({ name: 'Administration' });
    if (!department) {
      department = await Department.create({
        name: 'Administration',
        code: 'ADMIN',
        description: 'Administrative Department'
      });
      console.log('Created Administration department');
    }

    // Create fresh admin user in PRODUCTION
    const admin = await User.create({
      name: 'Production Admin',
      email: 'prodadmin@mvjce.edu.in',
      password: 'Prod@123',
      role: 'ADMIN',
      department: department._id,
      isEmailVerified: true,
      profileComplete: true
    });

    console.log('✅ Production admin created successfully!\n');
    console.log('='.repeat(50));
    console.log('USE THESE CREDENTIALS TO LOGIN:');
    console.log('='.repeat(50));
    console.log('Email: prodadmin@mvjce.edu.in');
    console.log('Password: Prod@123');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

createProdAdmin();
