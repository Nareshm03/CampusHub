'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/ui/Card';
import { AcademicCapIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import api from '@/lib/axios';

export default function InternalMarksPage() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ internal1Avg: 0, internal2Avg: 0, internal3Avg: 0 });

  useEffect(() => {
    fetchInternalMarks();
  }, []);

  const fetchInternalMarks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/marks/my');
      const marksData = response.data.data || [];
      
      // Group marks by subject and merge internal1, 2, 3
      const subjectMarks = {};
      marksData.forEach(mark => {
        const subjectId = mark.subject?._id;
        if (subjectId) {
          if (!subjectMarks[subjectId]) {
            subjectMarks[subjectId] = {
              _id: mark._id,
              subject: mark.subject,
              internal1: 0,
              internal2: 0,
              internal3: 0
            };
          }
          // Merge marks from different entries
          if (mark.internal1 > 0) subjectMarks[subjectId].internal1 = mark.internal1;
          if (mark.internal2 > 0) subjectMarks[subjectId].internal2 = mark.internal2;
          if (mark.internal3 > 0) subjectMarks[subjectId].internal3 = mark.internal3;
        }
      });
      
      const mergedMarks = Object.values(subjectMarks);
      setMarks(mergedMarks);
      
      // Calculate averages
      if (mergedMarks.length > 0) {
        const int1Total = mergedMarks.reduce((sum, m) => sum + (m.internal1 || 0), 0);
        const int2Total = mergedMarks.reduce((sum, m) => sum + (m.internal2 || 0), 0);
        const int3Total = mergedMarks.reduce((sum, m) => sum + (m.internal3 || 0), 0);
        
        setStats({
          internal1Avg: (int1Total / mergedMarks.length).toFixed(2),
          internal2Avg: (int2Total / mergedMarks.length).toFixed(2),
          internal3Avg: (int3Total / mergedMarks.length).toFixed(2)
        });
      }
    } catch (error) {
      console.error('Error fetching marks:', error);
      toast.error('Failed to fetch internal marks');
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (marks, maxMarks = 50) => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const calculateAverage = (int1, int2, int3) => {
    const total = (int1 || 0) + (int2 || 0) + (int3 || 0);
    return (total / 3).toFixed(2);
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <AcademicCapIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold">Internal Assessment Marks</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View your internal examination scores</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Internal 1 Average</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.internal1Avg} / 50
                </p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-blue-600 dark:text-blue-400 opacity-20" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Internal 2 Average</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {stats.internal2Avg} / 50
                </p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-purple-600 dark:text-purple-400 opacity-20" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Internal 3 Average</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.internal3Avg} / 50
                </p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-green-600 dark:text-green-400 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Marks Table */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Subject-wise Internal Marks</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading marks...</p>
            </div>
          ) : marks.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <p>No internal marks available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Internal 1
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Internal 2
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Internal 3
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Average
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total / 150
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {marks.map((mark) => {
                    const total = (mark.internal1 || 0) + (mark.internal2 || 0) + (mark.internal3 || 0);
                    const average = calculateAverage(mark.internal1, mark.internal2, mark.internal3);
                    
                    return (
                      <tr key={mark._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {mark.subject?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {mark.subject?.subjectCode || ''}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-center font-semibold ${getPercentageColor(mark.internal1 || 0)}`}>
                          {mark.internal1 || 0} / 50
                        </td>
                        <td className={`px-6 py-4 text-center font-semibold ${getPercentageColor(mark.internal2 || 0)}`}>
                          {mark.internal2 || 0} / 50
                        </td>
                        <td className={`px-6 py-4 text-center font-semibold ${getPercentageColor(mark.internal3 || 0)}`}>
                          {mark.internal3 || 0} / 50
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {average} / 50
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-center font-bold text-lg ${getPercentageColor(total, 150)}`}>
                          {total} / 150
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
