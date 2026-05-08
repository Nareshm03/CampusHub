const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const admin = await User.findOne({ role: 'ADMIN' });
    if (admin) {
      admin.password = 'password123';
      await admin.save();
      console.log('Admin password reset successfully for:', admin.email);
    } else {
      console.log('No admin found');
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

resetAdminPassword();
