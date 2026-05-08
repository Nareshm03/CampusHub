require('dotenv').config();
const mongoose = require('mongoose');

const fixMissingFaculty = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected\n');

    const targetUserId = '697b9c2e880e774c13b975b5';
    
    // Get the user details
    const userCollection = mongoose.connection.db.collection('users');
    const user = await userCollection.findOne({ _id: new mongoose.Types.ObjectId(targetUserId) });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user.name, user.email);
    
    // Check if faculty record already exists
    const facultyCollection = mongoose.connection.db.collection('faculty');
    const existingFaculty = await facultyCollection.findOne({ userId: new mongoose.Types.ObjectId(targetUserId) });
    
    if (existingFaculty) {
      console.log('Faculty record already exists');
      return;
    }
    
    // Create the missing faculty record with the data from the update attempt
    const facultyData = {
      userId: new mongoose.Types.ObjectId(targetUserId),
      employeeId: 'IS001',
      department: new mongoose.Types.ObjectId('69750a3a40706be05f9658ac'),
      subjects: [],
      designation: 'Assistant professor',
      qualification: 'Ph.D',
      experience: 0, // Default to 0 since it was empty
      phone: '0000000000',
      address: '',
      dateOfJoining: new Date(), // Default to current date since it was empty
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await facultyCollection.insertOne(facultyData);
    console.log('Faculty record created successfully:', result.insertedId);
    
    // Verify the creation
    const newFaculty = await facultyCollection.findOne({ _id: result.insertedId });
    console.log('New faculty record:', {
      _id: newFaculty._id,
      userId: newFaculty.userId,
      employeeId: newFaculty.employeeId
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixMissingFaculty();