'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LoadingButton, PageLoader, TableSkeleton } from '@/components/ui/Loading';
import { AcademicCapIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import api from '@/lib/axios';

export default function MarksPage() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [examType, setExamType] = useState('INTERNAL');
  const [examName, setExamName] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    setExamName('');
  }, [examType]);

  useEffect(() => {
    if (selectedSubject) {
      fetchStudents();
    }
  }, [selectedSubject]);

  async function fetchSubjects() {
    try {
      const response = await api.get('/subjects/faculty');
      setSubjects(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch subjects');
    } finally {
      setInitialLoading(false);
    }
  }

  async function fetchStudents() {
    if (!selectedSubject) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/subjects/${selectedSubject}/students`);
      setStudents(response.data.data || []);
      
      // Initialize marks state
      const initialMarks = {};
      response.data.data?.forEach(student => {
        initialMarks[student._id] = '';
      });
      setMarks(initialMarks);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents([]);
      setMarks({});
    } finally {
      setLoading(false);
    }
  }

  const handleMarksChange = (studentId, value) => {
    // Validate marks input
    const numValue = parseFloat(value);
    if (value === '' || (numValue >= 0 && numValue <= maxMarks)) {
      setMarks(prev => ({
        ...prev,
        [studentId]: value
      }));
    }
  };

  const calculateGrade = (marks, maxMarks) => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
  };

  const submitMarks = async () => {
    if (!selectedSubject || !examName.trim()) {
      toast.error('Please select subject and enter exam name');
      return;
    }

    // Validate that all marks are entered
    const emptyMarks = Object.entries(marks).filter(([_, mark]) => mark === '');
    if (emptyMarks.length > 0) {
      toast.error('Please enter marks for all students');
      return;
    }

    setSubmitting(true);
    try {
      const marksData = Object.entries(marks).map(([studentId, mark]) => ({
        studentId,
        subjectId: selectedSubject,
        examType,
        examName: examName.trim(),
        marks: parseFloat(mark),
        maxMarks: parseFloat(maxMarks),
        grade: calculateGrade(parseFloat(mark), parseFloat(maxMarks))
      }));

      console.log('Submitting marks data:', marksData);
      
      const response = await api.post('/marks/entry', { marks: marksData });
      
      console.log('Marks submission response:', response.data);
      toast.success(`Marks submitted successfully! ${response.data.count} records saved.`);
      
      // Reset form
      setExamName('');
      setMarks(prev => {
        const resetMarks = {};
        Object.keys(prev).forEach(key => {
          resetMarks[key] = '';
        });
        return resetMarks;
      });
    } catch (error) {
      console.error('Marks submission error:', error);
      console.error('Error response:', error.response?.data);
      
      // Check if it's a network error
      if (!error.response) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
        console.error('Network error: Backend server may not be running on port 5000');
        return;
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit marks';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const fillSampleMarks = () => {
    const sampleMarks = {};
    students.forEach(student => {
      // Generate random marks between 60-95
      sampleMarks[student._id] = (Math.floor(Math.random() * 36) + 60).toString();
    });
    setMarks(sampleMarks);
  };

  if (initialLoading) {
    return (
      <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
        <div className="container py-8">
          <PageLoader message="Loading grade entry system..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <AcademicCapIcon className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold">Grade Entry</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">{subjects.length === 0 ? 'No subjects assigned' : 'Select Subject'}</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject._id}>
                  {subject.name} ({subject.code || subject.subjectCode})
                </option>
              ))}
            </select>
          </Card>

          <Card className="p-6">
            <label className="block text-sm font-medium mb-2">Exam Type</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="INTERNAL">Internal Exam</option>
              <option value="EXTERNAL">External Exam</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="QUIZ">Quiz</option>
            </select>
          </Card>

          <Card className="p-6">
            <label className="block text-sm font-medium mb-2">Exam Name</label>
            {examType === 'INTERNAL' ? (
              <select
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Select Internal Exam</option>
                <option value="Internal 1">Internal 1</option>
                <option value="Internal 2">Internal 2</option>
                <option value="Internal 3">Internal 3</option>
              </select>
            ) : examType === 'ASSIGNMENT' ? (
              <select
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Select Assignment</option>
                <option value="Assignment 1">Assignment 1</option>
                <option value="Assignment 2">Assignment 2</option>
                <option value="Alternative Assignment 1">Alternative Assignment 1</option>
                <option value="Alternative Assignment 2">Alternative Assignment 2</option>
              </select>
            ) : (
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g., Mid Term 1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            )}
          </Card>

          <Card className="p-6">
            <label className="block text-sm font-medium mb-2">Max Marks</label>
            <input
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
            {examType === 'ASSIGNMENT' && (
              <p className="text-xs text-gray-500 mt-1">Assignments: 10 marks each</p>
            )}
          </Card>
        </div>

        {selectedSubject && (
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                Students ({students.length})
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={fillSampleMarks}>
                  Fill Sample
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMarks({})}>
                  Clear All
                </Button>
              </div>
            </div>

            {loading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        USN
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Marks (/{maxMarks})
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900">
                    {students.map((student, index) => (
                      <tr key={student._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150">
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.userId?.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                          {student.usn}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={marks[student._id] || ''}
                            onChange={(e) => handleMarksChange(student._id, e.target.value)}
                            min="0"
                            max={maxMarks}
                            step="0.5"
                            className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4">
                          {marks[student._id] ? (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)).startsWith('A') || calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)) === 'O'
                                ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 dark:from-green-900/40 dark:to-green-800/20 dark:text-green-400' :
                              calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)).startsWith('B')
                                ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 dark:from-blue-900/40 dark:to-blue-800/20 dark:text-blue-400' :
                              calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)).startsWith('C') || calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)) === 'D'
                                ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 dark:from-yellow-900/40 dark:to-yellow-800/20 dark:text-yellow-400' :
                              'bg-gradient-to-r from-red-100 to-red-50 text-red-700 dark:from-red-900/40 dark:to-red-800/20 dark:text-red-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)).startsWith('A') || calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)) === 'O'
                                  ? 'bg-green-600 dark:bg-green-400' :
                                calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)).startsWith('B')
                                  ? 'bg-blue-600 dark:bg-blue-400' :
                                calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)).startsWith('C') || calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks)) === 'D'
                                  ? 'bg-yellow-600 dark:bg-yellow-400' :
                                'bg-red-600 dark:bg-red-400'
                              }`} />
                              {calculateGrade(parseFloat(marks[student._id]), parseFloat(maxMarks))}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {students.length > 0 && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Entered: {Object.values(marks).filter(m => m !== '').length} / {students.length}
                  </div>
                  <LoadingButton
                    loading={submitting}
                    onClick={submitMarks}
                    disabled={!selectedSubject || !examName.trim()}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Marks
                  </LoadingButton>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}