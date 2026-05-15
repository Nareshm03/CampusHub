/**
 * Debug script to check faculty profile setup
 * Run this if assignment creation still fails
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Faculty = require('./src/models/Faculty');
const User = require('./src/models/User');

async function checkFacultyProfile(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found with email:', email);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user._id);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('');

    const faculty = await Faculty.findOne({ userId: user._id }).populate('subjects department');
    if (!faculty) {
      console.log('❌ Faculty profile not found for this user');
      console.log('   Create faculty profile first!');
      process.exit(1);
    }

    console.log('✅ Faculty profile found:');
    console.log('   ID:', faculty._id);
    console.log('   Employee ID:', faculty.employeeId);
    console.log('   Department:', faculty.department?.name || 'N/A');
    console.log('   Subjects:', faculty.subjects?.length || 0);
    if (faculty.subjects?.length > 0) {
      faculty.subjects.forEach(s => console.log('      -', s.name, `(${s.subjectCode})`));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Usage: node debug-faculty.js faculty@example.com
const email = process.argv[2];
if (!email) {
  console.log('Usage: node debug-faculty.js <faculty-email>');
  process.exit(1);
}

checkFacultyProfile(email);
