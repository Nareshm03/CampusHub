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

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'COLLEGE',
    targetAudience: 'ALL',
    department: '',
    semester: ''
  });

  useEffect(() => {
    fetchNotices();
    fetchDepartments();
  }, []);

  const fetchNotices = async () => {
    try {
      const response = await api.get('/notices');
      setNotices(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      toast.error('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      // Remove unnecessary fields based on targetType
      if (payload.targetType === 'COLLEGE') {
        delete payload.department;
        delete payload.semester;
      } else if (payload.targetType === 'DEPARTMENT') {
        delete payload.semester;
      } else if (payload.targetType === 'SEMESTER') {
        delete payload.department;
        payload.semester = parseInt(payload.semester);
      }

      await api.post('/notices', payload);
      toast.success('Notice created successfully');
      setShowModal(false);
      setFormData({
        title: '',
        message: '',
        targetType: 'COLLEGE',
        targetAudience: 'ALL',
        department: '',
        semester: ''
      });
      fetchNotices();
    } catch (error) {
      console.error('Failed to create notice:', error);
      toast.error(error.response?.data?.error || 'Failed to create notice');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    
    try {
      await api.delete(`/notices/${id}`);
      toast.success('Notice deleted successfully');
      fetchNotices();
    } catch (error) {
      console.error('Failed to delete notice:', error);
      toast.error('Failed to delete notice');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading notices...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <MegaphoneIcon className="w-10 h-10 text-blue-600" />
                Notices & Announcements
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create and manage campus-wide announcements
              </p>
            </div>
            <Button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Notice
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Notices</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{notices.length}</p>
              </div>
              <BellIcon className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">College-wide</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                  {notices.filter(n => n.targetType === 'COLLEGE').length}
                </p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Department-wise</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                  {notices.filter(n => n.targetType === 'DEPARTMENT').length}
                </p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {notices.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center">
              <MegaphoneIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notices yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Create your first announcement to keep everyone informed
              </p>
              <Button onClick={() => setShowModal(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create First Notice
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6">
            {notices.map((notice) => (
              <Card key={notice._id} className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-l-4 border-l-blue-600">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          notice.targetType === 'COLLEGE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          notice.targetType === 'DEPARTMENT' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {notice.targetType === 'COLLEGE' ? 'College-wide' : notice.targetType === 'DEPARTMENT' ? 'Department' : 'Semester'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          notice.targetAudience === 'STUDENTS' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' :
                          notice.targetAudience === 'FACULTY' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {notice.targetAudience === 'STUDENTS' ? '👨‍🎓 Students' : notice.targetAudience === 'FACULTY' ? '👨‍🏫 Faculty' : '👥 Everyone'}
                        </span>
                        {notice.department && (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full font-medium">
                            {notice.department.name}
                          </span>
                        )}
                        {notice.semester && (
                          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full font-medium">
                            Semester {notice.semester}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{notice.title}</h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-line">{notice.message}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span>Posted by: {notice.createdBy?.name || 'Unknown'}</span>
                        <span>{new Date(notice.createdAt).toLocaleDateString()} at {new Date(notice.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(notice._id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Create Notice</h2>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Message</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full p-2 border rounded-lg h-32"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Target Audience</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[['ALL', '👥 Everyone'], ['STUDENTS', '👨‍🎓 Students Only'], ['FACULTY', '👨‍🏫 Faculty Only']].map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormData({ ...formData, targetAudience: val })}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            formData.targetAudience === val
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Target Scope</label>
                    <select
                      value={formData.targetType}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value, department: '', semester: '' })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="COLLEGE">Entire College</option>
                      <option value="DEPARTMENT">Specific Department</option>
                      <option value="SEMESTER">Specific Semester</option>
                    </select>
                  </div>

                  {formData.targetType === 'DEPARTMENT' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.targetType === 'SEMESTER' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Semester</label>
                      <select
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                        required
                      >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowModal(false);
                        setFormData({
                          title: '',
                          message: '',
                          targetType: 'COLLEGE',
                          targetAudience: 'ALL',
                          department: '',
                          semester: ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create Notice</Button>
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