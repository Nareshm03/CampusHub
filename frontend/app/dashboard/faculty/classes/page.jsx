'use client';
import { useState, useEffect } from 'react';
import { AcademicCapIcon, UserGroupIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import api from '../../../../lib/axios';
import Card from '../../../../components/ui/Card';
import { toast } from 'sonner';

export default function ClassManagement() {
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
      setLoading(true);
      const response = await api.get('/subjects/faculty');
      const data = response.data?.data || [];
      // Filter for distinct subjects to prevent empty names causing UI issues
      setSubjects(data);
    } catch (error) {
      toast.error('Failed to fetch subjects');
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  }

  const fetchStudents = async (subject) => {
    try {
      setStudentsLoading(true);
      const response = await api.get(`/subjects/${subject._id}/students`);
      setStudents(response.data.data || []);
      setSelectedSubject(subject);
    } catch (error) {
      toast.error('Failed to fetch students');
      console.error('Error fetching students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['FACULTY']}>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">My Classes</h1>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Classes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage your assigned subjects and enrolled students
          </p>
        </div>
        
        {subjects.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600">
                <BookOpenIcon className="w-full h-full" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Subjects Assigned</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                You don't have any subjects assigned yet. Contact the administrator for more information.
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {subjects.map(subject => (
                <Card 
                  key={subject._id} 
                  className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedSubject?._id === subject._id 
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-md' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => fetchStudents(subject)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                      <AcademicCapIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{subject.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{subject.code || subject.subjectCode}</p>
                      {subject.semester && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                          Semester {subject.semester}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {selectedSubject && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedSubject.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {students.length} student{students.length !== 1 ? 's' : ''} enrolled
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                    {selectedSubject.code || selectedSubject.subjectCode}
                  </span>
                </div>
                
                {studentsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No students enrolled in this subject</p>
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
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900">
                        {students.map((student, index) => (
                          <tr key={student._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150">
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{student.userId?.name || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">{student.usn}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.department?.name || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                Sem {student.semester}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.userId?.email || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}