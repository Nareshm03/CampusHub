'use client';
import { useState, useEffect } from 'react';
import { AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import api from '../../lib/axios';
import Card from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Loading';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function ClassesPage() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    try {
      const response = await api.get('/subjects/faculty');
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  }

  const fetchStudents = async (subjectId) => {
    try {
      setStudentsLoading(true);
      const response = await api.get(`/subjects/${subjectId}/students`);
      setStudents(response.data.data || []);
      setSelectedSubject(subjectId);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading classes..." />;

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <AcademicCapIcon className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold">My Classes</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {subjects.map(subject => (
            <Card 
              key={subject._id} 
              className="p-4 cursor-pointer hover:shadow-md"
              onClick={() => fetchStudents(subject._id)}
            >
              <div className="flex items-center gap-3">
                <AcademicCapIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold">{subject.name}</h3>
                  <p className="text-sm text-gray-600">{subject.code || subject.subjectCode}</p>
                  <p className="text-xs text-gray-500">Semester {subject.semester}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {subjects.length === 0 && (
          <Card className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📚</div>
            <h3 className="text-lg font-medium mb-2">No subjects assigned</h3>
            <p className="text-gray-500">Contact admin to assign subjects to you</p>
          </Card>
        )}

        {selectedSubject && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserGroupIcon className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Enrolled Students</h2>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {students.length} students
              </span>
            </div>
            
            {studentsLoading ? (
              <PageLoader message="Loading students..." />
            ) : (
              students.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No Students Enrolled</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This class has no enrolled students yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">USN</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900">
                      {students.map((student, index) => (
                        <tr key={student._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150">
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">{student.rollNumber}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.department?.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}