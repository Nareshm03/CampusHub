'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, validateToken, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (loading) {
      setShouldRender(false);
      return;
    }
    
    // Check if token is still valid
    if (!validateToken()) {
      setShouldRender(false);
      if (pathname !== '/login' && pathname !== '/register') {
        logout();
      }
      return;
    }
    
    if (!user) {
      setShouldRender(false);
      if (pathname !== '/login' && pathname !== '/register') {
        router.replace('/login');
      }
      return;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      setShouldRender(false);
      const roleDefault = {
        ADMIN: '/dashboard/admin',
        FACULTY: '/dashboard/faculty', 
        STUDENT: '/dashboard/student'
      }[user.role] || '/dashboard';
      if (pathname !== roleDefault) {
        router.replace(roleDefault);
      }
      return;
    }
    
    setShouldRender(true);
  }, [user, loading, router, allowedRoles, pathname, validateToken, logout]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!shouldRender) {
    return null;
  }

  return children;
};

export default ProtectedRoute;
