require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/Student');
const User = require('./src/models/User');

async function checkAndFixProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    // Find all users with STUDENT role
    const users = await User.find({ role: 'STUDENT' }).select('_id name email');
    console.log(`Found ${users.length} student users:\n`);
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}) - ID: ${u._id}`);
    });

    console.log('\n---\n');

    // Find all student profiles
    const students = await Student.find()
      .populate('userId', 'name email')
      .select('usn userId');
    
    console.log(`Found ${students.length} student profiles:\n`);
    students.forEach(s => {
      console.log(`- USN: ${s.usn} - Linked to: ${s.userId?.name || 'NO USER'} (${s.userId?.email || 'N/A'})`);
    });

    console.log('\n---\n');

    // Find Naresh user
    const nareshUser = users.find(u => u.name.toLowerCase().includes('naresh'));
    if (!nareshUser) {
      console.error('❌ No user found with name containing "Naresh"');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found Naresh user: ${nareshUser.name} (${nareshUser.email})`);
    console.log(`   User ID: ${nareshUser._id}\n`);

    // Find Naresh student profile
    const nareshStudent = await Student.findOne({ usn: 'IS047' });
    if (!nareshStudent) {
      console.error('❌ No student profile found with USN IS047');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found Naresh student profile: USN ${nareshStudent.usn}`);
    console.log(`   Current userId: ${nareshStudent.userId}\n`);

    // Check if they match
    if (nareshStudent.userId.toString() === nareshUser._id.toString()) {
      console.log('✅ User and Profile are already correctly linked!');
      console.log('\nThe issue might be with authentication. Check:');
      console.log('1. Is the user logged in with the correct account?');
      console.log('2. Is the JWT token valid?');
      console.log('3. Check browser console for errors');
    } else {
      console.log('❌ MISMATCH FOUND!');
      console.log(`   Profile userId: ${nareshStudent.userId}`);
      console.log(`   Actual user ID: ${nareshUser._id}`);
      console.log('\nFixing the link...');

      // Update the student profile to link to correct user
      nareshStudent.userId = nareshUser._id;
      await nareshStudent.save();

      console.log('✅ FIXED! Profile now linked to correct user.');
      console.log('\nPlease logout and login again, then refresh the dashboard.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAndFixProfile();
