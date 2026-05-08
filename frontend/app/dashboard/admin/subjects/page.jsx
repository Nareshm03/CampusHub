'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BookOpenIcon, 
  AcademicCapIcon, 
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import api from '../../../../lib/axios';

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [enrollingSubject, setEnrollingSubject] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    subjectCode: '',
    department: '',
    semester: '',
    credits: '',
    faculty: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectsRes, departmentsRes, facultyRes, studentsRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/departments'),
        api.get('/users/faculty'),
        api.get('/students')
      ]);
      
      setSubjects(subjectsRes.data.data || []);
      setDepartments(departmentsRes.data.data || []);
      setFaculty(facultyRes.data.data || []);
      setStudents(studentsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subjects', formData);
      toast.success('Subject created successfully!');
      setShowAddModal(false);
      setFormData({
        name: '',
        subjectCode: '',
        department: '',
        semester: '',
        credits: '',
        faculty: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create subject');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/subjects/${editingSubject._id}`, formData);
      toast.success('Subject updated successfully!');
      setShowEditModal(false);
      setEditingSubject(null);
      setFormData({
        name: '',
        subjectCode: '',
        department: '',
        semester: '',
        credits: '',
        faculty: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update subject');
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      subjectCode: subject.subjectCode,
      department: subject.department?._id || '',
      semester: subject.semester,
      credits: subject.credits || '',
      faculty: subject.faculty?._id || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      try {
        await api.delete(`/subjects/${id}`);
        toast.success('Subject deleted successfully!');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete subject');
      }
    }
  };

  const handleEnroll = (subject) => {
    setEnrollingSubject(subject);
    setSelectedStudents([]);
    setShowEnrollModal(true);
  };

  const handleEnrollStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      await api.post('/students/enroll-subject', {
        studentIds: selectedStudents,
        subjectId: enrollingSubject._id
      });
      
      toast.success(`Successfully enrolled ${selectedStudents.length} students!`);
      setShowEnrollModal(false);
      setSelectedStudents([]);
      setEnrollingSubject(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to enroll students');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    const eligibleStudents = getEligibleStudents();
    if (selectedStudents.length === eligibleStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(eligibleStudents.map(s => s._id));
    }
  };

  const getEligibleStudents = () => {
    if (!enrollingSubject) return [];
    return students.filter(student => 
      student.department?._id === enrollingSubject.department?._id &&
      student.semester === enrollingSubject.semester
    );
  };

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDept || subject.department?._id === filterDept;
    const matchesSem = !filterSem || subject.semester === parseInt(filterSem);
    return matchesSearch && matchesDept && matchesSem;
  });

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading subjects...</p>
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
                <BookOpenIcon className="w-10 h-10 text-blue-600" />
                Subjects
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage academic subjects and course enrollment
              </p>
            </div>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Subject
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Subjects</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{subjects.length}</p>
              </div>
              <BookOpenIcon className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Departments</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">{departments.length}</p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">With Faculty</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                  {subjects.filter(s => s.faculty).length}
                </p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Avg. Credits</p>
                <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                  {subjects.length > 0 ? (subjects.reduce((acc, s) => acc + (s.credits || 0), 0) / subjects.length).toFixed(1) : '0'}
                </p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-amber-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>

            <select
              value={filterSem}
              onChange={(e) => setFilterSem(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Subjects Grid */}
        {filteredSubjects.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpenIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm || filterDept || filterSem ? 'No subjects found' : 'No subjects yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || filterDept || filterSem 
                ? 'Try adjusting your filters' 
                : 'Get started by adding your first subject'}
            </p>
            {!searchTerm && !filterDept && !filterSem && (
              <Button onClick={() => setShowAddModal(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Subject
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => (
              <Card 
                key={subject._id} 
                className="group hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden border-l-4 border-l-blue-600"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-mono font-semibold">
                          {subject.subjectCode}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                          Sem {subject.semester}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-2">
                        {subject.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {subject.department?.name || 'No Department'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Credits</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{subject.credits || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Faculty</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{subject.faculty?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Enrolled Students</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{subject.enrolledCount || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleEnroll(subject)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors font-medium text-sm"
                    >
                      <UserGroupIcon className="w-4 h-4" />
                      Enroll
                    </button>
                    <button
                      onClick={() => handleEdit(subject)}
                      className="flex items-center justify-center px-3 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(subject._id)}
                      className="flex items-center justify-center px-3 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Modals - keeping original logic */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Subject">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({...formData, subjectCode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Credits</label>
                <input
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Department <span className="text-red-500">*</span></label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Semester <span className="text-red-500">*</span></label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Semester</option>
                  {[1,2,3,4,5,6,7,8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Faculty (Optional)</label>
              <select
                value={formData.faculty}
                onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Faculty</option>
                {faculty.map(f => (
                  <option key={f._id} value={f.userId || f._id}>{f.name || f.userId?.name || 'Unnamed'}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit">Add Subject</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Subject">
          <form onSubmit={handleUpdate} className="space-y-4">
            {/* Same form fields as add modal */}
            <div>
              <label className="block text-sm font-medium mb-2">Subject Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({...formData, subjectCode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Credits</label>
                <input
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Department <span className="text-red-500">*</span></label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Semester <span className="text-red-500">*</span></label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Semester</option>
                  {[1,2,3,4,5,6,7,8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Faculty (Optional)</label>
              <select
                value={formData.faculty}
                onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Faculty</option>
                {faculty.map(f => (
                  <option key={f._id} value={f.userId || f._id}>{f.name || f.userId?.name || 'Unnamed'}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit">Update Subject</Button>
            </div>
          </form>
        </Modal>

        {/* Enroll Modal */}
        <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title="Enroll Students">
          <div className="space-y-4">
            {enrollingSubject && (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">{enrollingSubject.name}</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {enrollingSubject.department?.name} - Semester {enrollingSubject.semester}
                  </p>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === getEligibleStudents().length && getEligibleStudents().length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    Select All ({getEligibleStudents().length} students)
                  </label>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {getEligibleStudents().map(student => (
                    <div
                      key={student._id}
                      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => toggleStudentSelection(student._id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => {}}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{student.userId?.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{student.rollNumber}</p>
                      </div>
                    </div>
                  ))}
                  {getEligibleStudents().length === 0 && (
                    <p className="text-center text-gray-500 py-8">No eligible students found</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowEnrollModal(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleEnrollStudents} className="flex-1">
                    Enroll {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
