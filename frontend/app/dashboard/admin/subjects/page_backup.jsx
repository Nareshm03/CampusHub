'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import { PlusIcon, PencilIcon, TrashIcon, BookOpenIcon, AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';
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
      console.log('Enrolling students:', {
        studentIds: selectedStudents,
        subjectId: enrollingSubject._id
      });
      
      const response = await api.post('/students/enroll-subject', {
        studentIds: selectedStudents,
        subjectId: enrollingSubject._id
      });
      
      console.log('Enrollment response:', response.data);
      toast.success(`Successfully enrolled ${selectedStudents.length} students!`);
      setShowEnrollModal(false);
      setSelectedStudents([]);
      setEnrollingSubject(null);
    } catch (error) {
      console.error('Enrollment error:', error);
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

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Subjects</h1>
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
            <h1 className="text-3xl font-bold">Subjects</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Total: {subjects.length} subjects
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowAddModal(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
            <Button onClick={fetchData} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {subjects.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center justify-center py-8">
              <BookOpenIcon className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Subjects</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-4">
                Get started by creating your first subject
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subject Name</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Faculty</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  {subjects.map((subject) => (
                    <tr key={subject._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{subject.name}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">{subject.subjectCode}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{subject.department?.name || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Sem {subject.semester}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{subject.credits || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{subject.faculty?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEnroll(subject)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Enroll Students"
                          >
                            <UserGroupIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(subject)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(subject._id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Add Subject Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Subject">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Data Structures and Algorithms"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({...formData, subjectCode: e.target.value})}
                  placeholder="e.g., CS301"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Semester</option>
                  {[1,2,3,4,5,6,7,8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Credits
                </label>
                <input
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: e.target.value})}
                  placeholder="e.g., 4"
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Assign Faculty
                </label>
                <select
                  value={formData.faculty}
                  onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Faculty (Optional)</option>
                  {faculty.map(fac => (
                    <option key={fac._id} value={fac._id}>{fac.name} - {fac.department?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Subject
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Subject Modal */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Subject">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({...formData, subjectCode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Semester</option>
                  {[1,2,3,4,5,6,7,8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Credits
                </label>
                <input
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: e.target.value})}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Assign Faculty
                </label>
                <select
                  value={formData.faculty}
                  onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Faculty (Optional)</option>
                  {faculty.map(fac => (
                    <option key={fac._id} value={fac._id}>{fac.name} - {fac.department?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Subject
              </Button>
            </div>
          </form>
        </Modal>

        {/* Enroll Students Modal */}
        <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title={`Enroll Students - ${enrollingSubject?.name}`} size="lg">
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Subject Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-600 dark:text-gray-400">Code:</span> <span className="font-medium">{enrollingSubject?.subjectCode}</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Semester:</span> <span className="font-medium">{enrollingSubject?.semester}</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Department:</span> <span className="font-medium">{enrollingSubject?.department?.name}</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Credits:</span> <span className="font-medium">{enrollingSubject?.credits || 'N/A'}</span></div>
              </div>
            </div>

            {getEligibleStudents().length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400">No eligible students found for this subject</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Students must be in {enrollingSubject?.department?.name} department, Semester {enrollingSubject?.semester}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedStudents.length} of {getEligibleStudents().length} students selected
                  </p>
                  <Button
                    variant="outline"
                    onClick={toggleSelectAll}
                    size="sm"
                  >
                    {selectedStudents.length === getEligibleStudents().length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 sticky top-0">
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase w-12">
                          <input
                            type="checkbox"
                            checked={selectedStudents.length === getEligibleStudents().length && getEligibleStudents().length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">USN</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Email</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900">
                      {getEligibleStudents().map((student) => (
                        <tr 
                          key={student._id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150 cursor-pointer"
                          onClick={() => toggleStudentSelection(student._id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student._id)}
                              onChange={() => toggleStudentSelection(student._id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{student.userId?.name || student.name}</td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">{student.usn}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{student.userId?.email || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEnrollModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleEnrollStudents}
                    disabled={selectedStudents.length === 0}
                  >
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