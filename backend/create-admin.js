require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Department = require('./src/models/Department');

const createAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@mvjce.edu.in' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      return;
    }

    // Create or find a department
    let department = await Department.findOne({ name: 'Administration' });
    if (!department) {
      department = await Department.create({
        name: 'Administration',
        code: 'ADMIN',
        description: 'Administrative Department'
      });
      console.log('Created Administration department');
    }

    // Create admin user
    const adminUser = await User.create({
      name: 'Administrator',
      email: 'admin@mvjce.edu.in',
      password: 'admin@123',  // Meets validation requirements
      role: 'ADMIN',
      department: department._id,
      isEmailVerified: true,
      profileComplete: true
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@mvjce.edu.in');
    console.log('Password: admin@123');
    console.log('Role:', adminUser.role);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};

createAdmin();