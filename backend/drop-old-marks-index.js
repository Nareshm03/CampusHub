const mongoose = require('mongoose');
require('dotenv').config();

const dropOldIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('marks');

    // List current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the old unique index
    try {
      await collection.dropIndex('student_1_subject_1');
      console.log('Successfully dropped old index: student_1_subject_1');
    } catch (error) {
      console.log('Index not found or already dropped:', error.message);
    }

    // The new index will be created automatically when the server starts
    console.log('Migration complete! Restart the server to create new indexes.');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

dropOldIndex();
