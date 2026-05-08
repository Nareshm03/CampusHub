 require('dotenv').config();
const mongoose = require('mongoose');

const checkMarks = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const allMarks = await mongoose.connection.db.collection('marks')
      .find({})
      .toArray();

    console.log(`Found ${allMarks.length} total marks records\n`);

    const newFormatMarks = allMarks.filter(m => m.examType);
    const oldFormatMarks = allMarks.filter(m => !m.examType);

    console.log(`New format (with examType): ${newFormatMarks.length}`);
    console.log(`Old format (without examType): ${oldFormatMarks.length}\n`);

    const marks = allMarks.slice(0, 10);
    console.log(`Showing first ${marks.length} records:\n`);
    marks.forEach((mark, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(JSON.stringify(mark, null, 2));
      console.log('---\n');
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkMarks();
