'use client';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../../../lib/axios';
import {
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  DocumentCheckIcon,
  BellIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  UserGroupIcon,
  PresentationChartLineIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { BarChart } from '../../../components/Charts';
import WeeklyTimetable from '../../../components/WeeklyTimetable';

const DashboardCard = ({ icon: Icon, title, description, subtitle, href, color = 'blue', isPrimary, count }) => (
  <Link href={href}>
    <Card className={`p-6 h-full group transition-all duration-200 hover:shadow-xl hover:scale-105 ${isPrimary ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/20 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
        {count !== undefined && (
          <span className="text-lg font-bold text-gray-900 dark:text-white">{count}</span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {subtitle && <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">{subtitle}</p>}
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
    </Card>
  </Link>
);



export default function FacultyDashboard() {
  const [stats, setStats] = useState({ totalClasses: 0, totalStudents: 0, pendingLeaves: 0, recentNotices: 0, avgPerformance: null, avgAttendance: null });
  const [subjectChartData, setSubjectChartData] = useState([]);
  const [recentActivities, setRecentActivities] = useState({ recentHomeworks: [], recentGradings: [] });
  const [facultyName, setFacultyName] = useState('Faculty');
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => { fetchFacultyData(); }, []);

  const fetchFacultyData = async () => {
    try {
      const [analyticsRes, leavesRes, noticesRes] = await Promise.all([
        api.get('/faculty-analytics/dashboard').catch(() => ({ data: { data: null } })),
        api.get('/leaves/pending').catch(() => ({ data: { data: [] } })),
        api.get('/notices').catch(() => ({ data: { data: [] } }))
      ]);

      const analytics = analyticsRes.data?.data;
      if (analytics?.faculty?.name) setFacultyName(analytics.faculty.name.split(' ')[0]);

      const overview = analytics?.overview || {};
      const pendingLeaves = leavesRes.data.data?.length || 0;
      const recentNotices = noticesRes.data.data?.filter(n => {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(n.createdAt) > weekAgo;
      })?.length || 0;

      setStats({
        totalClasses: overview.totalSubjects || 0,
        totalStudents: overview.totalStudents || 0,
        pendingLeaves,
        recentNotices,
        avgPerformance: overview.averagePerformance ?? null,
        avgAttendance: overview.averageAttendance ?? null
      });

      if (analytics?.subjects?.length > 0) {
        setSubjectChartData(
          analytics.subjects
            .filter(s => s.students.unique > 0)
            .map(s => ({ label: (s.subject.name || 'Subject').slice(0, 8), value: s.students.unique }))
            .slice(0, 8)
        );
      }

      if (analytics?.recentActivities) setRecentActivities(analytics.recentActivities);

    } catch (error) {
      console.error('Failed to fetch faculty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const classManagementItems = [
    { icon: ClipboardDocumentCheckIcon, title: 'Mark Attendance', subtitle: 'Record student presence', description: 'Mark and track attendance for your assigned classes and subjects', href: '/dashboard/faculty/attendance', color: 'green', isPrimary: true },
    { icon: PencilSquareIcon, title: 'Enter Marks', subtitle: 'Grade assessments', description: 'Enter and manage student marks for tests and assignments', href: '/dashboard/faculty/marks', color: 'blue', isPrimary: true },
    { icon: AcademicCapIcon, title: 'My Classes', subtitle: 'View schedule', description: 'View your assigned classes, subjects, and teaching timetable', href: '/dashboard/faculty/classes', color: 'purple', count: stats.totalClasses },
    { icon: ClipboardDocumentListIcon, title: 'Assignments', subtitle: 'Create & grade', description: 'Create assignments, view student submissions, and grade them', href: '/dashboard/faculty/assignments', color: 'orange', isPrimary: true },
    { icon: BookOpenIcon, title: 'Study Materials', subtitle: 'Upload resources', description: 'Upload lecture notes, reference materials, and resources for students', href: '/dashboard/faculty/study-materials', color: 'teal' },
  ];

  const administrationItems = [
    { icon: DocumentCheckIcon, title: 'Leave Requests', subtitle: 'Review applications', description: 'Review and approve student leave requests efficiently', href: '/dashboard/faculty/leaves', color: 'orange', count: stats.pendingLeaves },
    { icon: BellIcon, title: 'Notices', subtitle: 'Communicate updates', description: 'Create and manage notices for your students', href: '/dashboard/faculty/notices', color: 'red', count: stats.recentNotices },
    { icon: CalendarDaysIcon, title: 'Calendar', subtitle: 'Plan ahead', description: 'View academic calendar and important dates', href: '/calendar', color: 'indigo' }
  ];

  const reportsItems = [
    { icon: PresentationChartLineIcon, title: 'Attendance Analytics', subtitle: 'Track trends', description: 'View attendance trends, patterns, and insights across your classes and subjects', href: '/dashboard/faculty/reports', color: 'blue', isPrimary: true },
    { icon: ChartBarIcon, title: 'Performance Reports', subtitle: 'Analyze trends', description: 'Generate reports on student performance and class analytics', href: '/dashboard/faculty/reports', color: 'teal' },
    { icon: UserGroupIcon, title: 'Student Lists', subtitle: 'View rosters', description: 'Access class-wise student lists and contact information', href: '/dashboard/faculty/students', color: 'cyan', count: stats.totalStudents }
  ];

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['FACULTY']}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="grid grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{getGreeting()}, {facultyName}! 👋</h1>
            <Link href="/dashboard/faculty/attendance">
              <Button variant="primary" size="md">Mark Attendance</Button>
            </Link>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Welcome back to your CampusHub dashboard. Manage your classes, students, and academic activities.</p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 shadow-none">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">My Subjects</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{stats.totalClasses}</p>
            </Card>
            <Card className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 shadow-none">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Students</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{stats.totalStudents}</p>
            </Card>
            <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 shadow-none">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Pending Leaves</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">{stats.pendingLeaves}</p>
            </Card>
            <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 shadow-none">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">New Notices</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{stats.recentNotices}</p>
            </Card>
            {stats.avgPerformance !== null && (
              <Card className="p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 shadow-none">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Avg Performance</p>
                <p className="text-2xl font-bold text-teal-900 dark:text-teal-100 mt-1">{stats.avgPerformance}%</p>
              </Card>
            )}
            {stats.avgAttendance !== null && (
              <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 shadow-none">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Avg Attendance</p>
                <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">{stats.avgAttendance}%</p>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Weekly Timetable — TOP */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <WeeklyTimetable role="FACULTY" />
        </motion.div>

        {/* Class Management */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1 h-6 bg-blue-600 mr-3 rounded-full" />
            Class Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {classManagementItems.map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                <DashboardCard {...item} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Administration */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1 h-6 bg-blue-600 mr-3 rounded-full" />
            Administration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {administrationItems.map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
                <DashboardCard {...item} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Reports */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1 h-6 bg-blue-600 mr-3 rounded-full" />
            Reports & Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {reportsItems.map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}>
                <DashboardCard {...item} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Chart + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subjectChartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Students per Subject</h2>
                <BarChart data={subjectChartData} height={220} color="#6366f1" />
              </Card>
            </motion.div>
          )}
          {(recentActivities.recentGradings.length > 0 || recentActivities.recentHomeworks.length > 0) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {recentActivities.recentGradings.slice(0, 3).map((g, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{g.student} — {g.subject}</p>
                        <p className="text-xs text-gray-500">{g.marks}/{g.total} marks</p>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(g.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {recentActivities.recentHomeworks.slice(0, 2).map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{h.title}</p>
                        <p className="text-xs text-gray-500">{h.submissionCount} submissions · Due {new Date(h.dueDate).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">HW</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

      </div>
    </ProtectedRoute>
  );
}
