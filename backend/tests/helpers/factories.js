// Deterministic fixtures. Every value is fixed so repeated runs produce
// identical results. Passwords satisfy the User model validator.
const User = require('../../src/models/User');
const Student = require('../../src/models/Student');
const Faculty = require('../../src/models/Faculty');
const Department = require('../../src/models/Department');
const Subject = require('../../src/models/Subject');

let counter = 0;
const uniq = (prefix) => `${prefix}${String(counter++).padStart(4, '0')}`;

async function createDepartment(name = 'Computer Science', code = 'CS') {
  return Department.create({ name: `${name}`, code: `${code}${counter}` });
}

async function createUser({ name = 'Test User', email, role = 'STUDENT', department }) {
  const finalEmail = email || `${role.toLowerCase()}.${uniq('u')}@test.com`;
  const user = new User({
    name,
    email: finalEmail,
    password: 'Passw0rd!',
    role,
    department: department || null,
  });
  await user.save();
  return user;
}

async function createStudent({ user, usn, department, semester = 3, subjects = [] } = {}) {
  const dept = department || (await createDepartment());
  const owner = user || (await createUser({ role: 'STUDENT', department: dept._id }));
  const profile = await Student.create({
    userId: owner._id,
    usn: usn || `USN${uniq('S').toUpperCase()}`,
    department: dept._id,
    semester,
    subjects,
  });
  return { user: owner, profile, department: dept };
}

async function createFaculty({ user, department, employeeId, subjects = [] } = {}) {
  const dept = department || (await createDepartment('Electronics', 'EC'));
  const owner = user || (await createUser({ role: 'FACULTY', department: dept._id }));
  const profile = await Faculty.create({
    userId: owner._id,
    employeeId: employeeId || uniq('EMP'),
    department: dept._id,
    designation: 'Assistant Professor',
    qualification: 'M.Tech',
    experience: 5,
    dateOfJoining: new Date('2023-01-15'),
    subjects,
  });
  return { user: owner, profile, department: dept };
}

async function assignSubjectToFaculty(facultyProfile, subjectId) {
  const Faculty = require('../../src/models/Faculty');
  await Faculty.findByIdAndUpdate(facultyProfile._id, { $addToSet: { subjects: subjectId } });
}

async function createSubject({ name = 'Data Structures', code = 'CS201', department, semester = 3, credits = 4, faculty } = {}) {
  const dept = department || (await createDepartment());
  return Subject.create({
    name,
    subjectCode: `${code}${counter}`,
    department: dept._id,
    semester,
    credits,
    faculty: faculty || undefined,
  });
}

const authHeader = (user) => ({ Authorization: `Bearer ${user.getSignedJwtToken()}` });

module.exports = {
  createDepartment,
  createUser,
  createStudent,
  createFaculty,
  createSubject,
  assignSubjectToFaculty,
  authHeader,
};
