'use client';
import { UserIcon } from '@heroicons/react/24/outline';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { getProfilePhotoUrl } from '../lib/imageUtils';

const ProfileCard = ({ user, profilePhoto }) => {
  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'STUDENT': return 'info';
      case 'FACULTY': return 'success';
      case 'ADMIN': return 'danger';
      default: return 'info';
    }
  };

  return (
    <Card className="p-6 text-center">
      <div className="w-32 h-32 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 overflow-hidden">
        {profilePhoto ? (
          <img 
            src={getProfilePhotoUrl(profilePhoto)} 
            alt="Profile" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
            }}
          />
        ) : (
          <UserIcon className="w-16 h-16 text-gray-400" />
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {user?.name || 'N/A'}
      </h3>
      
      <Badge variant={getRoleBadgeVariant(user?.role)} className="mb-4">
        {user?.role || 'N/A'}
      </Badge>
      
      {user?.role === 'STUDENT' && user?.usn && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          USN: {user.usn}
        </p>
      )}
      
      {user?.email && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {user.email}
        </p>
      )}
    </Card>
  );
};

export default ProfileCard;