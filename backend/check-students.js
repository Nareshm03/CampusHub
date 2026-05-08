require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');
const Subject = require('./src/models/Subject');

const checkStudents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campushub_dev');
    console.log('Connected to database\n');

    const students = await Student.find()
      .populate('userId', 'name email')
      .populate('subjects', 'name subjectCode semester');

    console.log(`Total Student profiles: ${students.length}\n`);
    
    students.forEach(student => {
      console.log(`USN: ${student.usn}`);
      console.log(`Name: ${student.userId?.name || 'N/A'}`);
      console.log(`Email: ${student.userId?.email || 'N/A'}`);
      console.log(`Semester: ${student.semester}`);
      console.log(`Subjects: ${student.subjects?.map(s => `${s.subjectCode} - ${s.name}`).join(', ') || 'None'}`);
      console.log('---');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkStudents();
