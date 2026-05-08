/**
 * Demo data and examples for Homework Management System
 * Use this file to understand the data structure and test the system
 */

// Example Homework Creation Request
const exampleHomeworkCreation = {
  title: "Research Paper on Machine Learning",
  description: "Write a comprehensive research paper on supervised learning algorithms",
  course: "6507f1b2e99b4c23a8d3e456", // Course ObjectId
  dueDate: "2026-02-15T23:59:00",
  totalPoints: 100,
  allowLateSubmission: true,
  latePenaltyPercentage: 10,
  latePenaltyPerDay: true,
  maxLateDays: 3,
  instructions: `
    Requirements:
    1. Minimum 2000 words
    2. Include at least 5 references
    3. Use IEEE citation format
    4. Include code examples
    5. Submit as PDF
    
    Grading Criteria:
    - Content Quality: 40 points
    - Code Examples: 30 points
    - References: 20 points
    - Formatting: 10 points
  `,
  allowedFileTypes: ["pdf", "doc", "docx"],
  maxFileSize: 10485760, // 10MB
  enablePlagiarismCheck: true,
  plagiarismThreshold: 30
};

// Example Homework Submission Request
const exampleSubmission = {
  textContent: `
    Introduction to Supervised Learning
    
    Supervised learning is a type of machine learning where the algorithm learns from 
    labeled training data. The goal is to create a function that maps inputs to outputs 
    based on example input-output pairs.
    
    Types of Supervised Learning:
    1. Classification - Predicting discrete class labels
    2. Regression - Predicting continuous values
    
    Common Algorithms:
    - Linear Regression
    - Logistic Regression
    - Decision Trees
    - Support Vector Machines
    - Neural Networks
    
    [Additional content would go here...]
  `,
  // Files would be uploaded via FormData
};

// Example Grading Request
const exampleGrading = {
  grade: 85,
  feedback: `
    Excellent work overall!
    
    Strengths:
    - Clear explanation of concepts
    - Good code examples
    - Well-structured paper
    
    Areas for improvement:
    - Could include more recent research (2025-2026)
    - Some citations missing page numbers
    - Code formatting could be improved
    
    Keep up the good work!
  `,
  resubmissionAllowed: false
};

// Example API Usage with Axios

// 1. Create Homework (Faculty)
async function createHomework() {
  const formData = new FormData();
  
  Object.keys(exampleHomeworkCreation).forEach(key => {
    formData.append(key, exampleHomeworkCreation[key]);
  });
  
  // Add attachments
  const fileInput = document.getElementById('attachments');
  for (let file of fileInput.files) {
    formData.append('attachments', file);
  }
  
  const response = await axios.post('/api/v1/homework', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  return response.data;
}

// 2. Submit Homework (Student)
async function submitHomework(homeworkId) {
  const formData = new FormData();
  
  formData.append('textContent', exampleSubmission.textContent);
  
  // Add files
  const fileInput = document.getElementById('submission-files');
  for (let file of fileInput.files) {
    formData.append('files', file);
  }
  
  const response = await axios.post(
    `/api/v1/homework/${homeworkId}/submit`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  
  return response.data;
}

// 3. Grade Submission (Faculty)
async function gradeSubmission(submissionId) {
  const response = await axios.post(
    `/api/v1/homework/submissions/${submissionId}/grade`,
    exampleGrading
  );
  
  return response.data;
}

// 4. Run Plagiarism Check (Faculty)
async function checkPlagiarism(submissionId) {
  const response = await axios.post(
    `/api/v1/homework/submissions/${submissionId}/plagiarism-check`
  );
  
  return response.data;
}

// Test Data for Plagiarism Detection
const plagiarismTestCases = {
  original: `
    Machine learning is a subset of artificial intelligence that focuses on the 
    development of algorithms that can learn from and make predictions or decisions 
    based on data. It enables computers to learn without being explicitly programmed.
  `,
  
  highSimilarity: `
    Machine learning is a subset of artificial intelligence which focuses on the 
    development of algorithms that can learn from and make predictions or decisions 
    based on data. It allows computers to learn without being explicitly programmed.
  `, // ~95% similar
  
  mediumSimilarity: `
    Machine learning represents a branch of AI that concentrates on creating algorithms 
    capable of learning from data and making predictions. This technology allows systems 
    to improve without explicit programming.
  `, // ~50% similar
  
  lowSimilarity: `
    Neural networks are computational models inspired by biological neurons. They consist 
    of interconnected nodes that process information through weighted connections and 
    activation functions.
  ` // ~5% similar
};

// MongoDB Queries Examples

// Find overdue homework
const findOverdueHomework = {
  dueDate: { $lt: new Date() },
  isActive: true
};

// Find submissions needing grading
const findPendingGrading = {
  status: 'submitted'
};

// Find high plagiarism submissions
const findHighPlagiarism = {
  isPlagiarismChecked: true,
  plagiarismScore: { $gte: 50 }
};

// Aggregation: Get homework statistics
const homeworkStatsAggregation = [
  {
    $match: { _id: ObjectId("homework_id_here") }
  },
  {
    $lookup: {
      from: 'submissions',
      localField: '_id',
      foreignField: 'homework',
      as: 'submissions'
    }
  },
  {
    $project: {
      title: 1,
      totalSubmissions: { $size: '$submissions' },
      gradedCount: {
        $size: {
          $filter: {
            input: '$submissions',
            cond: { $eq: ['$$this.status', 'graded'] }
          }
        }
      },
      avgGrade: { $avg: '$submissions.adjustedGrade' },
      lateSubmissions: {
        $size: {
          $filter: {
            input: '$submissions',
            cond: { $eq: ['$$this.isLate', true] }
          }
        }
      }
    }
  }
];

// Response Examples

const successfulHomeworkCreation = {
  success: true,
  message: 'Homework created successfully',
  data: {
    _id: '6507f1b2e99b4c23a8d3e789',
    title: 'Research Paper on Machine Learning',
    description: 'Write a comprehensive research paper...',
    course: {
      _id: '6507f1b2e99b4c23a8d3e456',
      name: 'Machine Learning',
      code: 'CS401'
    },
    faculty: {
      _id: '6507f1b2e99b4c23a8d3e123',
      name: 'Dr. Jane Smith',
      email: 'jane.smith@university.edu'
    },
    dueDate: '2026-02-15T23:59:00.000Z',
    totalPoints: 100,
    submissionCount: 0,
    isActive: true,
    createdAt: '2026-01-30T10:00:00.000Z'
  }
};

const successfulSubmission = {
  success: true,
  message: 'Homework submitted successfully',
  data: {
    _id: '6507f1b2e99b4c23a8d3e999',
    homework: '6507f1b2e99b4c23a8d3e789',
    student: {
      _id: '6507f1b2e99b4c23a8d3e321',
      name: 'John Doe',
      email: 'john.doe@university.edu',
      rollNumber: 'CS2023001'
    },
    files: [
      {
        filename: '1706610000000-123456789-research_paper.pdf',
        originalName: 'research_paper.pdf',
        path: 'uploads/homework/1706610000000-123456789-research_paper.pdf',
        mimetype: 'application/pdf',
        size: 2048576
      }
    ],
    textContent: 'Introduction to Supervised Learning...',
    submittedAt: '2026-02-14T20:30:00.000Z',
    isLate: false,
    daysLate: 0,
    latePenalty: 0,
    plagiarismScore: 15,
    isPlagiarismChecked: true,
    status: 'submitted',
    version: 1
  }
};

const successfulGrading = {
  success: true,
  message: 'Submission graded successfully',
  data: {
    _id: '6507f1b2e99b4c23a8d3e999',
    grade: 85,
    adjustedGrade: 85,
    feedback: 'Excellent work overall!...',
    status: 'graded',
    gradedBy: {
      _id: '6507f1b2e99b4c23a8d3e123',
      name: 'Dr. Jane Smith',
      email: 'jane.smith@university.edu'
    },
    gradedAt: '2026-02-16T14:30:00.000Z'
  }
};

const plagiarismCheckResult = {
  success: true,
  message: 'Plagiarism check completed',
  data: {
    plagiarismScore: 45,
    isPlagiarized: true,
    matches: [
      {
        matchedWith: '6507f1b2e99b4c23a8d3e888',
        student: {
          _id: '6507f1b2e99b4c23a8d3e322',
          name: 'Jane Smith'
        },
        similarityScore: 45,
        matchedSegments: [
          {
            text: 'machine learning is a subset of artificial intelligence',
            position: 10
          }
        ]
      }
    ]
  }
};

// Error Examples

const errorExamples = {
  invalidFileType: {
    success: false,
    message: 'Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, JPG, PNG, ZIP, RAR'
  },
  
  lateSubmissionNotAllowed: {
    success: false,
    message: 'Late submissions are not allowed for this homework'
  },
  
  alreadySubmitted: {
    success: false,
    message: 'You have already submitted this homework'
  },
  
  notAuthorized: {
    success: false,
    message: 'Not authorized to grade this submission'
  },
  
  fileTooLarge: {
    success: false,
    message: 'File too large. Maximum size is 10MB'
  }
};

// Testing Checklist

const testingChecklist = {
  facultyTests: [
    'Create homework with all fields',
    'Create homework with minimal fields',
    'Update homework details',
    'Delete homework',
    'View all submissions for homework',
    'Grade a submission',
    'Run plagiarism check',
    'Download student submission files'
  ],
  
  studentTests: [
    'View available homework',
    'View homework details',
    'Submit homework before deadline',
    'Submit homework after deadline (if allowed)',
    'Submit with files only',
    'Submit with text only',
    'Submit with both files and text',
    'View submission status',
    'View grades and feedback'
  ],
  
  systemTests: [
    'Late penalty calculation',
    'Plagiarism detection accuracy',
    'File upload validation',
    'File download functionality',
    'Statistics calculation',
    'Permission checks',
    'Due date tracking'
  ]
};

module.exports = {
  exampleHomeworkCreation,
  exampleSubmission,
  exampleGrading,
  plagiarismTestCases,
  testingChecklist
};
