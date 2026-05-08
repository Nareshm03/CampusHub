'use client';
import { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import { CheckCircleIcon, XCircleIcon, CalendarIcon, BookOpenIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export default function FacultyAttendancePage() {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        setLoading(true);
        const response = await api.get('/subjects/faculty');
        setSubjects(response.data.data || []);
      } catch (error) {
        toast.error('Failed to fetch subjects');
        console.error('Failed to fetch subjects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedSubject) return;
      try {
        setLoading(true);
        const response = await api.get(`/subjects/${selectedSubject}/students`);
        setStudents(response.data.data || []);
        const initialAttendance = {};
        (response.data.data || []).forEach(student => {
          initialAttendance[student._id] = 'PRESENT';
        });
        setAttendance(initialAttendance);
      } catch (error) {
        toast.error('Failed to fetch students');
        console.error('Failed to fetch students:', error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedSubject]);

  const stats = useMemo(() => {
    const total = students.length;
    const present = Object.values(attendance).filter(s => s === 'PRESENT').length;
    const absent = Object.values(attendance).filter(s => s === 'ABSENT').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    return { total, present, absent, percentage };
  }, [students, attendance]);

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!selectedSubject || !selectedDate || students.length === 0) {
      toast.error('Please select subject, date and ensure students are loaded');
      return;
    }
    try {
      setSubmitting(true);
      const attendanceData = students.map(student => ({
        studentId: student._id,
        subjectId: selectedSubject,
        date: selectedDate,
        status: attendance[student._id] || 'PRESENT'
      }));
      await api.post('/attendance/mark', { attendance: attendanceData });
      toast.success(`Attendance marked successfully! ${stats.present} present, ${stats.absent} absent`);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('duplicate')) {
        toast.error('Attendance already marked for this date');
      } else {
        toast.error(error.response?.data?.error || 'Failed to mark attendance');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAll = (status) => {
    const newAttendance = {};
    students.forEach(student => { newAttendance[student._id] = status; });
    setAttendance(newAttendance);
    toast.success(`Marked all students as ${status.toLowerCase()}`);
  };

  if (loading && subjects.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['FACULTY']}>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Mark Attendance</h1>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const selectedSubjectData = subjects.find(s => s._id === selectedSubject);

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Mark Attendance</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Record student attendance for your classes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpenIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Select Subject</h3>
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{subjects.length === 0 ? 'No subjects assigned' : 'Choose a subject'}</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject._id}>
                  {subject.name} ({subject.code || subject.subjectCode})
                </option>
              ))}
            </select>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Select Date</h3>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserGroupIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Enrolled</h3>
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{students.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {students.length === 1 ? 'student' : 'students'}
            </div>
          </Card>
        </div>

        {selectedSubject && students.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Students</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Present</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.present}</div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-800">
                <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Absent</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.absent}</div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200 dark:border-purple-800">
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Attendance %</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.percentage}%</div>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedSubjectData?.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedSubjectData?.code || selectedSubjectData?.subjectCode} • {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => handleMarkAll('PRESENT')} variant="outline" size="sm">
                    Mark All Present
                  </Button>
                  <Button onClick={() => handleMarkAll('ABSENT')} variant="outline" size="sm">
                    Mark All Absent
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Attendance'}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">USN</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900">
                    {students.map((student, index) => (
                      <tr key={student._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150">
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{student.userId?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">{student.usn}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleAttendanceChange(student._id, 'PRESENT')}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                                attendance[student._id] === 'PRESENT'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-2 ring-green-500 dark:ring-green-600'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                              }`}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Present
                            </button>
                            <button
                              onClick={() => handleAttendanceChange(student._id, 'ABSENT')}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                                attendance[student._id] === 'ABSENT'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-2 ring-red-500 dark:ring-red-600'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                              }`}
                            >
                              <XCircleIcon className="w-4 h-4" />
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {selectedSubject && students.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Students Enrolled</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              There are no students enrolled in this subject.
            </p>
          </Card>
        )}

        {loading && selectedSubject && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
