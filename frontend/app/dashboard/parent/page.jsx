'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import api from '../../../lib/axios';
import {
  CurrencyDollarIcon,
  BellAlertIcon,
  QuestionMarkCircleIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ProgressRing } from '../../../components/Charts';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [linked, setLinked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usn, setUsn] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/parent/dashboard');
      setLinked(res.data.linked);
      setDashboard(res.data.data);
    } catch {
      setLinked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (e) => {
    e.preventDefault();
    setLinking(true);
    setLinkError('');
    try {
      await api.post('/parent/link-student', { usn });
      await fetchDashboard();
    } catch (err) {
      setLinkError(err.response?.data?.error || 'Failed to link student');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!linked) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <Card className="p-8 text-center">
          <UserCircleIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Link Your Child's Account</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Enter your child's USN to connect their academic records to your parent portal.</p>
          <form onSubmit={handleLink} className="space-y-4">
            <input
              type="text"
              value={usn}
              onChange={e => setUsn(e.target.value.toUpperCase())}
              placeholder="Enter USN (e.g. 1AB21CS001)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {linkError && <p className="text-red-500 text-sm">{linkError}</p>}
            <button
              type="submit"
              disabled={linking}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {linking ? 'Linking...' : 'Link Student'}
            </button>
          </form>
        </Card>
      </div>
    );
  }

  const { student, attendance, marks, fees, notices } = dashboard;
  const attColor = attendance.overall >= 75 ? '#10b981' : attendance.overall >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-1">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
        <p className="text-blue-100">
          Monitoring <span className="font-semibold">{student.name}</span> &mdash; {student.usn} &middot; Sem {student.semester} &middot; {student.department?.name}
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
          {attendance.overall !== null ? (
            <ProgressRing percentage={attendance.overall} size={72} strokeWidth={7} color={attColor} />
          ) : (
            <p className="text-2xl font-bold text-gray-400">N/A</p>
          )}
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Attendance</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
          <p className={`text-3xl font-bold ${attendance.atRiskCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {attendance.atRiskCount}
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">At-Risk Subjects</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
          <p className={`text-3xl font-bold ${fees.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{fees.totalDue.toLocaleString()}
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Fee Due</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
          <p className="text-3xl font-bold text-blue-600">{marks.length}</p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">Subjects Tracked</p>
        </Card>
      </motion.div>

      {/* Marks Summary */}
      {marks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AcademicCapIcon className="h-5 w-5 text-blue-500" /> Internal Marks
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 font-medium text-center">Int 1</th>
                    <th className="pb-2 font-medium text-center">Int 2</th>
                    <th className="pb-2 font-medium text-center">Int 3</th>
                    <th className="pb-2 font-medium text-center">Avg</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {marks.map((m, i) => (
                    <tr key={i}>
                      <td className="py-2 font-medium text-gray-900 dark:text-white">{m.subject?.name || 'Subject'}</td>
                      <td className="py-2 text-center text-gray-700 dark:text-gray-300">{m.internal1 || '-'}</td>
                      <td className="py-2 text-center text-gray-700 dark:text-gray-300">{m.internal2 || '-'}</td>
                      <td className="py-2 text-center text-gray-700 dark:text-gray-300">{m.internal3 || '-'}</td>
                      <td className="py-2 text-center font-semibold text-gray-900 dark:text-white">{m.average}</td>
                      <td className="py-2 text-center">
                        <Badge variant={m.status === 'SAFE' ? 'success' : 'danger'}>{m.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Attendance At-Risk */}
      {attendance.atRiskCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-6 border-l-4 border-red-500">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" /> Low Attendance Subjects
            </h2>
            <div className="space-y-2">
              {attendance.subjects.filter(s => s.percentage < 75).map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.subject?.name || 'Subject'}</span>
                  <span className="text-sm font-bold text-red-600">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Notices + Quick Links */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BellAlertIcon className="h-5 w-5 text-blue-500" /> Recent Notices
          </h2>
          {notices.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No recent notices.</p>
          ) : (
            <div className="space-y-3">
              {notices.map((n, i) => (
                <div key={i} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString()} &middot; {n.createdBy?.name || 'Admin'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { name: 'View Fees', desc: fees.totalDue > 0 ? `₹${fees.totalDue.toLocaleString()} due` : 'All paid', icon: CurrencyDollarIcon, href: '/fees', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
              { name: 'All Notices', desc: 'Campus announcements', icon: BellAlertIcon, href: '/notices', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { name: 'Attendance Details', desc: `${attendance.subjects.length} subjects tracked`, icon: ClipboardDocumentListIcon, href: '/attendance/student', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
              { name: 'Help & Support', desc: 'Contact administration', icon: QuestionMarkCircleIcon, href: '/tickets', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
            ].map(link => (
              <Link href={link.href} key={link.name}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <div className={`p-2 rounded-lg ${link.bg}`}>
                    <link.icon className={`w-5 h-5 ${link.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{link.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{link.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
