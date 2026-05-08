const mongoose = require('mongoose');

// Comprehensive indexing strategy
const createIndexes = async () => {
  try {
    // User indexes
    await mongoose.model('User').collection.createIndex({ email: 1 }, { unique: true });
    await mongoose.model('User').collection.createIndex({ role: 1, department: 1 });
    await mongoose.model('User').collection.createIndex({ createdAt: -1 });
    
    // Student indexes
    await mongoose.model('Student').collection.createIndex({ usn: 1 }, { unique: true });
    await mongoose.model('Student').collection.createIndex({ userId: 1 }, { unique: true });
    await mongoose.model('Student').collection.createIndex({ department: 1, semester: 1 });
    await mongoose.model('Student').collection.createIndex({ subjects: 1 });
    
    // Faculty indexes
    if (mongoose.models.Faculty) {
      await mongoose.model('Faculty').collection.createIndex({ employeeId: 1 }, { unique: true });
      await mongoose.model('Faculty').collection.createIndex({ department: 1 });
    }
    
    // Subject indexes
    if (mongoose.models.Subject) {
      await mongoose.model('Subject').collection.createIndex({ code: 1 }, { unique: true });
      await mongoose.model('Subject').collection.createIndex({ department: 1, semester: 1 });
    }
    
    // Attendance indexes
    if (mongoose.models.Attendance) {
      await mongoose.model('Attendance').collection.createIndex({ studentId: 1, date: -1 });
      await mongoose.model('Attendance').collection.createIndex({ subjectId: 1, date: -1 });
      await mongoose.model('Attendance').collection.createIndex({ studentId: 1, subjectId: 1, date: 1 }, { unique: true });
    }
    
    // Marks indexes
    if (mongoose.models.Marks) {
      await mongoose.model('Marks').collection.createIndex({ studentId: 1, subjectId: 1, examType: 1 });
      await mongoose.model('Marks').collection.createIndex({ createdAt: -1 });
    }
    
    // Notice indexes
    if (mongoose.models.Notice) {
      await mongoose.model('Notice').collection.createIndex({ createdAt: -1 });
      await mongoose.model('Notice').collection.createIndex({ department: 1, createdAt: -1 });
    }
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

module.exports = createIndexes;