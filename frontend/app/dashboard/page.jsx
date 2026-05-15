'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const roleRoutes = {
        STUDENT: '/dashboard/student',
        FACULTY: '/dashboard/faculty',
        ADMIN: '/dashboard/admin',
        PARENT: '/dashboard/parent'
      };
      
      const route = roleRoutes[user.role] || '/';
      router.replace(route);
    } else if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
