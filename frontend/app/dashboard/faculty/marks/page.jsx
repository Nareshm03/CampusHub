'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import { 
  ClipboardDocumentCheckIcon, 
  BookOpenIcon,
  AcademicCapIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

export default function FacultyMarksManagement() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [examType, setExamType] = useState('INTERNAL');
  const [examName, setExamName] = useState('Internal 1');
  const [maxMarks, setMaxMarks] = useState(20);
  
  const [students, setStudents] = useState([]);
  const [existingMarks, setExistingMarks] = useState([]);
  const [marksData, setMarksData] = useState({}); // { studentId: mark }
  
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const examOptions = {
    INTERNAL: ['Internal 1', 'Internal 2', 'Internal 3'],
    ASSIGNMENT: ['Assignment 1', 'Assignment 2', 'Alternative Assignment 1', 'Alternative Assignment 2'],
    EXTERNAL: ['Theory', 'Practical']
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      const newExamName = examOptions[examType][0];
      setExamName(newExamName);
      fetchStudentsAndMarks(examType, newExamName);
    } else {
      setStudents([]);
      setExistingMarks([]);
      setMarksData({});
    }
  }, [selectedSubject, examType]);

  useEffect(() => {
    if (selectedSubject) {
      fetchStudentsAndMarks(examType, examName);
    }
  }, [examName]);

  async function fetchSubjects() {
    try {
      setLoading(true);
      const res = await api.get('/subjects/faculty');
      setSubjects(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast.error('Failed to load your subjects');
    } finally {
      setLoading(false);
    }
  }

  const fetchStudentsAndMarks = async (currentExamType = examType, currentExamName = examName) => {
    try {
      setFetchingStudents(true);

      const studentsRes = await api.get(`/subjects/${selectedSubject}/students`);
      const studentsList = studentsRes.data.data || [];
      setStudents(studentsList);

      let marksList = [];
      try {
        const marksRes = await api.get(`/marks/subject/${selectedSubject}`);
        marksList = marksRes.data.data || [];
      } catch {
        // no marks yet for this subject — that's fine
      }
      setExistingMarks(marksList);
      
      // Initialize marksData with existing marks for this specific exam
      const newMarksData = {};
      
      studentsList.forEach(student => {
        // Find existing mark for this student, subject, examType, and examName
        const existingMark = marksList.find(m => 
          m.student?._id === student._id && 
          m.examType === currentExamType && 
          m.examName === currentExamName
        );
        
        if (existingMark) {
          newMarksData[student._id] = existingMark.marks;
        } else {
          const legacyMark = marksList.find(m => m.student?._id === student._id);
          if (legacyMark && currentExamType === 'INTERNAL' && currentExamName === 'Internal 1' && legacyMark.internal1) {
            newMarksData[student._id] = legacyMark.internal1;
          } else if (legacyMark && currentExamType === 'INTERNAL' && currentExamName === 'Internal 2' && legacyMark.internal2) {
            newMarksData[student._id] = legacyMark.internal2;
          } else if (legacyMark && currentExamType === 'INTERNAL' && currentExamName === 'Internal 3' && legacyMark.internal3) {
            newMarksData[student._id] = legacyMark.internal3;
          } else {
            newMarksData[student._id] = '';
          }
        }
      });
      
      setMarksData(newMarksData);
      
    } catch (error) {
      console.error('Failed to fetch students/marks:', error);
      toast.error('Failed to load students for selected subject');
    } finally {
      setFetchingStudents(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    // Only allow numbers
    if (value !== '' && isNaN(Number(value))) return;
    
    // Check max marks
    const numValue = Number(value);
    if (numValue > maxMarks) {
      toast.error(`Maximum marks cannot exceed ${maxMarks}`);
      return;
    }
    
    setMarksData(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const calculateGrade = (marks, maxMarks) => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'O';
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B+';
    if (percentage >= 50) return 'B';
    if (percentage >= 40) return 'C';
    return 'F';
  };

  const handleSaveMarks = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject first');
      return;
    }
    
    try {
      setSaving(true);
      
      const parsedMaxMarks = Math.max(1, Number(maxMarks) || 1);

      const marksPayload = students
        .filter(student => marksData[student._id] !== '' && marksData[student._id] !== undefined)
        .map(student => {
          const score = Number(marksData[student._id]);
          return {
            studentId: student._id,
            subjectId: selectedSubject,
            examType,
            examName,
            marks: score,
            maxMarks: parsedMaxMarks,
            grade: calculateGrade(score, parsedMaxMarks)
          };
        });
        
      if (marksPayload.length === 0) {
        toast.error('No marks to save');
        setSaving(false);
        return;
      }
      
      await api.post('/marks/entry', { marks: marksPayload });
      toast.success('Marks saved successfully');
      
      // Refresh marks list
      fetchStudentsAndMarks();
    } catch (error) {
      console.error('Failed to save marks:', error);
      toast.error(error.response?.data?.error || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['FACULTY']}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
            <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Marks Entry
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Enter and manage student grades for your subjects
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Controls Settings Pane */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <BookOpenIcon className="w-5 h-5 mr-2 text-blue-500" />
                  Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subject
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                      >
                        <option value="">-- Select Subject --</option>
                        {subjects.map(subject => (
                          <option key={subject._id} value={subject._id}>
                            {subject.name} ({subject.subjectCode})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <ChevronDownIcon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Exam Type
                    </label>
                    <div className="relative">
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                      >
                        <option value="INTERNAL">Internal Assessment</option>
                        <option value="ASSIGNMENT">Assignment</option>
                        <option value="EXTERNAL">Semester End Exam</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <ChevronDownIcon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Exam Name
                    </label>
                    <div className="relative">
                      <select
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                      >
                        {examOptions[examType]?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <ChevronDownIcon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Marks
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(Number(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Students List Pane */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <AcademicCapIcon className="w-5 h-5 mr-2 text-indigo-500" />
                    Students List
                  </h3>
                  {selectedSubject && students.length > 0 && (
                    <Button 
                      variant="primary" 
                      onClick={handleSaveMarks}
                      isLoading={saving}
                    >
                      <ClipboardDocumentCheckIcon className="w-5 h-5 mr-2" />
                      Save Marks
                    </Button>
                  )}
                </div>
                
                <div className="p-0">
                  {!selectedSubject ? (
                    <div className="p-12 text-center">
                      <BookOpenIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">Select a subject to view and grade students</p>
                    </div>
                  ) : fetchingStudents ? (
                    <div className="p-12 text-center animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 w-1/4 mx-auto mb-4 rounded"></div>
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 w-full rounded"></div>
                        ))}
                      </div>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="p-12 text-center">
                      <AcademicCapIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No students enrolled in this subject</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              USN
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Student Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Marks ({maxMarks})
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Grade
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {students.map((student) => (
                            <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {student.usn}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {student.userId?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="inline-block w-24">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={maxMarks}
                                    value={marksData[student._id] !== undefined ? marksData[student._id] : ''}
                                    onChange={(e) => handleMarkChange(student._id, e.target.value)}
                                    placeholder="-"
                                    className="text-center"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">
                                {marksData[student._id] !== '' && marksData[student._id] !== undefined ? (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                    {calculateGrade(Number(marksData[student._id]), Number(maxMarks))}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
