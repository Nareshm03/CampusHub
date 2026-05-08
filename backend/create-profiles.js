require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');
const Faculty = require('./src/models/Faculty');
const Department = require('./src/models/Department');

const createProfiles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const cseDept = await Department.findOne({ code: 'CSE' });
    
    // Create Student User and Profile
    const existingStudent = await User.findOne({ email: 'student@myjce.edu.in' });
    if (!existingStudent) {
      const studentUser = await User.create({
        name: 'John Doe',
        email: 'student@myjce.edu.in',
        password: 'Student@123',
        role: 'STUDENT',
        department: cseDept._id,
        isEmailVerified: true,
        profileComplete: true
      });

      await Student.create({
        userId: studentUser._id,
        usn: '1MS21CS001',
        department: cseDept._id,
        semester: 5,
        phone: '9876543210',
        guardianName: 'Parent Name',
        guardianPhone: '9876543211',
        admissionYear: 2021
      });

      console.log('Created student profile');
      console.log('Email: student@myjce.edu.in');
      console.log('Password: Student@123');
    }

    // Create Faculty User and Profile
    const existingFaculty = await User.findOne({ email: 'faculty@myjce.edu.in' });
    if (!existingFaculty) {
      const facultyUser = await User.create({
        name: 'Dr. Jane Smith',
        email: 'faculty@myjce.edu.in',
        password: 'Faculty@123',
        role: 'FACULTY',
        department: cseDept._id,
        isEmailVerified: true,
        profileComplete: true
      });

      await Faculty.create({
        userId: facultyUser._id,
        employeeId: 'FAC001',
        department: cseDept._id,
        designation: 'Assistant Professor',
        qualification: 'Ph.D in Computer Science',
        experience: 5,
        phone: '9876543212',
        dateOfJoining: new Date('2020-01-01')
      });

      console.log('Created faculty profile');
      console.log('Email: faculty@myjce.edu.in');
      console.log('Password: Faculty@123');
    }

    console.log('Profiles created successfully!');
    
  } catch (error) {
    console.error('Error creating profiles:', error);
  } finally {
    mongoose.connection.close();
  }
};

createProfiles();