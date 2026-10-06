'use client';
import { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../lib/axios';
import Button from './ui/Button';
import Card from './ui/Card';

const today = () => new Date().toISOString().split('T')[0];

export default function QuickAttendance({ subjectId }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(today());
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
      // Initialize all as present
      const initialAttendance = {};
      list.forEach(student => {
        initialAttendance[student._id] = 'PRESENT';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load students for this subject');
      setStudents([]);
    } finally {
      setFetching(false);
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    }));
  };

  const submitAttendance = async () => {
    setError('');
    setSuccess('');
    if (!date) {
      setError('Please select a date');
      return;
    }
    if (students.length === 0) {
      setError('No students to mark attendance for');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post('/attendance/mark', {
        attendance: Object.entries(attendance).map(([studentId, status]) => ({
          studentId,
          subjectId,
          date,
          status
        }))
      });
      setSuccess(`Attendance marked successfully for ${response.data?.count ?? students.length} student(s)`);
    } catch (error) {
      setError(error.response?.data?.error || 'Error marking attendance');
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Mark Attendance</h3>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-1.5 border rounded text-sm"
        />
      </div>

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

      {students.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">No students enrolled in this subject.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {students.map(student => (
            <div key={student._id} className="flex items-center justify-between p-3 border rounded">
              <span>{student.userId?.name || 'Unknown'}</span>
              <button
                onClick={() => toggleAttendance(student._id)}
                className={`flex items-center gap-2 px-3 py-1 rounded ${
                  attendance[student._id] === 'PRESENT' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {attendance[student._id] === 'PRESENT' ? (
                  <><CheckIcon className="w-4 h-4" /> Present</>
                ) : (
                  <><XMarkIcon className="w-4 h-4" /> Absent</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
      <Button 
        onClick={submitAttendance} 
        loading={saving}
        disabled={students.length === 0}
        className="w-full mt-4"
      >
        Submit Attendance
      </Button>
    </Card>
  );
}
