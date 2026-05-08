const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  homework: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homework',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  files: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  textContent: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  daysLate: {
    type: Number,
    default: 0
  },
  latePenalty: {
    type: Number,
    default: 0
  },
  grade: {
    type: Number,
    min: 0
  },
  adjustedGrade: {
    type: Number,
    min: 0
  },
  feedback: {
    type: String
  },
  plagiarismScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  plagiarismDetails: [{
    matchedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission'
    },
    similarityScore: Number,
    matchedSegments: [{
      text: String,
      position: Number
    }]
  }],
  isPlagiarismChecked: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned', 'resubmitted'],
    default: 'submitted'
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  },
  resubmissionAllowed: {
    type: Boolean,
    default: false
  },
  previousSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  version: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one submission per student per homework (unless resubmission)
submissionSchema.index({ homework: 1, student: 1, version: 1 }, { unique: true });
submissionSchema.index({ homework: 1, submittedAt: -1 });
submissionSchema.index({ student: 1, submittedAt: -1 });
submissionSchema.index({ status: 1, gradedAt: -1 });

// Pre-save middleware to calculate late submission details
submissionSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('submittedAt')) {
    const Homework = mongoose.model('Homework');
    const homework = await Homework.findById(this.homework);
    
    if (homework) {
      this.isLate = this.submittedAt > homework.dueDate;
      
      if (this.isLate) {
        const timeDiff = this.submittedAt - homework.dueDate;
        this.daysLate = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        this.latePenalty = homework.calculateLatePenalty(this.submittedAt);
      }
    }
  }
  next();
});

// Method to calculate adjusted grade based on late penalty
submissionSchema.methods.calculateAdjustedGrade = function() {
  if (this.grade === undefined || this.grade === null) {
    return null;
  }
  
  const penalty = (this.grade * this.latePenalty) / 100;
  this.adjustedGrade = Math.max(0, this.grade - penalty);
  return this.adjustedGrade;
};

module.exports = mongoose.model('Submission', submissionSchema);
