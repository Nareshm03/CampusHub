require('dotenv').config();
const mongoose = require('mongoose');

const checkFaculty = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected\n');

    // Check faculty collection
    const facultyCollection = mongoose.connection.db.collection('faculty');
    const allFaculty = await facultyCollection.find({}).toArray();
    
    console.log(`Found ${allFaculty.length} faculty records\n`);

    // Look for the specific ID mentioned in the error
    const targetId = '697b9c2e880e774c13b975b5';
    
    // Check if it exists as _id
    const facultyById = await facultyCollection.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
    console.log(`Faculty found by _id (${targetId}):`, facultyById ? 'YES' : 'NO');
    
    // Check if it exists as userId
    const facultyByUserId = await facultyCollection.findOne({ userId: new mongoose.Types.ObjectId(targetId) });
    console.log(`Faculty found by userId (${targetId}):`, facultyByUserId ? 'YES' : 'NO');
    
    // Check users collection for this ID
    const userCollection = mongoose.connection.db.collection('users');
    const user = await userCollection.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
    console.log(`User found with _id (${targetId}):`, user ? 'YES' : 'NO');
    
    if (user) {
      console.log('User details:', {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    }

    // Show sample faculty records
    console.log('\nSample faculty records:');
    allFaculty.slice(0, 3).forEach((faculty, index) => {
      console.log(`Faculty ${index + 1}:`, {
        _id: faculty._id,
        userId: faculty.userId,
        employeeId: faculty.employeeId,
        name: faculty.name || 'N/A'
      });
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkFaculty();