'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import ProfileCard from '../../components/ProfileCard';
import PhotoUpload from '../../components/PhotoUpload';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import api from '../../lib/axios';

export default function ProfilePage() {
  const { user, updateProfilePhoto } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const handlePhotoUpdate = (photo) => {
    setProfileData(prev => ({ ...prev, profilePhoto: photo }));
    updateProfilePhoto(photo);
  };

  const fetchProfileData = async () => {
    try {
      if (user.role === 'STUDENT') {
        const response = await api.get('/students/me');
        setProfileData(response.data.data);
        setSubjects(response.data.data.subjects || []);
      } else if (user.role === 'FACULTY') {
        const response = await api.get('/faculty/me');
        setProfileData(response.data.data);
        setSubjects(response.data.data.subjects || []);
      }
    } catch (error) {
      setError('Failed to fetch profile data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton.Card />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'FACULTY']}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View your profile information. Only administrators can edit profile details.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <ProfileCard 
              user={profileData?.userId || user} 
              profilePhoto={profileData?.profilePhoto}
            />
            
            {(user.role === 'STUDENT' || user.role === 'FACULTY') && profileData && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Profile Photo
                </h2>
                <PhotoUpload
                  studentId={profileData._id}
                  currentPhoto={profileData.profilePhoto}
                  onPhotoUpdate={handlePhotoUpdate}
                />
              </Card>
            )}
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Personal Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                  <p className="text-gray-900 dark:text-white">{profileData?.userId?.name || user?.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                  <p className="text-gray-900 dark:text-white">{profileData?.userId?.email || user?.email}</p>
                </div>
                
                {profileData?.userId?.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="text-gray-900 dark:text-white">{profileData.userId.phone}</p>
                  </div>
                )}
                
                {profileData?.userId?.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                    <p className="text-gray-900 dark:text-white">{profileData.userId.address}</p>
                  </div>
                )}
                
                {profileData?.userId?.dateOfBirth && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(profileData.userId.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {user.role === 'STUDENT' && profileData && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">USN</label>
                      <p className="text-gray-900 dark:text-white">{profileData.usn || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</label>
                      <p className="text-gray-900 dark:text-white">{profileData.department?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Semester</label>
                      <p className="text-gray-900 dark:text-white">{profileData.semester || 'N/A'}</p>
                    </div>
                    {profileData.admissionYear && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Admission Year</label>
                        <p className="text-gray-900 dark:text-white">{profileData.admissionYear}</p>
                      </div>
                    )}
                    {profileData.guardianName && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Guardian Name</label>
                        <p className="text-gray-900 dark:text-white">{profileData.guardianName}</p>
                      </div>
                    )}
                    {profileData.guardianPhone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Guardian Phone</label>
                        <p className="text-gray-900 dark:text-white">{profileData.guardianPhone}</p>
                      </div>
                    )}
                  </>
                )}
                
                {user.role === 'FACULTY' && profileData && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Employee ID</label>
                      <p className="text-gray-900 dark:text-white">{profileData.employeeId || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</label>
                      <p className="text-gray-900 dark:text-white">{profileData.department?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Designation</label>
                      <p className="text-gray-900 dark:text-white">{profileData.designation || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Qualification</label>
                      <p className="text-gray-900 dark:text-white">{profileData.qualification || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Experience</label>
                      <p className="text-gray-900 dark:text-white">{profileData.experience ? `${profileData.experience} years` : 'N/A'}</p>
                    </div>
                    {profileData.dateOfJoining && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Joining</label>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(profileData.dateOfJoining).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {user.role === 'STUDENT' ? 'Enrolled Subjects' : 'Assigned Subjects'}
              </h2>
              {subjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subject, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {subject.name || subject}
                      </h3>
                      {subject.subjectCode && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {subject.subjectCode}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No subjects assigned</p>
              )}
            </Card>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Profile Management
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <p>
                      Profile information can only be updated by system administrators. 
                      If you need to make changes to your profile, please contact the admin.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}