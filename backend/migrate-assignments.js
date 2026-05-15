/**
 * Migration script to fix faculty references in assignments
 * Run once after deploying the model changes
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Assignment = require('./src/models/Assignment');
const Faculty = require('./src/models/Faculty');
const User = require('./src/models/User');

async function migrateAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const assignments = await Assignment.find({});
    console.log(`Found ${assignments.length} assignments to check`);

    let updated = 0;
    for (const assignment of assignments) {
      // Check if faculty field points to a User instead of Faculty
      const user = await User.findById(assignment.faculty);
      if (user) {
        // Find the corresponding Faculty document
        const faculty = await Faculty.findOne({ userId: user._id });
        if (faculty) {
          assignment.faculty = faculty._id;
          await assignment.save();
          updated++;
          console.log(`Updated assignment: ${assignment.title}`);
        }
      }
    }

    console.log(`Migration complete. Updated ${updated} assignments.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAssignments();
