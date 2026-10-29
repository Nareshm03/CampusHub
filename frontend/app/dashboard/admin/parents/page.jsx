'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import { UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewing, setReviewing] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [parentsRes, requestsRes] = await Promise.all([
        api.get('/parent/all'),
        api.get('/parent/link-requests?status=PENDING')
      ]);
      setParents(parentsRes.data.data || []);
      setRequests(requestsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch parents:', error);
      toast.error('Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = fetchData;

  const handleReview = async (id, decision) => {
    let note;
    if (decision === 'REJECTED') {
      const input = window.prompt('Reason for rejection (optional):');
      if (input === null) return; // cancelled
      note = input || undefined;
    }
    try {
      setReviewing(id);
      await api.put(`/parent/link-requests/${id}/review`, { decision, ...(note ? { adminNote: note } : {}) });
      toast.success(decision === 'APPROVED' ? 'Link request approved' : 'Link request rejected');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to review request');
    } finally {
      setReviewing(null);
    }
  };

  const filteredParents = parents.filter(parent =>
    parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.studentDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.studentDetails?.usn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Parents</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage parent accounts and their linked students
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className="font-bold">{parents.length}</span>
            </span>
          </div>
        </div>

        <Card className="mb-6">
          <div className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by parent name, email, student name, or USN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {/* Pending link requests — approve/reject binds or leaves the child */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Pending Link Requests ({requests.length})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            A parent sees child data only after you approve their request.
          </p>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {req.parentUser?.name} <span className="font-normal text-gray-500">({req.parentUser?.email})</span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Requests USN: <span className="font-mono font-semibold">{req.usn}</span>
                      {req.student?.userId?.name ? (
                        <> — matches <span className="font-semibold">{req.student.userId.name}</span></>
                      ) : (
                        <> — <span className="text-amber-600 dark:text-amber-400">no matching student record</span></>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">Submitted {new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      disabled={reviewing === req._id}
                      onClick={() => handleReview(req._id, 'APPROVED')}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={reviewing === req._id}
                      onClick={() => handleReview(req._id, 'REJECTED')}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {filteredParents.length === 0 ? (
          <Card className="p-12 text-center">
            <UserPlusIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No parents found' : 'No parents registered'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'Parent accounts will appear here once registered'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParents.map((parent) => (
              <Card key={parent._id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {parent.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {parent.email}
                    </p>
                    {parent.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        📞 {parent.phone}
                      </p>
                    )}
                  </div>
                </div>

                {parent.studentDetails ? (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Linked Student
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {parent.studentDetails.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {parent.studentDetails.usn}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {parent.studentDetails.department} • Sem {parent.studentDetails.semester}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      ⚠️ No student linked
                    </p>
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Joined: {new Date(parent.createdAt).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
