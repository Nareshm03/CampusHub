'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import ChangePasswordModal from '../../../../components/ui/ChangePasswordModal';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  KeyIcon,
  FunnelIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const ROLE_BADGE = {
  ADMIN:   { label: 'Admin',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ShieldCheckIcon },
  FACULTY: { label: 'Faculty', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AcademicCapIcon },
  STUDENT: { label: 'Student', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: UserGroupIcon },
  PARENT:  { label: 'Parent',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: UserCircleIcon },
};

function RoleBadge({ role }) {
  const info = ROLE_BADGE[role] || { label: role, cls: 'bg-gray-100 text-gray-700', icon: UserCircleIcon };
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${info.cls}`}>
      <Icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

function Avatar({ name }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  const colors = ['from-blue-400 to-indigo-500', 'from-green-400 to-teal-500', 'from-purple-400 to-pink-500', 'from-orange-400 to-red-500', 'from-cyan-400 to-blue-500'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-bold">{initials}</span>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const LIMIT = 12;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const res = await api.get(`/users?${params}`);
      setUsers(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounce search: reset page when search/filter changes
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const openChangePassword = (user) => {
    setSelectedUser(user);
    setChangePasswordOpen(true);
  };

  const closeChangePassword = () => {
    setChangePasswordOpen(false);
    setTimeout(() => setSelectedUser(null), 300);
  };

  const stats = {
    total: pagination.total,
    admins: users.filter(u => u.role === 'ADMIN').length,
    faculty: users.filter(u => u.role === 'FACULTY').length,
    students: users.filter(u => u.role === 'STUDENT').length,
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                <UsersIcon className="w-9 h-9 text-blue-600" />
                User Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View all users and manage their account passwords
              </p>
            </div>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Total Users', value: pagination.total, color: 'blue' },
              { label: 'On This Page', value: users.length, color: 'indigo' },
              { label: 'Faculty', value: users.filter(u => u.role === 'FACULTY').length, color: 'green' },
              { label: 'Students', value: users.filter(u => u.role === 'STUDENT').length, color: 'purple' },
            ].map(s => (
              <Card key={s.label} className={`p-4 bg-${s.color}-50 dark:bg-${s.color}-900/20 border-${s.color}-200 dark:border-${s.color}-800`}>
                <p className={`text-xs font-medium text-${s.color}-600 dark:text-${s.color}-400`}>{s.label}</p>
                <p className={`text-2xl font-bold text-${s.color}-900 dark:text-${s.color}-100 mt-1`}>{s.value}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="FACULTY">Faculty</option>
                <option value="STUDENT">Student</option>
                <option value="PARENT">Parent</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <UsersIcon className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_2fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Action</span>
              </div>

              <AnimatePresence mode="popLayout">
                {users.map((user, i) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex flex-col md:grid md:grid-cols-[1fr_2fr_1fr_auto] gap-2 md:gap-4 items-start md:items-center px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={user.name} />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{user.name}</span>
                    </div>

                    {/* Email */}
                    <span className="text-gray-500 dark:text-gray-400 text-sm truncate pl-12 md:pl-0">{user.email}</span>

                    {/* Role */}
                    <div className="pl-12 md:pl-0">
                      <RoleBadge role={user.role} />
                    </div>

                    {/* Action */}
                    <div className="pl-12 md:pl-0">
                      <button
                        onClick={() => openChangePassword(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all duration-200 whitespace-nowrap"
                      >
                        <KeyIcon className="w-3.5 h-3.5" />
                        Reset Password
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {pagination.totalPages} · {pagination.total} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Admin change-password modal */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={closeChangePassword}
        userId={selectedUser?._id}
        userName={selectedUser?.name}
      />
    </ProtectedRoute>
  );
}