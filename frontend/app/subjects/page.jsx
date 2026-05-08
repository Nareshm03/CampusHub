'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function SubjectsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/admin/subjects');
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    </ProtectedRoute>
  );
}