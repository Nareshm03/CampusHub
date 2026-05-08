'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Card from './ui/Card';
import Button from './ui/Button';
import { LoadingButton, PageLoader } from './ui/Loading';
import { AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import api from '../lib/axios';

export default function AlumniManagement() {
  const [students, setStudents] = useState([]);
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const [graduatingStudent, setGraduatingStudent] = useState(null);
  const [graduationData, setGraduationData] = useState({
    graduationYear: new Date().getFullYear(),
    currentCompany: '',
    currentPosition: '',
    contactEmail: '',
    contactPhone: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, alumniRes] = await Promise.all([
        api.get('/students'),
        api.get('/students/alumni')
      ]);
      setStudents(studentsRes.data.data || []);
      setAlumni(alumniRes.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleGraduate = async () => {
    if (!graduatingStudent) return;

    try {
      await api.post(`/students/${graduatingStudent._id}/graduate`, graduationData);
      toast.success('Student marked as alumni successfully');
      setGraduatingStudent(null);
      setGraduationData({
        graduationYear: new Date().getFullYear(),
        currentCompany: '',
        currentPosition: '',
        contactEmail: '',
        contactPhone: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to mark as alumni');
    }
  };

  if (loading) return <PageLoader message="Loading alumni data..." />;

  return (
    <div className="space-y-6">
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'students'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <UserGroupIcon className="w-4 h-4 inline mr-2" />
          Current Students
        </button>
        <button
          onClick={() => setActiveTab('alumni')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'alumni'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <AcademicCapIcon className="w-4 h-4 inline mr-2" />
          Alumni
        </button>
      </div>

      {activeTab === 'students' && (
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Current Students</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mark students as graduated to move them to alumni
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {students.filter(s => !s.isAlumni).map((student) => (
              <div key={student._id} className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{student.userId?.name}</h3>
                  <p className="text-sm text-gray-500">
                    {student.usn} • {student.department?.name} • Semester {student.semester}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setGraduatingStudent(student)}
                >
                  Mark as Graduate
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'alumni' && (
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Alumni ({alumni.length})</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {alumni.map((alumnus) => (
              <div key={alumnus._id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{alumnus.studentId?.userId?.name}</h3>
                    <p className="text-sm text-gray-500">
                      {alumnus.studentId?.usn} • {alumnus.studentId?.department?.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Graduated: {alumnus.graduationYear}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {alumnus.currentCompany && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {alumnus.currentPosition} at {alumnus.currentCompany}
                      </p>
                    )}
                    {alumnus.contactEmail && (
                      <p className="text-gray-500">{alumnus.contactEmail}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {graduatingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Mark {graduatingStudent.userId?.name} as Graduate
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={graduationData.graduationYear}
                    onChange={(e) => setGraduationData(prev => ({
                      ...prev,
                      graduationYear: parseInt(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Current Company (Optional)</label>
                  <input
                    type="text"
                    value={graduationData.currentCompany}
                    onChange={(e) => setGraduationData(prev => ({
                      ...prev,
                      currentCompany: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Current Position (Optional)</label>
                  <input
                    type="text"
                    value={graduationData.currentPosition}
                    onChange={(e) => setGraduationData(prev => ({
                      ...prev,
                      currentPosition: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Email (Optional)</label>
                  <input
                    type="email"
                    value={graduationData.contactEmail}
                    onChange={(e) => setGraduationData(prev => ({
                      ...prev,
                      contactEmail: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setGraduatingStudent(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <LoadingButton
                  onClick={handleGraduate}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Mark as Graduate
                </LoadingButton>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}