'use client';
import { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../lib/axios';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function QuickAttendance({ subjectId }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [subjectId]);

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/faculty/students/${subjectId}`);
      setStudents(response.data.data);
      // Initialize all as present
      const initialAttendance = {};
      response.data.data.forEach(student => {
        initialAttendance[student._id] = 'PRESENT';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    }));
  };

  const submitAttendance = async () => {
    setLoading(true);
    try {
      await api.post('/faculty/attendance', {
        subjectId,
        date: new Date().toISOString().split('T')[0],
        attendance: Object.entries(attendance).map(([studentId, status]) => ({
          studentId,
          status
        }))
      });
      alert('Attendance marked successfully!');
    } catch (error) {
      alert('Error marking attendance');
    }
    setLoading(false);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Mark Attendance</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {students.map(student => (
          <div key={student._id} className="flex items-center justify-between p-3 border rounded">
            <span>{student.userId.name}</span>
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
      <Button 
        onClick={submitAttendance} 
        loading={loading}
        className="w-full mt-4"
      >
        Submit Attendance
      </Button>
    </Card>
  );
}