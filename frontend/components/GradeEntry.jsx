'use client';
import { useState, useEffect } from 'react';
import api from '../../lib/axios';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

export default function GradeEntry({ subjectId }) {
  const [students, setStudents] = useState([]);
  const [examType, setExamType] = useState('INTERNAL');
  const [maxMarks, setMaxMarks] = useState(100);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [subjectId]);

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/faculty/grades/${subjectId}`);
      setStudents(response.data.data);
      const initialGrades = {};
      response.data.data.forEach(student => {
        initialGrades[student._id] = '';
      });
      setGrades(initialGrades);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const updateGrade = (studentId, marks) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: marks
    }));
  };

  const submitGrades = async () => {
    setLoading(true);
    try {
      const gradeEntries = Object.entries(grades)
        .filter(([_, marks]) => marks !== '')
        .map(([studentId, marks]) => ({
          studentId,
          subjectId,
          examType,
          marks: parseFloat(marks),
          maxMarks: parseFloat(maxMarks)
        }));

      await api.post('/faculty/grades', { grades: gradeEntries });
      alert('Grades submitted successfully!');
    } catch (error) {
      alert('Error submitting grades');
    }
    setLoading(false);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Grade Entry</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Exam Type</label>
          <select 
            value={examType} 
            onChange={(e) => setExamType(e.target.value)}
            className="input"
          >
            <option value="INTERNAL">Internal</option>
            <option value="EXTERNAL">External</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="QUIZ">Quiz</option>
          </select>
        </div>
        <Input
          label="Max Marks"
          type="number"
          value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)}
        />
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {students.map(student => (
          <div key={student._id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <span className="font-medium">{student.userId.name}</span>
              <span className="text-sm text-gray-600 ml-2">({student.usn})</span>
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

      <Button 
        onClick={submitGrades} 
        loading={loading}
        className="w-full mt-4"
      >
        Submit Grades
      </Button>
    </Card>
  );
}