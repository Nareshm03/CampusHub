require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Department = require('./src/models/Department');
const Subject = require('./src/models/Subject');
const Marks = require('./src/models/Marks');
const Attendance = require('./src/models/Attendance');

const seedFacultyData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Get or create CSE department
    let cseDept = await Department.findOne({ code: 'CSE' });
    if (!cseDept) {
      cseDept = await Department.create({
        name: 'Computer Science Engineering',
        code: 'CSE',
        description: 'Computer Science and Engineering Department'
      });
      console.log('Created CSE department');
    }

    // Find or create a faculty user
    let faculty = await User.findOne({ role: 'FACULTY', email: { $exists: true } });
    
    if (!faculty) {
      // Create a test faculty user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      faculty = await User.create({
        name: 'Dr. John Smith',
        email: 'faculty@test.com',
        password: hashedPassword,
        role: 'FACULTY',
        department: cseDept._id,
        phone: '9876543210',
        profileComplete: true,
        isEmailVerified: true
      });
      console.log('Created test faculty user: faculty@test.com / password123');
    }

    // Create subjects assigned to this faculty
    const subjectData = [
      { name: 'Data Structures and Algorithms', subjectCode: 'CS303', semester: 3, credits: 4 },
      { name: 'Database Management Systems', subjectCode: 'CS401', semester: 4, credits: 4 },
      { name: 'Web Technologies', subjectCode: 'CS503', semester: 5, credits: 3 }
    ];

    const subjects = [];
    for (const subData of subjectData) {
      let subject = await Subject.findOne({ subjectCode: subData.subjectCode });
      
      if (!subject) {
        subject = await Subject.create({
          ...subData,
          department: cseDept._id,
          faculty: faculty._id
        });
        console.log(`Created subject: ${subject.name}`);
      } else {
        // Update faculty assignment
        subject.faculty = faculty._id;
        await subject.save();
        console.log(`Updated faculty for subject: ${subject.name}`);
      }
      
      subjects.push(subject);
    }

    // Find or create student users and Student profiles
    const Student = require('./src/models/Student');
    const studentData = [
      { name: 'Alice Johnson', email: 'alice@test.com', usn: 'CSE001', semester: 3 },
      { name: 'Bob Williams', email: 'bob@test.com', usn: 'CSE002', semester: 3 },
      { name: 'Charlie Brown', email: 'charlie@test.com', usn: 'CSE003', semester: 4 },
      { name: 'Diana Prince', email: 'diana@test.com', usn: 'CSE004', semester: 4 },
      { name: 'Eve Martinez', email: 'eve@test.com', usn: 'CSE005', semester: 5 },
      { name: 'Frank Zhang', email: 'frank@test.com', usn: 'CSE006', semester: 5 },
      { name: 'Grace Lee', email: 'grace@test.com', usn: 'CSE007', semester: 3 },
      { name: 'Henry Davis', email: 'henry@test.com', usn: 'CSE008', semester: 4 }
    ];

    const students = [];
    const studentProfiles = [];
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('student123', 10);

    for (const stuData of studentData) {
      let studentUser = await User.findOne({ email: stuData.email });
      
      if (!studentUser) {
        studentUser = await User.create({
          name: stuData.name,
          email: stuData.email,
          password: hashedPassword,
          role: 'STUDENT',
          department: cseDept._id,
          phone: '9876543210',
          profileComplete: true,
          isEmailVerified: true
        });
        console.log(`Created student user: ${stuData.name}`);
      }
      
      // Create or update Student profile
      let studentProfile = await Student.findOne({ userId: studentUser._id });
      
      // Get subjects for this student's semester
      const studentSubjects = subjects.filter(s => s.semester === stuData.semester).map(s => s._id);
      
      if (!studentProfile) {
        studentProfile = await Student.create({
          userId: studentUser._id,
          usn: stuData.usn,
          department: cseDept._id,
          semester: stuData.semester,
          subjects: studentSubjects
        });
        console.log(`Created student profile: ${stuData.usn}`);
      } else {
        // Update subjects
        studentProfile.subjects = studentSubjects;
        await studentProfile.save();
        console.log(`Updated student profile: ${stuData.usn}`);
      }
      
      students.push(studentUser);
      studentProfiles.push(studentProfile);
    }

    // Create marks for each subject
    console.log('\nCreating marks data...');
    
    const calculateGrade = (marks, maxMarks) => {
      const percentage = (marks / maxMarks) * 100;
      if (percentage >= 90) return 'A+';
      if (percentage >= 80) return 'A';
      if (percentage >= 70) return 'B+';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C';
      if (percentage >= 40) return 'D';
      return 'F';
    };
    
    for (const subject of subjects) {
      // Get students for this subject's semester
      const semesterStudentProfiles = studentProfiles.filter(sp => sp.semester === subject.semester);
      
      for (const studentProfile of semesterStudentProfiles) {
        const existingMark = await Marks.findOne({
          student: studentProfile.userId,
          subject: subject._id
        });

        if (!existingMark) {
          // Generate random marks between 40-95
          const marks = Math.floor(Math.random() * 55) + 40;
          const maxMarks = 100;
          const grade = calculateGrade(marks, maxMarks);
          
          await Marks.create({
            student: studentProfile.userId,
            subject: subject._id,
            examType: 'INTERNAL',
            examName: 'Internal Assessment 1',
            marks: marks,
            maxMarks: maxMarks,
            grade: grade,
            enteredBy: faculty._id
          });
        }
      }
      console.log(`Created marks for ${subject.name}`);
    }

    // Create attendance records for the last 30 days
    console.log('\nCreating attendance data...');
    for (const subject of subjects) {
      // Get students for this subject's semester
      const semesterStudentProfiles = studentProfiles.filter(sp => sp.semester === subject.semester);
      
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        for (const studentProfile of semesterStudentProfiles) {
          const existingAttendance = await Attendance.findOne({
            student: studentProfile.userId,
            subject: subject._id,
            date: {
              $gte: new Date(date.setHours(0, 0, 0, 0)),
              $lt: new Date(date.setHours(23, 59, 59, 999))
            }
          });

          if (!existingAttendance) {
            // 80% chance of being present
            const isPresent = Math.random() > 0.2;
            
            await Attendance.create({
              student: studentProfile.userId,
              subject: subject._id,
              date: date,
              status: isPresent ? 'PRESENT' : 'ABSENT',
              markedBy: faculty._id
            });
          }
        }
      }
      console.log(`Created attendance for ${subject.name}`);
    }

    console.log('\n✅ Faculty data seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('Faculty: faculty@test.com / password123');
    console.log('Students: alice@test.com, bob@test.com, etc. / student123');
    
  } catch (error) {
    console.error('Error seeding faculty data:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedFacultyData();
