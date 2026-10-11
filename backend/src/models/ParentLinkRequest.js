const mongoose = require('mongoose');

// A parent's request to link to a student (identified by USN at submit
// time). Linking NEVER happens on submit: an ADMIN must review and approve
// first, and only then is the parent's linkedStudentId set. This keeps
// USN-guessing from ever binding a parent to a child.
const parentLinkRequestSchema = new mongoose.Schema({
  parentUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Normalized USN exactly as submitted (trimmed + uppercased).
  usn: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  // Resolved server-side at submit time when the USN matches a student.
  // Null when unresolvable — the request still exists so the response can
  // stay generic (no USN-existence oracle).
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  adminNote: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// One pending request per parent at a time (prevents duplicate floods;
// history rows remain for audit).
parentLinkRequestSchema.index(
  { parentUser: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

module.exports = mongoose.model('ParentLinkRequest', parentLinkRequestSchema);
