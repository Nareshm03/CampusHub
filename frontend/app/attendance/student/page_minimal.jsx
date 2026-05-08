'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../../components/ui/Card';
import { PageLoader } from '../../../components/ui/Loading';

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <PageLoader message="Loading attendance data..." />;

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container py-8">
        <h1 className="text-3xl font-bold">My Attendance</h1>
        <Card className="p-6 mt-6">
          <p>Attendance page is being rebuilt...</p>
        </Card>
      </div>
    </ProtectedRoute>
  );
}