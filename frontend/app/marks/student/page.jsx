'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { PageLoader } from '../../../components/ui/Loading';
import api from '../../../lib/axios';
import { 
  AcademicCapIcon, 
  TrophyIcon,
  ChartBarIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function StudentMarksPage() {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMarks();
    }
  }, [user]);

  const fetchMarks = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'PARENT') {
        // For parents, fetch child's marks
        const marksRes = await api.get('/parent/child/marks');
        setMarks(marksRes.data?.data || []);
        
        // Get student info
        const studentRes = await api.get('/parent/child');
        setStudentData(studentRes.data?.data);
      } else {
        // For students, fetch their own marks using /marks/my endpoint
        const studentRes = await api.get('/students/me');
        setStudentData(studentRes.data?.data);
        
        const marksRes = await api.get('/marks/my');
        setMarks(marksRes.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch marks:', error);
      setMarks([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallAverage = () => {
    if (marks.length === 0) return 0;
    const total = marks.reduce((sum, item) => sum + item.average, 0);
    return (total / marks.length).toFixed(2);
  };

  const getPerformanceStatus = (average) => {
    if (average >= 35) return { label: 'Excellent', color: 'success' };
    if (average >= 30) return { label: 'Good', color: 'info' };
    if (average >= 20) return { label: 'Average', color: 'warning' };
    return { label: 'Needs Improvement', color: 'danger' };
  };

  if (loading) return <PageLoader message="Loading marks data..." />;

  if (!loading && marks.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT', 'PARENT']}>
        <div className="container py-8">
          <div className="flex items-center gap-3 mb-6">
            <AcademicCapIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold">
                {user?.role === 'PARENT' && studentData ? `${studentData.userId?.name}'s Marks` : 'My Marks'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View internal assessment marks and performance
              </p>
            </div>
          </div>
          
          <Card className="p-12 text-center">
            <BookOpenIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Marks Available</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {user?.role === 'PARENT' 
                ? 'Your child\'s marks haven\'t been published yet. Please check back later.'
                : 'Your marks haven\'t been published yet. Please check back later.'}
            </p>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  const overallAvg = calculateOverallAverage();
  const overallStatus = getPerformanceStatus(parseFloat(overallAvg));
  const atRiskCount = marks.filter(m => m.status === 'AT_RISK').length;

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'PARENT']}>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <AcademicCapIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold">
              {user?.role === 'PARENT' && studentData ? `${studentData.userId?.name}'s Marks` : 'My Marks'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View internal assessment marks and performance
            </p>
          </div>
        </div>

        {/* Overall Performance Card */}
        <Card className={`p-8 mb-8 ${overallStatus.color === 'success' ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' : overallStatus.color === 'danger' ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800' : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-full ${overallStatus.color === 'success' ? 'bg-green-100 dark:bg-green-800' : overallStatus.color === 'danger' ? 'bg-red-100 dark:bg-red-800' : 'bg-blue-100 dark:bg-blue-800'}`}>
                  <TrophyIcon className={`w-8 h-8 ${overallStatus.color === 'success' ? 'text-green-600 dark:text-green-400' : overallStatus.color === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Average</h2>
                  <p className={`text-5xl font-bold ${overallStatus.color === 'success' ? 'text-green-600 dark:text-green-400' : overallStatus.color === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {overallAvg}
                  </p>
                </div>
              </div>
              <Badge variant={overallStatus.color} className="text-sm">{overallStatus.label}</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Subjects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{marks.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Safe Subjects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{marks.filter(m => m.status === 'SAFE').length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">At-Risk Subjects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{atRiskCount}</p>
                </div>
              </div>
              {atRiskCount > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-900 dark:text-red-200">
                    ⚠️ Focus on improving marks in at-risk subjects
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Subject-wise Marks */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
              Subject-wise Performance
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Subject</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Internal 1</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Internal 2</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Internal 3</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Average</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {marks.map((mark, index) => {
                  const status = getPerformanceStatus(mark.average);
                  return (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{mark.subject?.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{mark.subject?.subjectCode}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-semibold ${mark.internal1 >= 35 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : mark.internal1 >= 20 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {mark.internal1 || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-semibold ${mark.internal2 >= 35 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : mark.internal2 >= 20 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {mark.internal2 || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-semibold ${mark.internal3 >= 35 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : mark.internal3 >= 20 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {mark.internal3 || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {mark.average}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={status.color}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Performance Tips */}
        {atRiskCount > 0 && (
          <Card className="p-6 mt-8 border-l-4 border-orange-500">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
              Improvement Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Focus on subjects with average below 20 marks</li>
              <li>• Attend regular classes and take detailed notes</li>
              <li>• Consult with faculty for additional guidance</li>
              <li>• Form study groups with classmates</li>
              <li>• Practice previous year question papers</li>
            </ul>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
