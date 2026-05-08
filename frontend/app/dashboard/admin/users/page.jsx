'use client';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';

export default function AdminUsersPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>
        <Card className="p-6">
          <p className="text-gray-600 dark:text-gray-400">User management functionality coming soon.</p>
        </Card>
      </div>
    </ProtectedRoute>
  );
}