'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import {
  PlusIcon,
  TrashIcon,
  BellIcon,
  MegaphoneIcon,
  UserGroupIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import api from '../../../../lib/axios';
import { toast } from 'sonner';

const EMPTY_FORM = {
  title: '',
  message: '',
  targetType: 'DEPARTMENT',
  department: '',
  semester: ''
};

export default function FacultyNoticesPage() {
  const [notices, setNotices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchNotices();
    fetchDepartments();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notices');
      setNotices(res.data.data || []);
    } catch {
      toast.error('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch {
      // non-critical
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (payload.targetType === 'DEPARTMENT') {
        delete payload.semester;
      } else if (payload.targetType === 'SEMESTER') {
        delete payload.department;
        payload.semester = parseInt(payload.semester);
      }

      await api.post('/notices', payload);
      toast.success('Notice created successfully');
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchNotices();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create notice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return;
    try {
      await api.delete(`/notices/${id}`);
      toast.success('Notice deleted');
      setNotices(prev => prev.filter(n => n._id !== id));
    } catch {
      toast.error('Failed to delete notice');
    }
  };

  const myNotices = notices.filter(n => n.targetType !== 'COLLEGE');
  const deptNotices = myNotices.filter(n => n.targetType === 'DEPARTMENT').length;
  const semNotices = myNotices.filter(n => n.targetType === 'SEMESTER').length;

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['FACULTY']}>
        <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <MegaphoneIcon className="w-8 h-8 text-blue-600" />
              Notices
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage notices for your students
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Notice
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Notices</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{notices.length}</p>
              </div>
              <BellIcon className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Department</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">{deptNotices}</p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-purple-400" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Semester</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">{semNotices}</p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-green-400" />
            </div>
          </Card>
        </div>

        {/* Notices list */}
        {notices.length === 0 ? (
          <Card className="p-12 text-center">
            <MegaphoneIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notices yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create a notice to inform your students</p>
            <Button onClick={() => setShowModal(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create First Notice
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {notices.map((notice) => (
              <Card key={notice._id} className="p-6 border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        notice.targetType === 'COLLEGE'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : notice.targetType === 'DEPARTMENT'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {notice.targetType}
                      </span>
                      {notice.department?.name && (
                        <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                          {notice.department.name}
                        </span>
                      )}
                      {notice.semester && (
                        <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                          Sem {notice.semester}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">{notice.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">{notice.message}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                      <span>By: {notice.createdBy?.name || 'Unknown'}</span>
                      <span>{new Date(notice.createdAt).toLocaleDateString()} {new Date(notice.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(notice._id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg shadow-2xl">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Create Notice</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent h-28 resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target</label>
                    <select
                      value={formData.targetType}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value, department: '', semester: '' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="DEPARTMENT">Specific Department</option>
                      <option value="SEMESTER">Specific Semester</option>
                      <option value="COLLEGE">Entire College</option>
                    </select>
                  </div>

                  {formData.targetType === 'DEPARTMENT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.targetType === 'SEMESTER' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                      <select
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowModal(false); setFormData(EMPTY_FORM); }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={submitting}>
                      Create Notice
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
