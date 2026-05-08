require('dotenv').config();
const mongoose = require('mongoose');

const testFacultyUpdate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected\n');

    const targetId = '697b9c2e880e774c13b975b5';
    
    // Test the same logic as in the controller
    const facultyCollection = mongoose.connection.db.collection('faculty');
    
    // First try to find by _id
    let faculty = await facultyCollection.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
    
    // If not found, try by userId
    if (!faculty) {
      console.log('Faculty not found by _id, trying userId:', targetId);
      faculty = await facultyCollection.findOne({ userId: new mongoose.Types.ObjectId(targetId) });
      
      if (!faculty) {
        console.log('Faculty not found with ID or userId:', targetId);
      } else {
        console.log('Found faculty by userId, faculty._id:', faculty._id);
        console.log('Faculty details:', {
          _id: faculty._id,
          userId: faculty.userId,
          employeeId: faculty.employeeId,
          designation: faculty.designation
        });
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testFacultyUpdate();