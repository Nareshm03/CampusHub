'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  XMarkIcon, 
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import api from '../../lib/axios';

const LEAVE_TYPES = [
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'OTHER', label: 'Other' }
];

const StatusBadge = ({ status }) => {
  const config = {
    PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: ClockIcon },
    APPROVED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircleIcon },
    REJECTED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: XCircleIcon }
  };
  const { bg, text, icon: Icon } = config[status] || config.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
};

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
      {type}
    </span>
  );
};

export default function StudentLeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    fromDate: '',
    toDate: '',
    leaveType: 'OTHER'
  });

  useEffect(() => {
    if (user) fetchLeaves();
  }, [user]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leaves/my');
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      toast.error('Failed to load your leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for your leave');
      return;
    }
    if (!formData.fromDate || !formData.toDate) {
      toast.error('Please select both from and to dates');
      return;
    }
    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      toast.error('From date must be before or equal to to date');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/leaves', formData);
      toast.success('Leave request submitted successfully!');
      setShowForm(false);
      setFormData({ reason: '', fromDate: '', toDate: '', leaveType: 'OTHER' });
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getDuration = (from, to) => {
    const days = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'PENDING').length,
    approved: leaves.filter(l => l.status === 'APPROVED').length,
    rejected: leaves.filter(l => l.status === 'REJECTED').length
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Submit and track your leave requests</p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Apply for Leave
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total', value: stats.total, color: 'blue' },
            { label: 'Pending', value: stats.pending, color: 'yellow' },
            { label: 'Approved', value: stats.approved, color: 'green' },
            { label: 'Rejected', value: stats.rejected, color: 'red' }
          ].map((stat) => (
            <Card key={stat.label} className={`p-4 border-l-4 border-l-${stat.color}-500`}>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
            </Card>
          ))}
        </motion.div>

        {/* Apply Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="p-6 border-2 border-primary-200 dark:border-primary-800">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Apply for Leave</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.leaveType}
                      onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {LEAVE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows="3"
                      placeholder="Please provide a detailed reason for your leave request..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        From Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.fromDate}
                        onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        To Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.toDate}
                        onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                        min={formData.fromDate || new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Duration Preview */}
                  {formData.fromDate && formData.toDate && new Date(formData.fromDate) <= new Date(formData.toDate) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <CalendarDaysIcon className="w-4 h-4" />
                      Duration: <strong>{getDuration(formData.fromDate, formData.toDate)}</strong>
                      ({formatDate(formData.fromDate)} to {formatDate(formData.toDate)})
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leave List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Leave Requests</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">You haven&apos;t submitted any leave requests yet.</p>
              <Button onClick={() => setShowForm(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Apply for Leave
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {leaves.map((leave, index) => (
                <motion.div
                  key={leave._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={leave.status} />
                          <LeaveTypeBadge type={leave.leaveType || 'OTHER'} />
                        </div>
                        
                        <p className="text-gray-900 dark:text-white font-medium">{leave.reason}</p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <CalendarDaysIcon className="w-4 h-4" />
                            {formatDate(leave.fromDate)} — {formatDate(leave.toDate)}
                          </span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {getDuration(leave.fromDate, leave.toDate)}
                          </span>
                        </div>

                        {/* Review info */}
                        {leave.status !== 'PENDING' && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                            {leave.reviewedBy && (
                              <p>Reviewed by: <span className="font-medium text-gray-700 dark:text-gray-300">{leave.reviewedBy.name}</span></p>
                            )}
                            {leave.reviewNote && (
                              <p>Note: <span className="italic text-gray-600 dark:text-gray-400">&ldquo;{leave.reviewNote}&rdquo;</span></p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        <ClockIcon className="w-3.5 h-3.5 inline mr-1" />
                        Applied {formatDate(leave.createdAt)}
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