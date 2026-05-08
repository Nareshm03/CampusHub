'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import api from '../../lib/axios';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (search.trim()) {
      const filtered = students.filter(student =>
        student.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        student.usn?.toLowerCase().includes(search.toLowerCase()) ||
        student.department?.name?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [search, students]);

  const handleEditStudent = (student) => {
    // Navigate to edit page or open modal
    console.log('Edit student:', student);
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      await api.delete(`/api/admin/users/${studentId}`);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to delete student');
      console.error('Delete error:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/students');
      console.log('Students API response:', response.data);
      const studentsData = response.data.data || response.data || [];
      setStudents(studentsData);
      setFilteredStudents(studentsData);
    } catch (error) {
      toast.error('Failed to fetch students');
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Students</h1>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Students</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Total: {students.length} students
            </p>
          </div>
          <Button onClick={fetchStudents} variant="outline">
            Refresh
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, USN, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </Card>

        {filteredStudents.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center justify-center py-8">
              <UserGroupIcon className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {search ? 'No Students Found' : 'No Students'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                {search ? 'Try adjusting your search criteria' : 'No students are enrolled in the system yet.'}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
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
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  {filteredStudents.map((student, index) => (
                    <tr key={student._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150">
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {student.userId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                        {student.usn}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {student.department?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Sem {student.semester}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {student.userId?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            title="Edit Student"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student._id)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                            title="Delete Student"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}