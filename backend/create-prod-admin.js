require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Department = require('./src/models/Department');

// IMPORTANT: production URI must come from the environment — never hardcode credentials.
const PROD_MONGODB_URI = process.env.MONGODB_URI || process.env.PROD_MONGODB_URI;
if (!PROD_MONGODB_URI) {
  console.error('Set MONGODB_URI env var to the production connection string.');
  process.exit(1);
}

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
