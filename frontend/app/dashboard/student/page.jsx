'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import api from '../../../lib/axios';
import {
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  SpeakerWaveIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  UserIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { ProgressRing, BarChart } from '../../../components/Charts';
import WeeklyTimetable from '../../../components/WeeklyTimetable';
import { ClockIcon } from '@heroicons/react/24/outline';
import ChangePasswordModal from '../../../components/ui/ChangePasswordModal';

const UpcomingDeadlines = ({ deadlines, loading }) => {
  const getDaysLeft = (dueDate) => {
    const diff = new Date(dueDate) - new Date();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { label: `${days}d ${hours}h`, urgent: days <= 1 };
    if (hours > 0) return { label: `${hours}h`, urgent: true };
    return { label: 'Due soon', urgent: true };
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="h-5 w-5 text-orange-500" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</h2>
        {deadlines.length > 0 && <Badge variant="warning">{deadlines.length}</Badge>}
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}</div>
      ) : deadlines.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ClockIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No deadlines in the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deadlines.map((item) => {
            const { label, urgent } = getDaysLeft(item.dueDate);
            const submitted = item.submissionStatus && item.submissionStatus !== 'PENDING';
            return (
              <Link key={item._id} href={item.href}>
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.subject}{item.subjectCode ? ` · ${item.subjectCode}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {submitted ? (
                      <Badge variant="success">Submitted</Badge>
                    ) : (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        urgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>{label}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const DashboardCard = ({ icon: Icon, title, description, href, color, stats }) => (
  <Link href={href}>
    <Card hover className="p-6 h-full group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/20 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
        {stats && <Badge variant={stats.variant}>{stats.value}</Badge>}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
      <div className="mt-4 flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium group-hover:translate-x-1 transition-transform duration-200">
        View Details
        <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Card>
  </Link>
);

const QuickStats = ({ attendancePercentage, pendingLeaves, newNotices, cgpa, loading }) => {
  const stats = [
    { label: 'Attendance', value: loading ? '--' : `${attendancePercentage}%`, color: 'green' },
    { label: 'CGPA', value: cgpa, color: 'blue' },
    { label: 'Pending Leaves', value: pendingLeaves, color: 'yellow' },
    { label: 'New Notices', value: newNotices, color: 'purple' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => {
        let colorClass = `text-${stat.color}-600 dark:text-${stat.color}-400`;
        let ringColor = '#10b981';
        if (stat.label === 'Attendance' && !loading && attendancePercentage !== '--') {
          const val = parseFloat(attendancePercentage);
          if (val < 75) { colorClass = 'text-red-600 dark:text-red-400'; ringColor = '#ef4444'; }
          else if (val < 85) { colorClass = 'text-yellow-600 dark:text-yellow-400'; ringColor = '#eab308'; }
          else { colorClass = 'text-green-600 dark:text-green-400'; }
        }
        return (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="p-4 text-center flex flex-col items-center justify-center h-full min-h-[140px]">
              {stat.label === 'Attendance' && !loading && attendancePercentage !== '--' ? (
                <div className="mb-2">
                  <ProgressRing percentage={parseFloat(attendancePercentage)} size={80} strokeWidth={8} color={ringColor} />
                </div>
              ) : (
                <div className={`text-3xl font-bold ${colorClass}`}>{stat.value}</div>
              )}
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">{stat.label}</div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default function StudentDashboard() {
  const [attendancePercentage, setAttendancePercentage] = useState('--');
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [newNotices, setNewNotices] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [studentName, setStudentName] = useState('Student');
  const [attendanceChartData, setAttendanceChartData] = useState([]);
  const [marksChartData, setMarksChartData] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [deadlinesLoading, setDeadlinesLoading] = useState(true);
  const [cgpa, setCgpa] = useState('--');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileNotFound, setProfileNotFound] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    // Check if user is authenticated before fetching data
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }
    }
    fetchDashboardData();
    fetchDeadlines();
    fetchCGPA();
  }, []);

  const fetchCGPA = async () => {
    try {
      const res = await api.get('/grades/calculate/me');
      const val = res.data?.data?.cgpa;
      if (val != null) setCgpa(val.toFixed(2));
    } catch (error) {
      if (error.response?.status !== 404 && error.response?.status !== 401) {
        console.error('Error fetching CGPA:', error.message);
      }
      // CGPA stays '--' if not available
    }
  };

  const fetchDeadlines = async () => {
    try {
      const res = await api.get('/assignments/upcoming-deadlines');
      setUpcomingDeadlines(res.data?.data || []);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching deadlines:', error.message);
      }
      setUpcomingDeadlines([]);
    } finally {
      setDeadlinesLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const studentRes = await api.get('/students/me');
      const student = studentRes.data?.data;
      if (!student?._id) {
        console.warn('Student profile not found');
        setProfileNotFound(true);
        return;
      }
      setProfileNotFound(false);
      if (student.userId?.name) setStudentName(student.userId.name.split(' ')[0]);

      const studentId = student._id;
      // enrolled subjects as the base — all subjects always shown
      const enrolledSubjects = student.subjects || [];

      const [attendanceRes, leavesRes, noticesRes, activityAttRes, marksRes] = await Promise.allSettled([
        api.get(`/attendance/summary/${studentId}`).catch(err => {
          if (err.response?.status === 404) console.warn('Attendance summary endpoint not found');
          throw err;
        }),
        api.get('/leaves/my').catch(err => {
          if (err.response?.status === 404) console.warn('Leaves endpoint not found');
          throw err;
        }),
        api.get('/notices/my').catch(err => {
          if (err.response?.status === 404) console.warn('Notices endpoint not found');
          throw err;
        }),
        api.get(`/attendance/student/${studentId}`).catch(err => {
          if (err.response?.status === 404) console.warn('Student attendance endpoint not found');
          throw err;
        }),
        api.get('/marks/my').catch(err => {
          if (err.response?.status === 404) console.warn('Marks endpoint not found');
          throw err;
        }),
      ]);

      if (attendanceRes.status === 'fulfilled') {
        const summary = attendanceRes.value.data?.data || [];
        const totalPresent = summary.reduce((sum, item) => sum + (item.presentClasses || 0), 0);
        const totalClasses = summary.reduce((sum, item) => sum + (item.totalClasses || 0), 0);
        setAttendancePercentage(totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : '0');

        // Build a map of subjectId -> percentage from attendance records
        const attMap = {};
        summary.forEach(s => {
          const id = s._id?.toString() || s.subject?._id?.toString();
          if (id) attMap[id] = Math.round((s.presentClasses / s.totalClasses) * 100);
        });

        // Use all enrolled subjects as base, overlay attendance data
        setAttendanceChartData(
          enrolledSubjects.map(s => ({
            label: (s.name || 'Subject').slice(0, 8),
            value: attMap[s._id?.toString()] ?? 0
          })).slice(0, 8)
        );
      }

      if (leavesRes.status === 'fulfilled') {
        const leaves = leavesRes.value.data?.data || [];
        setPendingLeaves(leaves.filter(l => l.status === 'PENDING').length);
        const leaveActivities = leaves.slice(0, 2).map(leave => ({
          action: `Leave request ${leave.status.toLowerCase()}`,
          subject: leave.reason,
          time: new Date(leave.updatedAt || leave.createdAt),
          type: leave.status === 'APPROVED' ? 'success' : leave.status === 'PENDING' ? 'info' : 'danger'
        }));
        const attendanceActivities = activityAttRes.status === 'fulfilled'
          ? (activityAttRes.value.data?.data || []).slice(0, 2).map(record => ({
              action: 'Attendance marked', subject: record.subject?.name || 'Subject',
              time: new Date(record.date), type: record.status === 'present' ? 'success' : 'danger'
            }))
          : [];
        setRecentActivity([...attendanceActivities, ...leaveActivities].sort((a, b) => b.time - a.time).slice(0, 5));
      }

      if (noticesRes.status === 'fulfilled') {
        const notices = noticesRes.value.data?.data || [];
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        setNewNotices(notices.filter(n => new Date(n.createdAt) >= sevenDaysAgo).length);
      }

      if (marksRes.status === 'fulfilled') {
        const marksList = marksRes.value.data?.data || [];
        // Build map keyed by both _id string forms
        const marksMap = {};
        marksList.forEach(m => {
          const id = (m.subject?._id || m.subject)?.toString();
          if (id) {
            const avg = Math.round(((m.internal1 || 0) + (m.internal2 || 0) + (m.internal3 || 0)) / 3);
            marksMap[id] = avg;
          }
        });
        // Use all enrolled subjects as base — show 0 if no marks yet
        const chartData = enrolledSubjects.map(s => ({
          label: (s.name || 'Subject').slice(0, 10),
          value: marksMap[s._id?.toString()] ?? 0
        })).slice(0, 8);
        setMarksChartData(chartData.length > 0 ? chartData : []);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('Student profile not found. Please contact administrator to create your profile.');
        setProfileNotFound(true);
      } else if (error.response?.status !== 401) {
        console.error('Failed to fetch dashboard data:', error.message);
      }
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const attVal = parseFloat(attendancePercentage);
  let attVariant = 'success', attColor = 'green';
  if (!isNaN(attVal)) {
    if (attVal < 75) { attVariant = 'danger'; attColor = 'red'; }
    else if (attVal < 85) { attVariant = 'warning'; attColor = 'yellow'; }
  }

  const dashboardItems = [
    { icon: UserIcon, title: 'My Profile', description: 'View and manage your personal information, academic details, and account settings', href: '/profile', color: 'blue', stats: { variant: 'info', value: 'Updated' } },
    { icon: ClipboardDocumentListIcon, title: 'Attendance', description: 'Track your attendance records, view percentage, and monitor your presence across subjects', href: '/attendance/student', color: attColor, stats: { variant: attVariant, value: attendancePercentage !== '--' ? `${attendancePercentage}%` : '--' } },
    { icon: AcademicCapIcon, title: 'Internal Marks', description: 'View your internal assessment marks (Internal 1, 2, 3) for all subjects', href: '/marks/internal', color: 'purple', stats: { variant: 'info', value: 'View' } },
    { icon: ChartBarIcon, title: 'Semester Marks', description: 'Check your complete semester examination marks and final grades', href: '/marks/semester', color: 'blue', stats: { variant: 'info', value: 'View' } },
    { icon: AcademicCapIcon, title: 'CGPA', description: 'View your cumulative GPA, semester-wise SGPA breakdown, and subject grade points', href: '/marks/cgpa', color: 'indigo', stats: cgpa !== '--' ? { variant: 'info', value: cgpa } : undefined },
    { icon: SpeakerWaveIcon, title: 'Notices & Announcements', description: 'Stay updated with important announcements, events, and notices from the college', href: '/notices', color: 'orange', stats: newNotices > 0 ? { variant: 'warning', value: `${newNotices} New` } : undefined },
    { icon: CalendarDaysIcon, title: 'Leave Management', description: 'Apply for leaves, track your requests, and manage your leave balance effectively', href: '/leaves', color: 'red', stats: pendingLeaves > 0 ? { variant: 'danger', value: `${pendingLeaves} Pending` } : undefined },
    { icon: ChartBarIcon, title: 'Academic Reports', description: 'Generate and download detailed reports of your academic progress and achievements', href: '/reports/student', color: 'indigo' }
  ];

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      {profileNotFound ? (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="p-8 text-center">
            <div className="mb-6">
              <UserIcon className="w-20 h-20 mx-auto text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Student Profile Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Your student profile has not been created yet. Please contact your administrator or visit the admin office to set up your profile.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>What to do:</strong>
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-300 mt-2 space-y-1 text-left">
                <li>• Contact your department administrator</li>
                <li>• Provide your user credentials</li>
                <li>• Wait for profile creation</li>
                <li>• Refresh this page after confirmation</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </Card>
        </div>
      ) : (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{getGreeting()}, {studentName}! 👋</h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                Welcome back to your CampusHub dashboard. Let's make today count! Here is a comprehensive overview of your current academic progress, upcoming schedules, and recent activities.
              </p>
            </div>
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors whitespace-nowrap"
            >
              <KeyIcon className="w-4 h-4" />
              Change Password
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <QuickStats attendancePercentage={attendancePercentage} pendingLeaves={pendingLeaves.toString()} newNotices={newNotices.toString()} cgpa={cgpa} loading={false} />

        {/* Weekly Timetable — TOP */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <WeeklyTimetable role="STUDENT" />
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mt-6">
          <UpcomingDeadlines deadlines={upcomingDeadlines} loading={deadlinesLoading} />
        </motion.div>

        {/* Dashboard Cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardItems.map((item, index) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index }}>
              <DashboardCard {...item} />
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800/50 mb-4 border border-gray-100 dark:border-gray-700">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Recent Activity</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                  Your recent attendance updates, leave requests, and other important activities will automatically appear here once they occur.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${activity.type === 'success' ? 'bg-green-500' : activity.type === 'danger' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.subject}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{getTimeAgo(activity.time)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Charts */}
        {(attendanceChartData.length > 0 || marksChartData.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {attendanceChartData.length > 0 && (
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Attendance by Subject</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">A visual breakdown of your current attendance percentage across all enrolled courses.</p>
                </div>
                <BarChart data={attendanceChartData} height={220} color="#10b981" />
              </Card>
            )}
            {marksChartData.length > 0 && (
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Average Marks by Subject</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Compare your performance and identify areas for improvement based on recent internal assessments.</p>
                </div>
                <BarChart data={marksChartData} height={220} color="#3b82f6" />
              </Card>
            )}
          </motion.div>
        )}

      </div>
      )}

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </ProtectedRoute>
  );
}
