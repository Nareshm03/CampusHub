'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    hod: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchFaculty();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments');
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const response = await api.get('/faculty');
      console.log('Faculty data:', response.data);
      setFaculty(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
      toast.error('Failed to load faculty list');
    }
  };

  const handleOpenModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        code: dept.code,
        description: dept.description || '',
        hod: dept.hod?._id || ''
      });
    } else {
      setEditingDept(null);
      setFormData({ name: '', code: '', description: '', hod: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormData({ name: '', code: '', description: '', hod: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDept) {
        // Update department
        await api.put(`/departments/${editingDept._id}`, formData);
        toast.success('Department updated successfully');
      } else {
        // Create department
        await api.post('/departments', formData);
        toast.success('Department created successfully');
      }
      
      handleCloseModal();
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deptId) => {
    if (!confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      await api.delete(`/departments/${deptId}`);
      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete department');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading departments...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BuildingOfficeIcon className="w-10 h-10 text-blue-600" />
                Departments
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage all academic departments and assign HODs
              </p>
            </div>
            <Button 
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Department
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Departments</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{departments.length}</p>
              </div>
              <div className="p-3 bg-blue-600 rounded-lg">
                <BuildingOfficeIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">With HODs</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                  {departments.filter(d => d.hod).length}
                </p>
              </div>
              <div className="p-3 bg-green-600 rounded-lg">
                <UserGroupIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Active Programs</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">{departments.length}</p>
              </div>
              <div className="p-3 bg-purple-600 rounded-lg">
                <AcademicCapIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </Card>

        {/* Departments Grid */}
        {filteredDepartments.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <BuildingOfficeIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No departments found' : 'No departments yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Get started by creating your first department'}
              </p>
              {!searchTerm && (
                <Button onClick={() => handleOpenModal()}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create First Department
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map((dept) => (
              <Card 
                key={dept._id} 
                className="group hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden border-l-4 border-l-blue-600"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <AcademicCapIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-mono font-semibold">
                          {dept.code}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                        {dept.name}
                      </h3>
                    </div>
                  </div>

                  {/* HOD Info */}
                  {dept.hod ? (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <UserGroupIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <div className="flex-1">
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Head of Department</p>
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                            {dept.hod.userId?.name || dept.hod.name || 'N/A'}
                          </p>
                          {dept.hod.employeeId && (
                            <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                              {dept.hod.employeeId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">No HOD assigned</p>
                    </div>
                  )}

                  {/* Description */}
                  {dept.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {dept.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleOpenModal(dept)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors font-medium"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dept._id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors font-medium"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BuildingOfficeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span>{editingDept ? 'Edit Department' : 'Create New Department'}</span>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Basic Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Information Science and Engineering"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono font-semibold"
                    placeholder="e.g., ISE"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  placeholder="Brief description about the department..."
                  disabled={submitting}
                />
              </div>
            </div>

            {/* HOD Assignment Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="w-1 h-5 bg-green-600 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Head of Department
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Select HOD (Optional)
                </label>
                <select
                  value={formData.hod}
                  onChange={(e) => setFormData({ ...formData, hod: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={submitting}
                >
                  <option value="">-- No HOD Selected --</option>
                  {faculty.length === 0 ? (
                    <option disabled>No faculty members available</option>
                  ) : (
                    faculty.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.userId?.name || f.name || 'Unnamed'} 
                        {f.employeeId ? ` (${f.employeeId})` : ''}
                        {f.department?.name ? ` - ${f.department.name}` : ''}
                      </option>
                    ))
                  )}
                </select>
                {faculty.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <span>⚠️</span>
                    Add faculty members first to assign as HOD
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {editingDept ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingDept ? (
                      <>
                        <PencilIcon className="w-5 h-5 mr-2" />
                        Update Department
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Create Department
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}