'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import AnimatedPage from '../../components/AnimatedPage';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { motion } from 'framer-motion';
import api from '../../lib/axios';

export default function Notices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotices();
  }, [user]);

  const fetchNotices = async () => {
    try {
      let endpoint = '/notices';
      if (user?.role === 'STUDENT') {
        endpoint = '/notices/my';
      } else if (user?.role === 'FACULTY') {
        endpoint = '/notices/faculty';
      } else if (user?.role === 'PARENT') {
        endpoint = '/parent/notices';
      }
      const response = await api.get(endpoint);
      setNotices(response.data.data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
      setError('Unable to load notices at the moment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <AnimatedPage>
      <div className="container mx-auto px-4 py-8">
        <LoadingSkeleton count={4} />
      </div>
    </AnimatedPage>
  );
  
  if (error) return (
    <AnimatedPage>
      <div className="container mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {error}
          </h3>
          <p className="text-gray-500 mb-4">Please try again later or contact support if the issue persists</p>
          <button 
            onClick={() => { setError(''); setLoading(true); fetchNotices(); }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    </AnimatedPage>
  );

  return (
    <ProtectedRoute>
      <AnimatedPage>
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gradient mb-2">Notices</h1>
            <p className="text-gray-600 dark:text-gray-400">Stay updated with latest announcements</p>
          </motion.div>
          
          <div className="space-y-6">
            {(notices || []).map((notice, index) => (
              <motion.div
                key={notice._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card card-hover p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {notice.title}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="badge badge-info">{notice.targetType}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {notice.message}
                </p>
                
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>By: {notice.createdBy.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
          
          {notices.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-12 text-center"
            >
              <div className="text-gray-400 text-6xl mb-4">📢</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No notices available
              </h3>
              <p className="text-gray-500">Check back later for new announcements</p>
            </motion.div>
          )}
        </div>
      </AnimatedPage>
    </ProtectedRoute>
  );
}