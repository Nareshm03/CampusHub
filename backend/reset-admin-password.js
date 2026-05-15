require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    const email = 'admin@mvjce.edu.in';
    const newPassword = 'Admin@123';

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('Found user:', user.name);
    console.log('Email:', user.email);
    
    // Update password (will be hashed automatically by pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log('\n✅ Password reset successfully!');
    console.log('\nNew login credentials:');
    console.log('  Email:', email);
    console.log('  Password:', newPassword);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

resetAdminPassword();
