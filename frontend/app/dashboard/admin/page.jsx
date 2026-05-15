'use client';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Card from '../../../components/ui/Card';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../../../lib/axios';
import { toast } from 'sonner';
import {
  UserGroupIcon,
  UsersIcon,
  AcademicCapIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BellIcon,
  UserCircleIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { BarChart, PieChart } from '../../../components/Charts';

const DashboardCard = ({ icon: Icon, title, description, subtitle, href, color = 'blue', isPrimary, count }) => {
  return (
    <Link href={href}>
      <Card className={`p-6 h-full group hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 ${isPrimary ? 'border-l-blue-600' : `border-l-${color}-500`}`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 group-hover:scale-110 transition-transform duration-200`}>
            <Icon className={`h-7 w-7 text-${color}-600 dark:text-${color}-400`} />
          </div>
          {count !== undefined && (
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {count}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className={`text-xs font-semibold text-${color}-600 mb-2 uppercase tracking-wide`}>
            {subtitle}
          </p>
        )}
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          {description}
        </p>
      </Card>
    </Link>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalParents: 0,
    totalDepartments: 0,
    totalSubjects: 0,
    pendingTickets: 0,
    recentNotices: 0,
    attendanceChart: [],
    marksChart: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [studentsRes, facultyRes, parentsRes, departmentsRes, subjectsRes, ticketsRes, noticesRes, attendanceRes, marksRes] = await Promise.all([
        api.get('/students/count').catch(() => ({ data: { data: { count: 0 } } })),
        api.get('/faculty/count').catch(() => ({ data: { data: { count: 0 } } })),
        api.get('/parent/count').catch(() => ({ data: { data: { count: 0 } } })),
        api.get('/departments').catch(() => ({ data: { data: [] } })),
        api.get('/subjects').catch(() => ({ data: { data: [] } })),
        api.get('/tickets').catch(() => ({ data: { data: [] } })),
        api.get('/notices').catch(() => ({ data: { data: [] } })),
        api.get('/reports/attendance').catch(() => ({ data: { data: [] } })),
        api.get('/reports/marks').catch(() => ({ data: { data: [] } }))
      ]);

      const attendanceData = attendanceRes.data.data || [];
      const marksData = marksRes.data.data || [];

      // Attendance distribution by status
      const goodAtt = attendanceData.filter(a => a.status === 'Good').length;
      const warnAtt = attendanceData.filter(a => a.status === 'Warning').length;
      const lowAtt = attendanceData.filter(a => a.status === 'Low').length;

      // Marks grade distribution
      const gradeMap = {};
      marksData.forEach(m => { if (m.grade && m.grade !== 'N/A') gradeMap[m.grade] = (gradeMap[m.grade] || 0) + 1; });

      setStats({
        totalStudents: studentsRes.data.data?.count ?? 0,
        totalFaculty: facultyRes.data.data?.count ?? 0,
        totalParents: parentsRes.data.data?.count ?? 0,
        totalDepartments: departmentsRes.data.data?.length || 0,
        totalSubjects: subjectsRes.data.data?.length || 0,
        pendingTickets: ticketsRes.data.data?.filter(t => t.status === 'PENDING')?.length || 0,
        recentNotices: noticesRes.data.data?.filter(n => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(n.createdAt) > weekAgo;
        })?.length || 0,
        attendanceChart: attendanceData.length > 0
          ? [{ label: 'Good', value: goodAtt }, { label: 'Warning', value: warnAtt }, { label: 'Low', value: lowAtt }].filter(d => d.value > 0)
          : [],
        marksChart: Object.entries(gradeMap).map(([label, value]) => ({ label, value }))
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const academicItems = [
    { 
      icon: BookOpenIcon,
      title: 'Subjects',
      subtitle: 'Configure curriculum',
      description: 'Create and manage subjects across departments and semesters',
      href: '/dashboard/admin/subjects',
      color: 'purple',
      count: stats.totalSubjects
    },
    { 
      icon: BuildingOfficeIcon,
      title: 'Departments',
      subtitle: 'Organize structure',
      description: 'Create and manage academic departments and their configuration',
      href: '/dashboard/admin/departments',
      color: 'indigo',
      count: stats.totalDepartments
    },
    { 
      icon: DocumentChartBarIcon,
      title: 'Academic Reports',
      subtitle: 'Track performance',
      description: 'Generate detailed reports on student performance and analytics',
      href: '/dashboard/admin/reports',
      color: 'green'
    }
  ];

  const peopleItems = [
    { 
      icon: UserGroupIcon,
      title: 'Profile Management',
      subtitle: 'Create profiles quickly',
      description: 'Create and manage student & faculty profiles efficiently',
      href: '/dashboard/admin/profiles',
      color: 'blue',
      isPrimary: true
    },
    { 
      icon: AcademicCapIcon,
      title: 'Students',
      subtitle: 'View all students',
      description: 'View student information, records, and manage enrollment',
      href: '/dashboard/admin/students',
      color: 'teal',
      count: stats.totalStudents
    },
    { 
      icon: UserCircleIcon,
      title: 'Faculty',
      subtitle: 'Manage educators',
      description: 'View faculty information, assignments, and schedules',
      href: '/dashboard/admin/faculty',
      color: 'cyan',
      count: stats.totalFaculty
    },
    { 
      icon: UserPlusIcon,
      title: 'Parents',
      subtitle: 'Parent accounts',
      description: 'View and manage parent accounts linked to students',
      href: '/dashboard/admin/parents',
      color: 'violet',
      count: stats.totalParents
    }
  ];

  const systemItems = [
    { 
      icon: BellIcon,
      title: 'Notices',
      subtitle: 'Broadcast updates',
      description: 'Create and manage system-wide announcements and notices',
      href: '/dashboard/admin/notices',
      color: 'orange',
      count: stats.recentNotices
    },
    { 
      icon: ChartBarIcon,
      title: 'Support Tickets',
      subtitle: 'Help requests',
      description: 'Manage and resolve student and faculty support requests',
      href: '/dashboard/admin/tickets',
      color: 'pink',
      count: stats.pendingTickets
    },
    { 
      icon: Cog6ToothIcon,
      title: 'Settings',
      subtitle: 'Configure system',
      description: 'Manage system settings and configurations',
      href: '/dashboard/admin/settings',
      color: 'gray'
    }
  ];

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Manage your college's academic and administrative operations
              </p>
            </div>
            <Link href="/dashboard/admin/profiles">
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 px-4 py-2 rounded-lg text-white font-medium">
                <PlusCircleIcon className="h-5 w-5 mr-2 inline" />
                Quick Create
              </button>
            </Link>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Students</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{stats.totalStudents}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Faculty</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{stats.totalFaculty}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Parents</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{stats.totalParents}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending Tickets</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">{stats.pendingTickets}</p>
            </Card>
          </div>
        </motion.div>

        {/* Academic Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1 h-6 bg-blue-600 dark:bg-blue-400 mr-3 rounded-full"></span>
            Academic
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {academicItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <DashboardCard {...item} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* People Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1 h-6 bg-blue-600 dark:bg-blue-400 mr-3 rounded-full"></span>
            People
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {peopleItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <DashboardCard {...item} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* System & Reports Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1 h-6 bg-blue-600 dark:bg-blue-400 mr-3 rounded-full"></span>
            System & Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {systemItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <DashboardCard {...item} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Analytics Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Institution Overview
            </h2>
            <BarChart
              data={[
                { label: 'Students', value: stats.totalStudents },
                { label: 'Faculty', value: stats.totalFaculty },
                { label: 'Subjects', value: stats.totalSubjects },
                { label: 'Depts', value: stats.totalDepartments },
              ].filter(d => d.value > 0)}
              height={220}
              color="#3b82f6"
            />
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {stats.attendanceChart.length > 0 ? 'Attendance Distribution' : 'People Distribution'}
            </h2>
            <PieChart
              data={stats.attendanceChart.length > 0
                ? stats.attendanceChart
                : [
                    { label: 'Students', value: stats.totalStudents },
                    { label: 'Faculty', value: stats.totalFaculty },
                  ].filter(d => d.value > 0)
              }
              size={200}
            />
          </Card>
          {stats.marksChart.length > 0 && (
            <Card className="p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grade Distribution</h2>
              <BarChart data={stats.marksChart} height={220} color="#8b5cf6" />
            </Card>
          )}
        </motion.div>
      </div>

      {/* Footer Tagline */}
      <div className="mt-12 pb-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Built by <span className="font-semibold text-gray-700 dark:text-gray-300">Naresh Murthy</span>
        </p>
      </div>
    </ProtectedRoute>
  );
}