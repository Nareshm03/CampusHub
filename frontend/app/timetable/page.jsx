'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import TimetableTable from '../../components/TimetableTable';
import ManageTimetable from '../../components/ManageTimetable';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import api from '../../lib/axios';

export default function TimetablePage() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('view'); // 'view' or 'manage'
  const [error, setError] = useState('');

  const isFaculty = user?.role === 'FACULTY';
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isFaculty || isAdmin;

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const role = user.role?.toUpperCase();
      const endpoint = role === 'STUDENT' ? '/timetable/student' : '/timetable/faculty';
      
      const requests = [api.get(endpoint)];
      if (role === 'FACULTY') {
        requests.push(api.get('/faculty/me'));
      }
      if (role === 'ADMIN') {
        requests.push(api.get('/departments'));
      }

      const responses = await Promise.all(requests);
      
      setTimetable(responses[0].data?.data ?? responses[0].data ?? []);
      if (responses[1]) {
        if (user.role?.toUpperCase() === 'ADMIN') {
          setFacultyProfile({ departments: responses[1].data?.data || [] });
        } else {
          setFacultyProfile(responses[1].data?.data);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to fetch timetable';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const refreshTimetable = async () => {
    try {
      const endpoint = '/timetable/faculty';
      const response = await api.get(endpoint);
      setTimetable(response.data?.data ?? response.data ?? []);
    } catch (err) {
      console.error('Failed to refresh timetable', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton.Card />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'FACULTY', 'ADMIN']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Timetable
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {view === 'view' ? 'View your class schedule and timings.' : 'Manage department-wide timetables.'}
            </p>
          </div>

          {canManage && (
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setView('view')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  view === 'view'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {isAdmin ? 'Overview' : 'My Schedule'}
              </button>
              <button
                onClick={() => setView('manage')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  view === 'manage'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Manage All
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {view === 'view' ? (
          <Card className="p-6">
            <TimetableTable timetable={timetable} userRole={user?.role} />
          </Card>
        ) : (
          <ManageTimetable 
            facultyProfile={facultyProfile} 
            onSaved={refreshTimetable}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
