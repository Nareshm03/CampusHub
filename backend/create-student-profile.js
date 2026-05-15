require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');
const Department = require('./src/models/Department');

const createStudentProfile = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MongoDB URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find the user "Naresh" by email or name
    const user = await User.findOne({ 
      $or: [
        { email: /naresh/i },
        { name: /naresh/i }
      ]
    });

    if (!user) {
      console.log('User "Naresh" not found. Please provide the correct email or name.');
      process.exit(1);
    }

    console.log('Found user:', { id: user._id, name: user.name, email: user.email, role: user.role });

    // Check if student profile already exists
    const existingStudent = await Student.findOne({ userId: user._id });
    if (existingStudent) {
      console.log('Student profile already exists:', existingStudent);
      process.exit(0);
    }

    // Get or create a department
    let department = await Department.findOne({ name: /computer/i });
    if (!department) {
      department = await Department.findOne();
      if (!department) {
        console.log('No department found. Creating a default department...');
        department = await Department.create({
          name: 'Computer Science',
          code: 'CS',
          description: 'Department of Computer Science and Engineering'
        });
      }
    }

    console.log('Using department:', { id: department._id, name: department.name, code: department.code });

    // Create student profile with USN 1mj23is047
    const student = await Student.create({
      userId: user._id,
      usn: '1MJ23IS047',
      department: department._id,
      semester: 5,
      subjects: [],
      phone: user.phone || '',
      address: user.address || '',
      dateOfBirth: user.dateOfBirth || null,
      admissionYear: 2023
    });

    console.log('✅ Student profile created successfully!');
    console.log('Student details:', {
      id: student._id,
      usn: student.usn,
      semester: student.semester,
      department: department.name
    });

    // Update user's department if not set
    if (!user.department) {
      user.department = department._id;
      await user.save();
      console.log('✅ Updated user department');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createStudentProfile();
