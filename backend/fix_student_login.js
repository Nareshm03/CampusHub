const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');

// Connect to MongoDB
mongoose.connect('mongodb+srv://nareshmurthy080_db_user:wCO0hi3827r6I17O@databasetest.peyxbzx.mongodb.net/campushub_dev?retryWrites=true&w=majority&appName=Databasetest');

async function fixStudentLogin() {
  try {
    // Find the student record by USN
    const student = await Student.findOne({ usn: 'IS047' });
    
    if (!student) {
      console.log('Student not found');
      return;
    }

    console.log('Found student:', student);

    // Check if user already exists
    const existingUser = await User.findOne({ email: '1mj23is047@mvcje.edu.in' });
    
    if (existingUser) {
      console.log('User already exists:', existingUser);
      return;
    }

    // Create the missing User record
    const user = await User.create({
      name: 'Naresh',
      email: '1mj23is047@mvcje.edu.in',
      password: 'defaultPassword123', // You'll need to set a proper password
      role: 'STUDENT',
      department: '69750a3a40706be05f9658ac'
    });

    console.log('Created user:', user);

    // Update the student record to link to the new user
    student.userId = user._id;
    await student.save();

    console.log('Updated student with userId:', student);
    console.log('Fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing student login:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixStudentLogin();