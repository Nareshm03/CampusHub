'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LoadingButton, PageLoader } from '@/components/ui/Loading';
import { CalendarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

export default function AttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Redirect students to their attendance page
      if (user.role === 'STUDENT') {
        router.push('/attendance/student');
        return;
      }
      fetchSubjects();
    }
  }, [user, router]);

  useEffect(() => {
    if (selectedSubject) {
      fetchStudents();
      fetchExistingAttendance();
    }
  }, [selectedSubject, selectedDate]);

  async function fetchSubjects() {
    try {
      // Only FACULTY and ADMIN can access this page and endpoint
      if (!user || !['FACULTY', 'ADMIN'].includes(user.role)) {
        toast.error('Access denied. Faculty or Admin role required.');
        return;
      }
      
      const response = await api.get('/subjects/faculty');
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. You need faculty or admin privileges to mark attendance.');
      } else {
        toast.error(error.response?.data?.error || error.message || 'Failed to fetch subjects');
      }
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
      
      // Initialize attendance state
      const initialAttendance = {};
      response.data.data?.forEach(student => {
        initialAttendance[student._id] = 'PRESENT';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }

  const fetchExistingAttendance = async () => {
    if (!selectedSubject || !selectedDate) return;

    try {
      const response = await api.get(`/attendance?subjectId=${selectedSubject}&date=${selectedDate}`);
      const existingAttendance = {};
      response.data.data?.forEach(record => {
        existingAttendance[record.studentId._id] = record.status;
      });
      setAttendance(prev => ({ ...prev, ...existingAttendance }));
    } catch (error) {
      // No existing attendance is fine
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAllPresent = () => {
    const allPresent = {};
    students.forEach(student => {
      allPresent[student._id] = 'PRESENT';
    });
    setAttendance(allPresent);
  };

  const markAllAbsent = () => {
    const allAbsent = {};
    students.forEach(student => {
      allAbsent[student._id] = 'ABSENT';
    });
    setAttendance(allAbsent);
  };

  const submitAttendance = async () => {
    if (!selectedSubject || !selectedDate) {
      toast.error('Please select subject and date');
      return;
    }

    setSubmitting(true);
    try {
      const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        subjectId: selectedSubject,
        date: selectedDate,
        status
      }));

      await api.post('/attendance/mark', { attendance: attendanceData });
      toast.success('Attendance marked successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
        <div className="container py-8">
          <PageLoader message="Loading attendance system..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <UserGroupIcon className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold">Mark Attendance</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <label className="block text-sm font-medium mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </Card>

          <Card className="p-6">
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject._id}>
                  {subject.name} ({subject.code || subject.subjectCode})
                </option>
              ))}
            </select>
          </Card>

          <Card className="p-6">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={markAllPresent}>
                All Present
              </Button>
              <Button size="sm" variant="outline" onClick={markAllAbsent}>
                All Absent
              </Button>
            </div>
          </Card>
        </div>

        {selectedSubject && (
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">
                Students ({students.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-8">
                <PageLoader message="Loading students..." />
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map((student, index) => (
                  <div key={student._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 w-8">{index + 1}</span>
                      <div>
                        <p className="font-medium">{student.userId?.name}</p>
                        <p className="text-sm text-gray-500">{student.usn}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {['PRESENT', 'ABSENT', 'LATE'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleAttendanceChange(student._id, status)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            attendance[student._id] === status
                              ? status === 'PRESENT' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : status === 'ABSENT'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {students.length > 0 && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Present: {Object.values(attendance).filter(s => s === 'PRESENT').length} | 
                    Absent: {Object.values(attendance).filter(s => s === 'ABSENT').length} | 
                    Late: {Object.values(attendance).filter(s => s === 'LATE').length}
                  </div>
                  <LoadingButton
                    loading={submitting}
                    onClick={submitAttendance}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    Submit Attendance
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