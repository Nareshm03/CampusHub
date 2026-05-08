'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  AcademicCapIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../../../lib/axios';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { toast } from 'sonner';

const mockAttendanceData = [
  { date: 'Week 1', attendance: 85 },
  { date: 'Week 2', attendance: 78 },
  { date: 'Week 3', attendance: 92 },
  { date: 'Week 4', attendance: 88 },
  { date: 'Week 5', attendance: 95 },
  { date: 'Week 6', attendance: 82 }
];

const mockPerformanceData = [
  { exam: 'Internal 1', average: 72 },
  { exam: 'Internal 2', average: 75 },
  { exam: 'Internal 3', average: 80 },
  { exam: 'Assignment', average: 85 }
];

function ReportsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [reportType, setReportType] = useState(searchParams.get('type') || 'attendance');

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) fetchReportData();
  }, [selectedSubject, reportType]);

  async function fetchSubjects() {
    try {
      setLoading(true);
      const res = await api.get('/subjects/faculty');
      const data = res.data.data || [];
      setSubjects(data);
      if (data.length > 0) setSelectedSubject(data[0]._id);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }

  const fetchReportData = async () => {
    try {
      await api.get(`/reports/${reportType}`, { params: { subjectId: selectedSubject } });
    } catch {
      // report endpoint may not exist yet — non-critical
    }
  };

  const exportReport = async () => {
    try {
      const res = await api.get(`/reports/${reportType}/export`, {
        params: { subjectId: selectedSubject },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch {
      toast.error('Failed to export report');
    }
  };

  const selectedSubjectData = subjects.find(s => s._id === selectedSubject);
  const pageTitle = reportType === 'attendance' ? 'Attendance Analytics' : 'Performance Reports';

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <ChartBarIcon className="w-10 h-10 text-blue-600" />
          {pageTitle}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Analyze student performance and attendance trends
        </p>
      </motion.div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Subject</label>
          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.code || s.subjectCode})</option>
            ))}
          </select>
        </Card>

        <Card className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="attendance">Attendance Report</option>
            <option value="performance">Performance Report</option>
            <option value="marks">Marks Analysis</option>
          </select>
        </Card>

        <Card className="p-6 flex items-end">
          <Button onClick={exportReport} variant="primary" className="w-full">
            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
            Export Report
          </Button>
        </Card>
      </div>

      {/* Stats */}
      {selectedSubjectData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Subject</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{selectedSubjectData.code || selectedSubjectData.subjectCode}</p>
              </div>
              <AcademicCapIcon className="w-10 h-10 text-blue-600" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Students</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{selectedSubjectData.studentCount || 0}</p>
              </div>
              <UserGroupIcon className="w-10 h-10 text-green-600" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Avg Attendance</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">87%</p>
              </div>
              <ClockIcon className="w-10 h-10 text-purple-600" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg Marks</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">76%</p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-orange-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportType === 'attendance' && (
          <Card className="p-6 border-l-4 border-l-blue-600">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={3} name="Attendance %" dot={{ fill: '#3b82f6', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {reportType === 'performance' && (
          <Card className="p-6 border-l-4 border-l-green-600">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Performance Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="exam" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#10b981" name="Average Marks" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card className="p-6 border-l-4 border-l-purple-600">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Report Summary</h3>
          <div className="space-y-4">
            {[
              { label: 'Total Classes Conducted', value: '24', color: 'text-gray-900 dark:text-white' },
              { label: 'Average Attendance', value: '87%', color: 'text-green-600' },
              { label: 'Students Below 75%', value: '3', color: 'text-red-600' },
              { label: 'Top Performer', value: '95%', color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
                <span className={`font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function FacultyReports() {
  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }>
        <ReportsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
