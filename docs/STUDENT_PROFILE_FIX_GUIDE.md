# Student Profile Not Found - Fix Guide

## Problem Description

When a student user (Naresh) logs in, they see "Student Profile Not Found" message. This happens because:

1. A User account exists with role "STUDENT"
2. But no corresponding Student profile exists in the database
3. The Student profile is required to access student-specific features

## Root Cause

The Student profile must be created by an administrator. When a user registers with role "STUDENT", only the User account is created. The Student profile (which contains USN, semester, department, subjects, etc.) must be created separately.

## Solution

### Option 1: Run the Automated Script (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Run the student profile creation script:
   ```bash
   node create-student-profile.js
   ```

3. The script will:
   - Find the user "Naresh" in the database
   - Check if a Student profile already exists
   - Create a Student profile with USN "1MJ23IS047"
   - Link it to an existing department or create a default one
   - Set semester to 5 and admission year to 2023

4. After the script completes, refresh the student dashboard

### Option 2: Create Profile via Admin Panel

1. Log in as an administrator
2. Navigate to Students Management
3. Click "Add New Student"
4. Fill in the following details:
   - **Name**: Naresh
   - **Email**: (the email Naresh used to register)
   - **Password**: (set a temporary password)
   - **USN**: 1MJ23IS047
   - **Department**: Select appropriate department
   - **Semester**: 5
   - **Subjects**: (optional, can be added later)
5. Click "Create Student"

### Option 3: Manual Database Entry (Advanced)

If you have direct database access:

```javascript
// Connect to MongoDB
use campushub

// Find the user
const user = db.users.findOne({ name: "Naresh" })

// Find a department
const dept = db.departments.findOne()

// Create student profile
db.students.insertOne({
  userId: user._id,
  usn: "1MJ23IS047",
  department: dept._id,
  semester: 5,
  subjects: [],
  admissionYear: 2023,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Parent Account Linking

If Shankar (parent) registered with child's USN "1mj23is047":

1. After creating Naresh's student profile, the parent can link their account
2. Log in as Shankar (parent)
3. Navigate to Parent Dashboard
4. Use the "Link Student" feature with USN: 1MJ23IS047
5. The system will link the parent account to Naresh's student profile

## Verification Steps

After creating the student profile:

1. Log in as Naresh (student)
2. You should see the student dashboard with:
   - Attendance summary
   - Marks overview
   - Notices
   - Timetable
   - Leave management
3. Profile information should be visible in the "My Profile" section

## Prevention

To prevent this issue in the future:

1. **For Administrators**: Always create Student profiles immediately after creating student User accounts
2. **For Students**: Contact your administrator if you see "Profile Not Found" after registration
3. **System Enhancement**: Consider implementing automatic Student profile creation during student registration (requires code changes)

## Technical Details

### Database Schema

**User Model** (authentication):
- name, email, password, role
- Stores login credentials

**Student Model** (profile):
- userId (reference to User)
- usn, department, semester, subjects
- Stores academic information

### API Endpoints

- `GET /api/students/me` - Get student's own profile
- `POST /api/students` - Create new student (Admin only)
- `POST /api/parent/link-student` - Link parent to student

## Troubleshooting

### Script Fails to Find User
- Check if the user "Naresh" exists in the database
- Verify the email address used during registration
- Modify the script to search by email instead of name

### Department Not Found
- The script will create a default "Computer Science" department
- Or manually create a department first via admin panel

### Permission Denied
- Ensure you're running the script from the backend directory
- Check MongoDB connection string in `.env` file
- Verify database user has write permissions

## Contact

If issues persist:
1. Check backend logs for detailed error messages
2. Verify MongoDB connection
3. Contact system administrator with error details
