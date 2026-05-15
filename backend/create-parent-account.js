require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');

const createParentAccount = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MongoDB URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Check if parent already exists
    const existingParent = await User.findOne({ email: 'shankar@gmail.in' });
    if (existingParent) {
      console.log('✅ Parent account already exists:');
      console.log('   Name:', existingParent.name);
      console.log('   Email:', existingParent.email);
      console.log('   Role:', existingParent.role);
      console.log('   Linked Student:', existingParent.linkedStudentId || 'Not linked');
      
      // Link to student if not already linked
      if (!existingParent.linkedStudentId) {
        const student = await Student.findOne({ usn: '1MJ23IS047' });
        if (student) {
          existingParent.linkedStudentId = student._id;
          await existingParent.save();
          console.log('\n✅ Linked parent to student with USN: 1MJ23IS047');
        }
      }
      process.exit(0);
    }

    // Find student with USN 1MJ23IS047
    const student = await Student.findOne({ usn: '1MJ23IS047' })
      .populate('userId', 'name email');

    if (!student) {
      console.log('❌ Student with USN 1MJ23IS047 not found');
      console.log('Please create the student profile first');
      process.exit(1);
    }

    console.log('✅ Found student:');
    console.log('   Name:', student.userId?.name);
    console.log('   USN:', student.usn);
    console.log('   Student ID:', student._id);

    // Create parent account
    const parent = await User.create({
      name: 'Shankar',
      email: 'shankar@gmail.in',
      password: 'Shankar@123',
      role: 'PARENT',
      linkedStudentId: student._id
    });

    console.log('\n✅ Parent account created successfully!');
    console.log('   Name:', parent.name);
    console.log('   Email:', parent.email);
    console.log('   Role:', parent.role);
    console.log('   Linked to student:', student.usn);

    console.log('\n📋 Login Credentials:');
    console.log('   Email: shankar@gmail.in');
    console.log('   Password: Shankar@123');
    console.log('   URL: http://localhost:3000/login');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.errors) {
      console.error('Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  - ${key}: ${error.errors[key].message}`);
      });
    }
    process.exit(1);
  }
};

createParentAccount();
