'use client';
import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import { ArrowUpIcon, ArrowDownIcon, MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import api from '../../../../lib/axios';

export default function AdminFacultyPage() {
  const [faculty, setFaculty] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [retryCount, setRetryCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    department: '',
    subjects: [],
    designation: '',
    qualification: '',
    experience: '',
    phone: '',
    address: '',
    dateOfJoining: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const fetchFaculty = useCallback(async (retries = 0) => {
    try {
      setIsLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
        search,
        sortBy,
        sortOrder
      });
      const response = await api.get(`/users/faculty?${params}`);
      setFaculty(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
      setRetryCount(0);
    } catch (error) {
      if (retries < 2) {
        const delay = Math.pow(2, retries) * 1000;
        setTimeout(() => {
          setRetryCount(retries + 1);
          fetchFaculty(retries + 1);
        }, delay);
      } else {
        setError('Failed to fetch faculty data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchFaculty();
    fetchDepartments();
    fetchSubjects();
  }, [fetchFaculty]);

  async function fetchDepartments() {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  }

  async function fetchSubjects() {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch subjects');
    }
  }

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/faculty', formData);
      toast.success('Faculty added successfully!');
      setShowAddModal(false);
      setShowOptionalFields(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        employeeId: '',
        department: '',
        subjects: [],
        designation: '',
        qualification: '',
        experience: '',
        phone: '',
        address: '',
        dateOfJoining: ''
      });
      fetchFaculty();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add faculty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFaculty = (faculty) => {
    console.log('Editing faculty:', faculty); // Debug log to see data structure
    setEditingFaculty(faculty);
    
    // Handle department - it could be ObjectId, object with _id, or object with name
    let departmentValue = '';
    if (faculty.department) {
      if (typeof faculty.department === 'string') {
        // If it's a string, it could be either the ID or the name
        // Check if it matches any department ID
        const matchingDept = departments.find(d => d._id === faculty.department);
        departmentValue = matchingDept ? faculty.department : '';
        
        // If no match by ID, try to match by name
        if (!departmentValue) {
          const matchingDeptByName = departments.find(d => d.name === faculty.department);
          departmentValue = matchingDeptByName?._id || '';
        }
      } else if (faculty.department._id) {
        // It's a populated object with _id
        departmentValue = faculty.department._id;
      } else if (faculty.department.id) {
        // It's a populated object with id
        departmentValue = faculty.department.id;
      }
    }
    
    setFormData({
      name: faculty.name || '',
      email: faculty.email || '',
      password: '',
      employeeId: faculty.employeeId || '',
      department: departmentValue,
      subjects: faculty.subjects?.map(s => typeof s === 'string' ? s : s._id || s.id) || [],
      designation: faculty.designation || '',
      qualification: faculty.qualification || '',
      experience: faculty.experience || '',
      phone: faculty.phone || '',
      address: faculty.address || '',
      dateOfJoining: faculty.dateOfJoining ? faculty.dateOfJoining.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleUpdateFaculty = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log('Updating faculty with ID:', editingFaculty._id);
      console.log('Form data:', formData);
      await api.put(`/faculty/${editingFaculty._id}`, formData);
      toast.success('Faculty updated successfully!');
      setShowEditModal(false);
      setEditingFaculty(null);
      setShowOptionalFields(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        employeeId: '',
        department: '',
        subjects: [],
        designation: '',
        qualification: '',
        experience: '',
        phone: '',
        address: '',
        dateOfJoining: ''
      });
      fetchFaculty();
    } catch (error) {
      console.error('Update error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update faculty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaculty = async (member) => {
    if (!confirm(`Are you sure you want to delete ${member.name || 'this faculty member'}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete the user account (which cascades to faculty profile)
      await api.delete(`/users/${member.userId}`);
      toast.success('Faculty member deleted successfully!');
      fetchFaculty();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete faculty member');
      console.error('Error deleting faculty:', error);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const formatName = (name) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      const lastName = parts.pop();
      const firstName = parts.join(' ');
      return `${lastName}, ${firstName}`;
    }
    return name;
  };

  const exportToCSV = () => {
    const csvData = faculty.map(f => ({
      Name: formatName(f.name),
      Email: f.email,
      Department: `${f.department.name} (${f.department.code})`,
      Designation: f.designation || 'Not specified',
      Status: f.status
    }));
    
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'faculty-list.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Faculty</h1>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Faculty</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Total: {pagination.total} faculty members
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowAddModal(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Faculty
            </Button>
            <Button onClick={exportToCSV} variant="outline" disabled={faculty.length === 0}>
              Export CSV
            </Button>
            <Button onClick={() => fetchFaculty()}>
              Refresh
            </Button>
          </div>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search faculty by name, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </Card>

        {error && (
          <Card className="p-6 mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <Button onClick={() => fetchFaculty()} variant="outline">
                Retry
              </Button>
            </div>
          </Card>
        )}

        {!error && faculty.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Faculty Members</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                Get started by adding your first faculty member to the system.
              </p>
              <Button onClick={() => setShowAddModal(true)} className="mt-6">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Faculty
              </Button>
            </div>
          </Card>
        )}

        {!error && faculty.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    {[
                      { key: 'name', label: 'Faculty Name' },
                      { key: 'email', label: 'Email' },
                      { key: 'department', label: 'Department' },
                      { key: 'designation', label: 'Designation' },
                      { key: 'status', label: 'Status' },
                      { key: 'actions', label: 'Actions', sortable: false }
                    ].map((col) => (
                      <th
                        key={col.key}
                        className={`px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600' : ''} transition-colors`}
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          {col.sortable !== false && sortBy === col.key && (
                            sortOrder === 'asc' ? 
                            <ArrowUpIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> : 
                            <ArrowDownIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  {faculty.map((member, index) => (
                    <tr 
                      key={member._id} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatName(member.name)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`mailto:${member.email}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                        >
                          {member.email}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-900 dark:text-white">{member.department.name}</span>
                          <span className="text-gray-400 dark:text-gray-500 ml-1">({member.department.code})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {member.designation || <span className="text-gray-400 dark:text-gray-500 italic">Not specified</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            member.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                          {member.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditFaculty(member)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit Faculty"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFaculty(member)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Faculty"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {pagination.totalPages > 1 && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Faculty Member">
          <form onSubmit={handleAddFaculty} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Personal Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Dr. John Smith"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john.smith@university.edu"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Official university email</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">User will change on first login</p>
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Professional Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    placeholder="e.g., FAC2024001"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Subjects (Optional)
                  </label>
                  <select
                    multiple
                    value={formData.subjects}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({...formData, subjects: selected});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    size="4"
                  >
                    {subjects
                      .filter(subj => !formData.department || subj.department._id === formData.department || subj.department === formData.department)
                      .map((subj) => (
                        <option key={subj._id} value={subj._id}>
                          {subj.name} ({subj.subjectCode}) - Sem {subj.semester}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple subjects</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    placeholder="e.g., Assistant Professor"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Date of Joining <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => setFormData({...formData, dateOfJoining: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Optional Fields Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {showOptionalFields ? '− Hide' : '+ Add'} additional details (optional)
              </button>
            </div>

            {/* Optional Fields */}
            {showOptionalFields && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Highest Qualification
                    </label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                      placeholder="e.g., Ph.D. in Computer Science"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Years of Experience
                    </label>
                    <input
                      type="text"
                      value={formData.experience}
                      onChange={(e) => setFormData({...formData, experience: e.target.value})}
                      placeholder="e.g., 10 years"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="e.g., +1 (555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Full residential address"
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddModal(false);
                  setShowOptionalFields(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </span>
                ) : (
                  'Add Faculty'
                )}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Faculty Modal */}
        <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingFaculty(null); }} title="Edit Faculty Member">
          <form onSubmit={handleUpdateFaculty} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                disabled={isSubmitting}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Subjects (Optional)
              </label>
              <select
                multiple
                value={formData.subjects}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({...formData, subjects: selected});
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                size="4"
                disabled={isSubmitting}
              >
                {subjects
                  .filter(subj => !formData.department || subj.department._id === formData.department || subj.department === formData.department)
                  .map((subj) => (
                    <option key={subj._id} value={subj._id}>
                      {subj.name} ({subj.subjectCode}) - Sem {subj.semester}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple subjects</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({...formData, designation: e.target.value})}
                placeholder="e.g., Assistant Professor"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Qualification
              </label>
              <input
                type="text"
                value={formData.qualification}
                onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                placeholder="e.g., Ph.D."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="e.g., +1234567890"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowEditModal(false); setEditingFaculty(null); }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Faculty'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}