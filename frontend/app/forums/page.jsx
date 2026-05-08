'use client';

import { Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import DiscussionForum from '@/components/DiscussionForum';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function ForumsPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSkeleton />}>
        {user?.department && (
          <DiscussionForum departmentId={user.department._id || user.department} />
        )}
      </Suspense>
    </ProtectedRoute>
  );
}
