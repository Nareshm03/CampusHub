'use client';
import { useState, useEffect } from 'react';
import { 
  CogIcon, 
  CalendarIcon, 
  AcademicCapIcon, 
  CheckIcon,
  Cog6ToothIcon,
  ClockIcon,
  ChartBarIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import api from '../../../../lib/axios';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import { toast } from 'sonner';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import ChangePasswordModal from '../../../../components/ui/ChangePasswordModal';


export default function SystemSettings() {
  const [settings, setSettings] = useState({
    academicYear: '2024-25',
    currentSemester: 1,
    gradingScale: 'CGPA',
    passingMarks: 40,
    maxMarks: 100,
    attendanceRequired: 75,
    semesterStartDate: '',
    semesterEndDate: '',
    examStartDate: '',
    examEndDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSettings = async (section) => {
    setLoading(true);
    try {
      await api.put('/admin/settings', { section, data: settings });
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
            <Cog6ToothIcon className="w-10 h-10 text-blue-600" />
            System Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Configure academic year, grading system, and college settings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Academic Year</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{settings.academicYear}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Current Semester</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">Sem {settings.currentSemester}</p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Grading Scale</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{settings.gradingScale}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Academic Year Configuration */}
          <Card className="overflow-hidden border-l-4 border-l-blue-600">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Academic Year Configuration</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage academic calendar and semester dates</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.academicYear}
                    onChange={(e) => handleChange('academicYear', e.target.value)}
                    placeholder="2024-25"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={settings.currentSemester}
                    onChange={(e) => handleChange('currentSemester', parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[1,2,3,4,5,6,7,8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semester Start Date
                  </label>
                  <input
                    type="date"
                    value={settings.semesterStartDate}
                    onChange={(e) => handleChange('semesterStartDate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semester End Date
                  </label>
                  <input
                    type="date"
                    value={settings.semesterEndDate}
                    onChange={(e) => handleChange('semesterEndDate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                <Button 
                  onClick={() => updateSettings('academic')} 
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Save Academic Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Grading System */}
          <Card className="overflow-hidden border-l-4 border-l-green-600">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                  <AcademicCapIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Grading System</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Configure grading scale and assessment criteria</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Grading Scale <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={settings.gradingScale}
                    onChange={(e) => handleChange('gradingScale', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="CGPA">CGPA (10 Point)</option>
                    <option value="GPA">GPA (4 Point)</option>
                    <option value="PERCENTAGE">Percentage</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Passing Marks <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.passingMarks}
                    onChange={(e) => handleChange('passingMarks', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Marks <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.maxMarks}
                    onChange={(e) => handleChange('maxMarks', parseInt(e.target.value))}
                    min="1"
                    max="200"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Required Attendance (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.attendanceRequired}
                    onChange={(e) => handleChange('attendanceRequired', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                <Button 
                  onClick={() => updateSettings('grading')} 
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Save Grading Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Account Security — Change Password */}
          <Card className="overflow-hidden border-l-4 border-l-purple-600">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <KeyIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Account Security</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Update your admin account password</p>
                  </div>
                </div>
                <button
                  onClick={() => setChangePasswordOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow hover:shadow-md transition-all duration-200"
                >
                  <KeyIcon className="w-4 h-4" />
                  Change Password
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </ProtectedRoute>
  );
}