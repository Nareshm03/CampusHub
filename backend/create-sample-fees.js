require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/Student');
const User = require('./src/models/User');
const Fee = require('./src/models/Fee');

const createSampleFees = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MongoDB URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Find Naresh's student record
    const student = await Student.findOne({ usn: '1MJ23IS047' })
      .populate('userId', 'name email');

    if (!student) {
      console.log('❌ Student with USN 1MJ23IS047 not found');
      process.exit(1);
    }

    console.log('✅ Found student:', student.userId?.name, '(', student.usn, ')');

    // Check existing fees
    const existingFees = await Fee.find({ student: student._id });
    console.log('Existing fee records:', existingFees.length);

    if (existingFees.length > 0) {
      console.log('\n📋 Current fee records:');
      existingFees.forEach(fee => {
        console.log(`  - Semester ${fee.semester}: ${fee.status} - ₹${fee.totalAmount}`);
      });
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('\nDo you want to add more fee records? (y/n): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Exiting...');
        process.exit(0);
      }
    }

    // Create sample fee records for current semester (6) and previous semesters
    const currentYear = new Date().getFullYear();
    const sampleFees = [
      {
        student: student._id,
        semester: 6,
        academicYear: `${currentYear}-${currentYear + 1}`,
        title: 'Semester 6 Tuition Fee',
        totalAmount: 85000,
        paidAmount: 0,
        status: 'PENDING',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      {
        student: student._id,
        semester: 5,
        academicYear: `${currentYear - 1}-${currentYear}`,
        title: 'Semester 5 Tuition Fee',
        totalAmount: 85000,
        paidAmount: 85000,
        status: 'PAID',
        dueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        payments: [
          {
            amount: 85000,
            paymentDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
            paymentMethod: 'UPI',
            transactionId: 'TXN' + Date.now(),
            receiptNumber: 'RCP' + Date.now()
          }
        ]
      },
      {
        student: student._id,
        semester: 4,
        academicYear: `${currentYear - 1}-${currentYear}`,
        title: 'Semester 4 Tuition Fee',
        totalAmount: 80000,
        paidAmount: 80000,
        status: 'PAID',
        dueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        payments: [
          {
            amount: 80000,
            paymentDate: new Date(Date.now() - 175 * 24 * 60 * 60 * 1000),
            paymentMethod: 'CARD',
            transactionId: 'TXN' + (Date.now() - 1000),
            receiptNumber: 'RCP' + (Date.now() - 1000)
          }
        ]
      }
    ];

    // Insert fee records
    const createdFees = await Fee.insertMany(sampleFees);
    
    console.log('\n✅ Created', createdFees.length, 'fee records:');
    createdFees.forEach(fee => {
      console.log(`  - Semester ${fee.semester}: ${fee.status} - ₹${fee.totalAmount} (Due: ${fee.dueDate.toLocaleDateString()})`);
    });

    console.log('\n📊 Summary:');
    console.log('  Student:', student.userId?.name);
    console.log('  USN:', student.usn);
    console.log('  Total fee records:', createdFees.length);
    console.log('  Pending amount: ₹85,000');
    console.log('  Paid amount: ₹1,65,000');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createSampleFees();
