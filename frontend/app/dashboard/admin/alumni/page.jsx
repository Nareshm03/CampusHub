'use client';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import AlumniManagement from '../../../../components/AlumniManagement';

export default function AlumniPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Alumni Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage student graduation and track alumni information.
          </p>
        </div>
        
        <AlumniManagement />
      </div>
    </ProtectedRoute>
  );
}