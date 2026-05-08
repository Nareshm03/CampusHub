'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import { PlusIcon, PencilIcon, UserIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import api from '../../../../lib/axios';

export default function ProfileManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, facultyRes, deptRes] = await Promise.all([
        api.get('/students').catch(() => ({ data: { data: [] } })),
        api.get('/faculty').catch(() => ({ data: { data: [] } })),
        api.get('/departments').catch(() => ({ data: { data: [] } }))
      ]);
      
      setStudents(studentsRes.data.data || []);
      setFaculty(facultyRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setStudents([]);
      setFaculty([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, profile = null) => {
    setModalType(type);
    setEditingProfile(profile);
    
    if (profile) {
      if (type === 'student') {
        setFormData({
          name: profile.userId?.name || '',
          email: profile.userId?.email || '',
          usn: profile.usn,
          department: profile.department._id,
          semester: profile.semester,
          phone: profile.phone || '',
          address: profile.address || '',
          guardianName: profile.guardianName || '',
          guardianPhone: profile.guardianPhone || '',
          admissionYear: profile.admissionYear || ''
        });
      } else {
        setFormData({
          name: profile.userId?.name || '',
          email: profile.userId?.email || '',
          employeeId: profile.employeeId,
          department: profile.department._id,
          designation: profile.designation,
          qualification: profile.qualification,
          experience: profile.experience,
          phone: profile.phone || '',
          address: profile.address || '',
          dateOfJoining: profile.dateOfJoining ? profile.dateOfJoining.split('T')[0] : ''
        });
      }
    } else {
      // Initialize form for new profile creation
      if (type === 'student') {
        setFormData({
          name: '',
          email: '',
          password: '',
          usn: '',
          department: '',
          semester: '',
          phone: '',
          address: '',
          guardianName: '',
          guardianPhone: '',
          admissionYear: ''
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          employeeId: '',
          department: '',
          designation: '',
          qualification: '',
          experience: '',
          phone: '',
          address: '',
          dateOfJoining: ''
        });
      }
    }
    
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const endpoint = modalType === 'student' ? '/students' : '/faculty';
      
      if (editingProfile) {
        await api.put(`${endpoint}/${editingProfile._id}`, formData);
        toast.success(`${modalType} profile updated successfully`);
      } else {
        await api.post(endpoint, formData);
        toast.success(`${modalType} profile created successfully`);
      }
      
      setShowModal(false);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Operation failed';
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage student and faculty profiles with complete details.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AcademicCapIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Students ({students.length})
                </h2>
              </div>
              <Button
                onClick={() => openModal('student')}
                className="flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Add Student
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div key={student._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {student.userId.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {student.usn} • {student.department.name} • Sem {student.semester}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModal('student', student)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {students.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No student profiles created yet
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Faculty ({faculty.length})
                </h2>
              </div>
              <Button
                onClick={() => openModal('faculty')}
                className="flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Add Faculty
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {faculty.map((fac) => (
                <div key={fac._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {fac.userId.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {fac.employeeId} • {fac.designation} • {fac.department.name}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModal('faculty', fac)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {faculty.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No faculty profiles created yet
                </p>
              )}
            </div>
          </Card>
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`${editingProfile ? 'Edit' : 'Create'} ${modalType === 'student' ? 'Student' : 'Faculty'} Profile`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {modalType === 'student' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password {editingProfile && <span className="text-xs text-gray-500">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingProfile}
                    minLength="6"
                    placeholder={editingProfile ? "Enter new password to change" : ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    USN
                  </label>
                  <input
                    type="text"
                    value={formData.usn || ''}
                    onChange={(e) => setFormData({...formData, usn: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Semester
                  </label>
                  <select
                    value={formData.semester || ''}
                    onChange={(e) => setFormData({...formData, semester: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Semester</option>
                    {[1,2,3,4,5,6,7,8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admission Year
                  </label>
                  <input
                    type="number"
                    value={formData.admissionYear || ''}
                    onChange={(e) => setFormData({...formData, admissionYear: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="2000"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName || ''}
                    onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Guardian Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.guardianPhone || ''}
                    onChange={(e) => setFormData({...formData, guardianPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    pattern="[0-9]{10}"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password {editingProfile && <span className="text-xs text-gray-500">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingProfile}
                    minLength="6"
                    placeholder={editingProfile ? "Enter new password to change" : ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId || ''}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={formData.qualification || ''}
                    onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    value={formData.experience || ''}
                    onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfJoining || ''}
                    onChange={(e) => setFormData({...formData, dateOfJoining: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </>
            )}



            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                pattern="[0-9]{10}"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <textarea
                value={formData.address || ''}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingProfile ? 'Update' : 'Create'} Profile
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}