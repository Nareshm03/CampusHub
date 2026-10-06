'use client';
import { useState, useEffect } from 'react';
import api from '../lib/axios';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';

const DEFAULT_EXAM_NAMES = {
  INTERNAL: 'Internal 1',
  EXTERNAL: 'Theory',
  ASSIGNMENT: 'Assignment 1',
  QUIZ: 'Quiz 1'
};

// Mirrors the faculty marks scale used by dashboard/faculty/marks and reports
const gradeForPercentage = (pct) => {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'F';
};

export default function GradeEntry({ subjectId }) {
  const [students, setStudents] = useState([]);
  const [examType, setExamType] = useState('INTERNAL');
  const [examName, setExamName] = useState(DEFAULT_EXAM_NAMES.INTERNAL);
  const [maxMarks, setMaxMarks] = useState(100);
  const [grades, setGrades] = useState({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [subjectId]);

  const fetchStudents = async () => {
    if (!subjectId) {
      setFetching(false);
      return;
    }
    try {
      setError('');
      const response = await api.get(`/subjects/${subjectId}/students`);
      const list = response.data?.data || [];
      setStudents(list);
      const initialGrades = {};
      list.forEach(student => {
        initialGrades[student._id] = '';
      });
      setGrades(initialGrades);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load students for this subject');
      setStudents([]);
    } finally {
      setFetching(false);
    }
  };

  const handleExamTypeChange = (type) => {
    setExamType(type);
    setExamName(DEFAULT_EXAM_NAMES[type] || '');
  };

  const updateGrade = (studentId, marks) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: marks
    }));
  };

  const submitGrades = async () => {
    setError('');
    setSuccess('');
    if (!examName.trim()) {
      setError('Exam name is required');
      return;
    }
    const max = parseFloat(maxMarks);
    if (!max || max <= 0) {
      setError('Max marks must be a positive number');
      return;
    }
    const gradeEntries = [];
    for (const [studentId, marks] of Object.entries(grades)) {
      if (marks === '') continue;
      const value = parseFloat(marks);
      if (Number.isNaN(value) || value < 0 || value > max) {
        setError(`Invalid marks for one student: must be between 0 and ${max}`);
        return;
      }
      const pct = (value / max) * 100;
      gradeEntries.push({
        studentId,
        subjectId,
        examType,
        examName: examName.trim(),
        marks: value,
        maxMarks: max,
        grade: gradeForPercentage(pct)
      });
    }
    if (gradeEntries.length === 0) {
      setError('Enter marks for at least one student');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/marks/entry', { marks: gradeEntries });
      setSuccess(`Grades saved successfully for ${response.data?.count ?? gradeEntries.length} student(s)`);
      fetchStudents();
    } catch (error) {
      setError(error.response?.data?.error || 'Error submitting grades');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Grade Entry</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Exam Type</label>
          <select 
            value={examType} 
            onChange={(e) => handleExamTypeChange(e.target.value)}
            className="input"
          >
            <option value="INTERNAL">Internal</option>
            <option value="EXTERNAL">External</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="QUIZ">Quiz</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Exam Name</label>
          <input
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder="e.g. Internal 1"
            className="input"
          />
        </div>
        <Input
          label="Max Marks"
          type="number"
          value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)}
        />
      </div>

      {students.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">No students enrolled in this subject.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {students.map(student => (
            <div key={student._id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <span className="font-medium">{student.userId?.name || 'Unknown'}</span>
                <span className="text-sm text-gray-600 ml-2">({student.usn || 'N/A'})</span>
              </div>
              <Input
                type="number"
                placeholder="Marks"
                value={grades[student._id] || ''}
                onChange={(e) => updateGrade(student._id, e.target.value)}
                className="w-24"
                min="0"
                max={maxMarks}
              />
            </div>
          ))}
        </div>
      )}

      <Button 
        onClick={submitGrades} 
        loading={saving}
        disabled={students.length === 0}
        className="w-full mt-4"
      >
        Submit Grades
      </Button>
    </Card>
  );
}
