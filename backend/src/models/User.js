const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
    validate: {
      validator: function(v) {
        // Must contain at least one lowercase letter and one number
        return /[a-z]/.test(v) && /[0-9]/.test(v);
      },
      message: 'Password must contain at least one lowercase letter and one number'
    }
  },
  role: {
    type: String,
    enum: ['ADMIN', 'FACULTY', 'STUDENT', 'PARENT'],
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: function() {
      return ['ADMIN', 'FACULTY', 'STUDENT'].includes(this.role);
    }
  },
  linkedStudentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: function() {
      return this.role === 'PARENT';
    }
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
  },
  address: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  profileComplete: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  twoFactorSecret: String,
  twoFactorEnabled: { type: Boolean, default: false },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  const salt = await bcrypt.genSalt(rounds);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if profile is complete
UserSchema.methods.isProfileComplete = function() {
  if (this.role === 'PARENT') {
    return !!(this.name && this.email && this.linkedStudentId);
  }
  const requiredFields = ['name', 'email', 'role', 'department'];
  return requiredFields.every(field => this[field]);
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Generate email verification token
UserSchema.methods.getEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  return verificationToken;
};

module.exports = mongoose.model('User', UserSchema);