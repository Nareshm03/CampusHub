#!/usr/bin/env node

/**
 * Test script for Assignment, Exam Schedule, and Subject APIs
 * Run: node test-systems.js
 */

const baseURL = 'http://localhost:5000/api/v1';

console.log('🧪 Testing Assignment, Exam, and Subject Management Systems\n');
console.log('📋 Prerequisites:');
console.log('   - Backend server running on port 5000');
console.log('   - Valid authentication tokens');
console.log('   - Sample data in database\n');

console.log('=' .repeat(70));
console.log('\n📝 ASSIGNMENT SYSTEM');
console.log('=' .repeat(70));

console.log('\n✅ Available Endpoints:\n');

const assignmentEndpoints = [
  { method: 'POST', path: '/assignments', role: 'Faculty/Admin', desc: 'Create assignment' },
  { method: 'GET', path: '/assignments', role: 'All', desc: 'List assignments' },
  { method: 'GET', path: '/assignments/:id', role: 'All', desc: 'Get assignment details' },
  { method: 'PUT', path: '/assignments/:id', role: 'Faculty/Admin', desc: 'Update assignment' },
  { method: 'DELETE', path: '/assignments/:id', role: 'Faculty/Admin', desc: 'Delete assignment' },
  { method: 'POST', path: '/assignments/:id/submit', role: 'Student', desc: 'Submit assignment' },
  { method: 'GET', path: '/assignments/:id/submissions', role: 'Faculty/Admin', desc: 'View submissions' },
  { method: 'PUT', path: '/assignments/submissions/:id/grade', role: 'Faculty/Admin', desc: 'Grade submission' },
  { method: 'GET', path: '/assignments/my-submissions', role: 'Student', desc: 'View own submissions' }
];

assignmentEndpoints.forEach(endpoint => {
  console.log(`   ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(45)} [${endpoint.role.padEnd(15)}] ${endpoint.desc}`);
});

console.log('\n📋 Sample Request:');
console.log(`
POST ${baseURL}/assignments
Authorization: Bearer <faculty_token>
Content-Type: application/json

{
  "title": "Algorithm Analysis Assignment",
  "description": "Analyze time complexity of sorting algorithms",
  "subject": "subjectId",
  "department": "deptId",
  "semester": 3,
  "dueDate": "2026-02-28T23:59:59",
  "totalMarks": 100,
  "submissionType": "FILE",
  "allowLateSubmission": true
}
`);

console.log('=' .repeat(70));
console.log('\n📅 EXAM SCHEDULING SYSTEM');
console.log('=' .repeat(70));

console.log('\n✅ Available Endpoints:\n');

const examEndpoints = [
  { method: 'POST', path: '/exam-schedules', role: 'Admin', desc: 'Create exam schedule' },
  { method: 'GET', path: '/exam-schedules', role: 'All', desc: 'List exam schedules' },
  { method: 'GET', path: '/exam-schedules/:id', role: 'All', desc: 'Get schedule details' },
  { method: 'PUT', path: '/exam-schedules/:id', role: 'Admin', desc: 'Update schedule' },
  { method: 'DELETE', path: '/exam-schedules/:id', role: 'Admin', desc: 'Delete schedule' },
  { method: 'PUT', path: '/exam-schedules/:id/publish', role: 'Admin', desc: 'Publish schedule' },
  { method: 'POST', path: '/exam-schedules/:id/register', role: 'Student', desc: 'Register for exam' },
  { method: 'GET', path: '/exam-schedules/:id/registrations', role: 'Admin', desc: 'View registrations' },
  { method: 'PUT', path: '/exam-schedules/registrations/:id/hall-ticket', role: 'Admin', desc: 'Issue hall ticket' },
  { method: 'GET', path: '/exam-schedules/registrations/my-registrations', role: 'Student', desc: 'My registrations' }
];

examEndpoints.forEach(endpoint => {
  console.log(`   ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(50)} [${endpoint.role.padEnd(10)}] ${endpoint.desc}`);
});

console.log('\n📋 Sample Request:');
console.log(`
POST ${baseURL}/exam-schedules
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "academicYear": "2025-26",
  "examType": "MIDTERM",
  "name": "Mid Semester Examination",
  "department": "deptId",
  "semester": 3,
  "startDate": "2026-03-01",
  "endDate": "2026-03-10",
  "registrationStartDate": "2026-02-01",
  "registrationEndDate": "2026-02-20",
  "subjects": [
    {
      "subject": "subjectId",
      "examDate": "2026-03-01",
      "startTime": "09:00",
      "endTime": "12:00",
      "duration": 180,
      "venue": "Hall A",
      "maxMarks": 100
    }
  ]
}
`);

console.log('=' .repeat(70));
console.log('\n📚 SUBJECT MANAGEMENT');
console.log('=' .repeat(70));

console.log('\n✅ Available Endpoints:\n');

const subjectEndpoints = [
  { method: 'POST', path: '/subjects', role: 'Admin', desc: 'Create subject' },
  { method: 'POST', path: '/subjects/bulk', role: 'Admin', desc: 'Bulk add subjects' },
  { method: 'GET', path: '/subjects', role: 'All', desc: 'List all subjects' },
  { method: 'GET', path: '/subjects/search', role: 'All', desc: 'Search subjects' },
  { method: 'GET', path: '/subjects/:id', role: 'All', desc: 'Get subject details' },
  { method: 'GET', path: '/subjects/:id/stats', role: 'Faculty/Admin', desc: 'Get statistics' },
  { method: 'PUT', path: '/subjects/:id', role: 'Admin', desc: 'Update subject' },
  { method: 'PUT', path: '/subjects/:id/assign-faculty', role: 'Admin', desc: 'Assign faculty' },
  { method: 'PUT', path: '/subjects/:id/remove-faculty', role: 'Admin', desc: 'Remove faculty' },
  { method: 'DELETE', path: '/subjects/:id', role: 'Admin', desc: 'Delete subject' }
];

subjectEndpoints.forEach(endpoint => {
  console.log(`   ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} [${endpoint.role.padEnd(15)}] ${endpoint.desc}`);
});

console.log('\n📋 Sample Request:');
console.log(`
POST ${baseURL}/subjects/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "subjects": [
    {
      "name": "Machine Learning",
      "subjectCode": "CS401",
      "department": "deptId",
      "semester": 7,
      "credits": 4
    },
    {
      "name": "Cloud Computing",
      "subjectCode": "CS402",
      "department": "deptId",
      "semester": 7,
      "credits": 3
    }
  ]
}
`);

console.log('=' .repeat(70));
console.log('\n🎯 TESTING CHECKLIST');
console.log('=' .repeat(70));

console.log(`
📝 Assignment Testing:
   □ Faculty creates assignment
   □ Student views assignment
   □ Student submits assignment
   □ Faculty views submissions
   □ Faculty grades submission
   □ Student views grade and feedback

📅 Exam Testing:
   □ Admin creates exam schedule
   □ Admin publishes schedule
   □ Student registers for exam
   □ Admin issues hall ticket
   □ Student downloads hall ticket

📚 Subject Testing:
   □ Admin adds single subject
   □ Admin bulk adds subjects
   □ Admin assigns faculty to subject
   □ Faculty views assigned subjects
   □ Get subject statistics
   □ Search subjects

🔒 Permission Testing:
   □ Student cannot create assignments
   □ Faculty cannot delete other faculty's assignments
   □ Student cannot access admin endpoints
   □ Faculty can only grade their own subject submissions
`);

console.log('=' .repeat(70));
console.log('\n📖 DOCUMENTATION');
console.log('=' .repeat(70));

console.log(`
   Full API Documentation:
   → ASSIGNMENT_EXAM_SYSTEM.md
   
   Quick Start Guide:
   → QUICKSTART_ASSIGNMENTS_EXAMS.md
   
   Permission System:
   → RBAC_ABAC_GUIDE.md
`);

console.log('=' .repeat(70));
console.log('\n💡 QUICK TIPS');
console.log('=' .repeat(70));

console.log(`
   1. Use Postman collections for easier testing
   2. Check backend logs for detailed error messages
   3. Verify authentication tokens are not expired
   4. Ensure proper permissions for each role
   5. Test with sample data before production use
`);

console.log('\n✅ All systems ready for testing!\n');
