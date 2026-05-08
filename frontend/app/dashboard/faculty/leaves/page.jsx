'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline';

const LeaveTypeBadge = ({ type }) => {
  const colors = {
    MEDICAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    PERSONAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    FAMILY: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    ACADEMIC: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[type] || colors.OTHER}`}>
      {type || 'OTHER'}
    </span>
  );
};

export default function FacultyLeavesManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [showNoteFor, setShowNoteFor] = useState(null);

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  const fetchPendingLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaves/pending');
      setLeaves(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      toast.error('Failed to load pending leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status) => {
    try {
      setProcessingId(id);
      await api.put(`/leaves/${id}/review`, { 
        status,
        reviewNote: reviewNotes[id] || ''
      });
      toast.success(`Leave request ${status.toLowerCase()} successfully`);
      // Remove the reviewed leave from the list
      setLeaves(leaves.filter(leave => leave._id !== id));
      // Clear the note
      setReviewNotes(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setShowNoteFor(null);
    } catch (error) {
      console.error('Failed to review leave:', error);
      toast.error(error.response?.data?.error || 'Failed to review leave request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getDuration = (from, to) => {
    const days = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Leave Requests
            </h1>
            <div className="flex items-center gap-3">
              {leaves.length > 0 && (
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  {leaves.length} pending
                </span>
              )}
              <Button variant="outline" size="sm" onClick={fetchPendingLeaves}>
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Review and manage student leave applications
          </p>
        </motion.div>

        {leaves.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center"
          >
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-500 dark:text-gray-400">There are no pending leave requests to review at this time.</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {leaves.map((leave, index) => (
                <motion.div
                  key={leave._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        {/* Student info */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                              {leave.student?.userId?.name || 'Student'} 
                              <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                {leave.student?.usn}
                              </span>
                              <LeaveTypeBadge type={leave.leaveType} />
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                              <ClockIcon className="w-4 h-4" />
                              Applied on {formatDate(leave.createdAt)}
                              {leave.student?.department?.name && (
                                <span className="ml-2">• {leave.student.department.name}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg flex gap-3">
                            <CalendarDaysIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(leave.fromDate)} 
                                <span className="mx-2 text-gray-400">to</span> 
                                {formatDate(leave.toDate)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {getDuration(leave.fromDate, leave.toDate)}
                              </p>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg flex gap-3">
                            <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Reason</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                {leave.reason}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Optional review note input */}
                        <AnimatePresence>
                          {showNoteFor === leave._id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                <label className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1 block">
                                  Review Note (optional)
                                </label>
                                <textarea
                                  rows="2"
                                  value={reviewNotes[leave._id] || ''}
                                  onChange={(e) => setReviewNotes(prev => ({ ...prev, [leave._id]: e.target.value }))}
                                  placeholder="Add a note for the student (e.g., reason for rejection, conditions for approval)..."
                                  className="w-full px-3 py-2 text-sm border border-yellow-300 dark:border-yellow-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-3 min-w-[160px]">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-center text-gray-600"
                          onClick={() => setShowNoteFor(showNoteFor === leave._id ? null : leave._id)}
                        >
                          <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-1.5" />
                          {showNoteFor === leave._id ? 'Hide Note' : 'Add Note'}
                        </Button>
                        <Button 
                          variant="primary" 
                          className="w-full justify-center bg-green-600 hover:bg-green-700 text-white border-transparent"
                          onClick={() => handleReview(leave._id, 'APPROVED')}
                          disabled={processingId !== null}
                        >
                          {processingId === leave._id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <CheckCircleIcon className="w-5 h-5 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-900/20"
                          onClick={() => handleReview(leave._id, 'REJECTED')}
                          disabled={processingId !== null}
                        >
                          {processingId === leave._id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 mr-2" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
