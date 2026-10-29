'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import axios from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

// Parent view of the APPROVED linked child's assignments, backed by the
// existing GET /parent/child/assignments contract (assignment details plus
// the child's own submission with grade/feedback). Read-only: no submit,
// grade, or close controls exist here by design.
export default function ParentAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/parent/child/assignments');
      setAssignments(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['PARENT']}>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Loading assignments...
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['PARENT']}>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardDocumentListIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold">Child&apos;s Assignments</h1>
            <p className="text-gray-500 text-sm">Assignments and submission status for your linked child</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error}{' '}
              <button onClick={fetchAssignments} className="underline font-medium">Retry</button>
            </AlertDescription>
          </Alert>
        )}

        {assignments.length === 0 && !error ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No assignments found for your child
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => (
              <Card key={a._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{a.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {a.subject?.name || ''} • Due: {formatDate(a.dueDate)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {a.isOverdue && <Badge variant="danger">Overdue</Badge>}
                      {a.submission ? (
                        <Badge variant={a.submission.grade != null ? 'success' : 'info'}>
                          {a.submission.grade != null ? `Graded: ${a.submission.grade}` : 'Submitted'}
                        </Badge>
                      ) : (
                        <Badge variant="default">Not submitted</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {a.description && <p className="text-gray-700 dark:text-gray-300">{a.description}</p>}
                  {a.submission?.submittedAt && (
                    <p className="text-gray-500">Submitted: {formatDate(a.submission.submittedAt)}</p>
                  )}
                  {a.submission?.feedback && (
                    <p className="text-gray-600 dark:text-gray-400">Feedback: {a.submission.feedback}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
