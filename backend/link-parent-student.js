require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');

const checkAndLinkParent = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MongoDB URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Find parent account (Shankar)
    const parent = await User.findOne({ 
      role: 'PARENT',
      $or: [
        { name: /shankar/i },
        { email: /shankar/i }
      ]
    });

    if (!parent) {
      console.log('❌ Parent account "Shankar" not found');
      console.log('The parent may need to register first');
      process.exit(0);
    }

    console.log('✅ Found parent account:');
    console.log('   Name:', parent.name);
    console.log('   Email:', parent.email);
    console.log('   Linked Student ID:', parent.linkedStudentId || 'Not linked');

    // Find student with USN 1MJ23IS047
    const student = await Student.findOne({ usn: '1MJ23IS047' })
      .populate('userId', 'name email');

    if (!student) {
      console.log('\n❌ Student with USN 1MJ23IS047 not found');
      process.exit(1);
    }

    console.log('\n✅ Found student:');
    console.log('   Name:', student.userId?.name);
    console.log('   Email:', student.userId?.email);
    console.log('   USN:', student.usn);
    console.log('   Student ID:', student._id);

    // Link parent to student if not already linked
    if (!parent.linkedStudentId) {
      parent.linkedStudentId = student._id;
      await parent.save();
      console.log('\n✅ Successfully linked parent to student!');
    } else if (parent.linkedStudentId.toString() === student._id.toString()) {
      console.log('\n✅ Parent is already linked to this student');
    } else {
      console.log('\n⚠️  Parent is linked to a different student');
      console.log('   Current linked student ID:', parent.linkedStudentId);
    }

    console.log('\n📋 Summary:');
    console.log('   Parent:', parent.name, '(', parent.email, ')');
    console.log('   Student:', student.userId?.name, '(', student.usn, ')');
    console.log('   Status: Linked ✓');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkAndLinkParent();
