require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('./src/models/Subject');

const checkSubjects = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campushub_dev');
    console.log('Connected to database\n');

    const subjects = await Subject.find().select('name subjectCode semester faculty');
    
    console.log(`Total subjects: ${subjects.length}\n`);
    subjects.forEach(s => {
      console.log(`${s.subjectCode} - ${s.name} - Semester: ${s.semester}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkSubjects();
