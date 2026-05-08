require('dotenv').config();
const mongoose = require('mongoose');

const cleanOldMarks = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Delete all marks records that don't have examType (old format)
    const result = await mongoose.connection.db.collection('marks')
      .deleteMany({ examType: { $exists: false } });

    console.log(`Deleted ${result.deletedCount} old format marks records`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanOldMarks();
