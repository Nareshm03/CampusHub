require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('./src/models/Department');
const Subject = require('./src/models/Subject');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Create Departments
    const departments = [
      { name: 'Computer Science Engineering', code: 'CSE', description: 'Computer Science and Engineering Department' },
      { name: 'Information Science Engineering', code: 'ISE', description: 'Information Science and Engineering Department' },
      { name: 'Electronics and Communication', code: 'ECE', description: 'Electronics and Communication Engineering Department' },
      { name: 'Mechanical Engineering', code: 'MECH', description: 'Mechanical Engineering Department' },
      { name: 'Civil Engineering', code: 'CIVIL', description: 'Civil Engineering Department' },
      { name: 'Administration', code: 'ADMIN', description: 'Administrative Department' }
    ];

    for (const dept of departments) {
      const existing = await Department.findOne({ code: dept.code });
      if (!existing) {
        await Department.create(dept);
        console.log(`Created department: ${dept.name}`);
      }
    }

    // Get CSE department for subjects
    const cseDept = await Department.findOne({ code: 'CSE' });
    
    // Create Subjects for CSE
    const subjects = [
      { name: 'Data Structures', subjectCode: 'CS301', department: cseDept._id, semester: 3, credits: 4 },
      { name: 'Database Management Systems', subjectCode: 'CS401', department: cseDept._id, semester: 4, credits: 4 },
      { name: 'Computer Networks', subjectCode: 'CS501', department: cseDept._id, semester: 5, credits: 4 },
      { name: 'Software Engineering', subjectCode: 'CS502', department: cseDept._id, semester: 5, credits: 3 },
      { name: 'Operating Systems', subjectCode: 'CS601', department: cseDept._id, semester: 6, credits: 4 },
      { name: 'Web Technologies', subjectCode: 'CS602', department: cseDept._id, semester: 6, credits: 3 }
    ];

    for (const subject of subjects) {
      const existing = await Subject.findOne({ subjectCode: subject.subjectCode });
      if (!existing) {
        await Subject.create(subject);
        console.log(`Created subject: ${subject.name}`);
      }
    }

    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedData();