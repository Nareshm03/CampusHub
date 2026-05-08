const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

async function findAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const admin = await User.findOne({ role: 'ADMIN' });
    if (admin) {
      console.log('Admin found:', admin.email);
    } else {
      console.log('No admin found');
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

findAdmin();
