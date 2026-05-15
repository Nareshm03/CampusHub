require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/Student');
const User = require('./src/models/User');
const Department = require('./src/models/Department');
const Subject = require('./src/models/Subject');

async function createStudentProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    // Find the user "Naresh"
    const user = await User.findOne({ name: /naresh/i });
    if (!user) {
      console.error('User "Naresh" not found!');
      console.log('Available users:');
      const users = await User.find({ role: 'STUDENT' }).select('name email');
      users.forEach(u => console.log(`- ${u.name} (${u.email})`));
      return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);

    // Check if profile already exists
    const existingProfile = await Student.findOne({ userId: user._id });
    if (existingProfile) {
      console.log('Student profile already exists!');
      return;
    }

    // Get first available department
    const department = await Department.findOne();
    if (!department) {
      console.error('No departments found! Please create a department first.');
      return;
    }

    console.log(`Using department: ${department.name}`);

    // Get subjects for this department
    const subjects = await Subject.find({ department: department._id }).limit(5);
    console.log(`Found ${subjects.length} subjects`);

    // Create student profile
    const student = await Student.create({
      userId: user._id,
      usn: 'AUTO' + Date.now(), // Auto-generate USN
      department: department._id,
      semester: 5, // Default semester
      subjects: subjects.map(s => s._id),
      enrollmentDate: new Date(),
      isActive: true
    });

    console.log('\n✅ Student profile created successfully!');
    console.log('Details:');
    console.log(`- Name: ${user.name}`);
    console.log(`- USN: ${student.usn}`);
    console.log(`- Department: ${department.name}`);
    console.log(`- Semester: ${student.semester}`);
    console.log(`- Subjects: ${subjects.length}`);
    console.log('\nYou can now login as this student and access the dashboard!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createStudentProfile();
