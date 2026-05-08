'use client';

import { Suspense } from 'react';
import AcademicCalendar from '@/components/AcademicCalendar';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSkeleton />}>
        <AcademicCalendar />
      </Suspense>
    </ProtectedRoute>
  );
}
