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

function ReportsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [reportType, setReportType] = useState(searchParams.get('type') || 'attendance');
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [consistency, setConsistency] = useState(null);
  const [reportError, setReportError] = useState('');

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
      setReportLoading(true);
      setReportError('');
      const [subjectRes, consistencyRes] = await Promise.all([
        api.get(`/faculty-analytics/subject/${selectedSubject}`),
        api.get('/faculty-analytics/attendance-consistency', { params: { subjectId: selectedSubject } })
      ]);
      setSubjectDetails(subjectRes.data?.data || null);
      setConsistency(consistencyRes.data?.data || null);
    } catch (error) {
      console.error('Error fetching report data:', error);
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to load report data';
      setReportError(message);
      toast.error(message);
    } finally {
      setReportLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const lines = ['subject,metric,value'];
      const subj = subjectDetails?.subject;
      if (subj) {
        lines.push(`"${subj.name}",code,"${subj.code || ''}"`);
        lines.push(`"${subj.name}",semester,${subj.semester ?? ''}`);
      }
      (subjectDetails?.performanceDistribution || []).forEach((d) => {
        lines.push(`"${subj?.name || 'subject'}",performance_${d.label},${d.count}`);
      });
      (subjectDetails?.students || []).forEach((s) => {
        lines.push(`"${s.student?.name || ''}",usn_${s.student?.usn || s.student?.rollNumber || ''},avg_${s.performance?.average ?? ''}_att_${s.attendance?.rate ?? ''}`);
      });
      (consistency?.monthlyTrends || []).forEach((t) => {
        lines.push(`"${subj?.name || 'subject'}",attendance_${t.month},${Math.round(t.attendanceRate * 10) / 10}`);
      });
      if (lines.length <= 1) {
        toast.error('No report data to export');
        return;
      }
      const url = window.URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch {
      toast.error('Failed to export report');
    }
  };

  const selectedSubjectData = subjects.find(s => s._id === selectedSubject);
  const pageTitle = reportType === 'attendance' ? 'Attendance Analytics' : 'Performance Reports';

  const students = subjectDetails?.students || [];
  const studentCount = students.length;
  const avgAttendance = consistency?.overall?.averageAttendance
    ?? (students.length > 0
      ? students.reduce((s, x) => s + (x.attendance?.rate || 0), 0) / students.length
      : 0);
  const avgMarks = students.length > 0
    ? students.reduce((s, x) => s + (x.performance?.average || 0), 0) / students.length
    : 0;
  const belowThreshold = students.filter((x) => (x.attendance?.rate ?? 100) < 75).length;
  const topPerformer = students.length > 0
    ? Math.max(...students.map((x) => x.performance?.average || 0))
    : 0;

  const attendanceTrendData = (consistency?.monthlyTrends || []).map((t) => ({
    date: t.month,
    attendance: Math.round(t.attendanceRate * 10) / 10
  }));
  const attendancePatternFallback = (subjectDetails?.attendancePatterns || []).map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    attendance: Math.round(p.attendanceRate * 10) / 10
  }));
  const performanceChartData = (subjectDetails?.performanceDistribution || []).map((d) => ({
    exam: d.label,
    average: d.count
  }));

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
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{studentCount}</p>
              </div>
              <UserGroupIcon className="w-10 h-10 text-green-600" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Avg Attendance</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{avgAttendance.toFixed(1)}%</p>
              </div>
              <ClockIcon className="w-10 h-10 text-purple-600" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg Marks</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">{avgMarks.toFixed(1)}%</p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-orange-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Report status */}
      {reportLoading && (
        <Card className="p-6 text-center text-gray-500">Loading report data...</Card>
      )}
      {reportError && !reportLoading && (
        <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-red-800 dark:text-red-200">{reportError}</p>
            <Button onClick={fetchReportData} variant="outline">Retry</Button>
          </div>
        </Card>
      )}

      {/* Charts */}
      {!reportLoading && !reportError && (attendanceTrendData.length > 0 || performanceChartData.length > 0 || students.length > 0) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(reportType === 'attendance' || reportType === 'marks') && (
          <Card className="p-6 border-l-4 border-l-blue-600">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Attendance Trend</h3>
            {(attendanceTrendData.length > 0 || attendancePatternFallback.length > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrendData.length > 0 ? attendanceTrendData : attendancePatternFallback}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={3} name="Attendance %" dot={{ fill: '#3b82f6', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm">No attendance trend data available.</p>
            )}
          </Card>
        )}

        {(reportType === 'performance' || reportType === 'marks') && (
          <Card className="p-6 border-l-4 border-l-green-600">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Performance Analysis</h3>
            {performanceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="exam" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#10b981" name="Students" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm">No performance data available.</p>
            )}
          </Card>
        )}

        <Card className="p-6 border-l-4 border-l-purple-600">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Report Summary</h3>
          <div className="space-y-4">
            {[
              { label: 'Total Classes Conducted', value: String(consistency?.overall?.totalClasses ?? 0), color: 'text-gray-900 dark:text-white' },
              { label: 'Average Attendance', value: `${avgAttendance.toFixed(1)}%`, color: 'text-green-600' },
              { label: 'Students Below 75%', value: String(belowThreshold), color: 'text-red-600' },
              { label: 'Top Performer', value: `${topPerformer.toFixed(1)}%`, color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
                <span className={`font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      )}
      {!reportLoading && !reportError && attendanceTrendData.length === 0 && performanceChartData.length === 0 && students.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg">No report data available for this subject yet.</p>
        </Card>
      )}
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
