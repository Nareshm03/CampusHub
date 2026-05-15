require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Department = require('./src/models/Department');

const createFreshAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    // Delete existing test admin if exists
    await User.deleteOne({ email: 'testadmin@mvjce.edu.in' });

    // Get or create department
    let department = await Department.findOne({ name: 'Administration' });
    if (!department) {
      department = await Department.create({
        name: 'Administration',
        code: 'ADMIN',
        description: 'Administrative Department'
      });
    }

    // Create fresh admin user
    const admin = await User.create({
      name: 'Test Administrator',
      email: 'testadmin@mvjce.edu.in',
      password: 'Test@123',
      role: 'ADMIN',
      department: department._id,
      isEmailVerified: true,
      profileComplete: true
    });

    console.log('✅ Fresh admin user created successfully!\n');
    console.log('Login credentials:');
    console.log('  Email: testadmin@mvjce.edu.in');
    console.log('  Password: Test@123');
    console.log('\nUse these credentials to login!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

createFreshAdmin();
