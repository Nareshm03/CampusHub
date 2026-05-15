require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/Student');
const User = require('./src/models/User');

const updateStudentUSN = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MongoDB URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find Naresh's user account
    const user = await User.findOne({ name: /naresh/i });
    if (!user) {
      console.log('User "Naresh" not found');
      process.exit(1);
    }

    console.log('Found user:', { id: user._id, name: user.name, email: user.email });

    // Find and update the student profile
    const student = await Student.findOne({ userId: user._id });
    if (!student) {
      console.log('Student profile not found for this user');
      process.exit(1);
    }

    console.log('Current USN:', student.usn);

    // Update USN to the correct format
    student.usn = '1MJ23IS047';
    await student.save();

    console.log('✅ USN updated successfully to:', student.usn);

    // Also check if there's a parent trying to link with this USN
    const Parent = require('./src/models/User');
    const parents = await Parent.find({ role: 'PARENT', linkedStudentId: null });
    
    if (parents.length > 0) {
      console.log('\n📋 Found', parents.length, 'parent(s) without linked students:');
      parents.forEach(p => {
        console.log('  -', p.name, '(', p.email, ')');
      });
      console.log('\nThey can now link to student with USN: 1MJ23IS047');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

updateStudentUSN();
