'use client';
import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { 
  PlusIcon, 
  TicketIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const TicketManagement = () => {
  const { user, loading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium'
  });
  const [updateData, setUpdateData] = useState({
    status: '',
    assignedTo: '',
    response: ''
  });

  const categories = [
    { value: 'timetable', label: 'Timetable Issue' },
    { value: 'classroom', label: 'Classroom Issue' },
    { value: 'teacher', label: 'Teacher Related' },
    { value: 'washroom', label: 'Washroom/Sanitation' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'it_support', label: 'IT Support' },
    { value: 'academic', label: 'Academic' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'transport', label: 'Transport' },
    { value: 'library', label: 'Library' },
    { value: 'canteen', label: 'Canteen/Food' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  const statuses = [
    { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
    { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' }
  ];

  useEffect(() => {
    if (!loading && user) fetchTickets();
  }, [user, loading]);

  const fetchTickets = async () => {
    try {
      // Admin sees all tickets, others see only their own
      const endpoint = user?.role === 'ADMIN' ? '/tickets' : '/tickets/my';
      const response = await axios.get(endpoint);
      setTickets(response.data.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/tickets', formData);
      setFormData({ title: '', description: '', category: 'other', priority: 'medium' });
      setShowForm(false);
      fetchTickets();
      toast.success('Ticket created successfully!');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/tickets/${selectedTicket._id}`, updateData);
      setShowUpdateModal(false);
      setSelectedTicket(null);
      setUpdateData({ status: '', assignedTo: '', response: '' });
      fetchTickets();
      toast.success('Ticket updated successfully!');
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    }
  };

  const openUpdateModal = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateData({
      status: ticket.status,
      assignedTo: ticket.assignedTo?._id || '',
      response: ''
    });
    setShowUpdateModal(true);
  };

  const getStatusColor = (status) => {
    return statuses.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    return priorities.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <TicketIcon className="w-10 h-10 text-blue-600" />
              {user?.role === 'ADMIN' ? 'Support Tickets' : 'My Tickets'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {user?.role === 'ADMIN' 
                ? 'Manage and resolve all support requests' 
                : 'Create and track your support requests'}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create Ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Tickets</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{tickets.length}</p>
            </div>
            <TicketIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Open</p>
              <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 mt-1">
                {tickets.filter(t => t.status === 'open').length}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">In Progress</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                {tickets.filter(t => t.status === 'in_progress').length}
              </p>
            </div>
            <ExclamationCircleIcon className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Resolved</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
              </p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <TicketIcon className="w-6 h-6 text-blue-600" />
                Create Support Ticket
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {priorities.map(pri => (
                        <option key={pri.value} value={pri.value}>{pri.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="4"
                    placeholder="Provide detailed information about the issue..."
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
                  >
                    Create Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Grid */}
      <div className="grid gap-6">
        {tickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <TicketIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tickets found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {user?.role === 'ADMIN' 
                ? 'No support tickets have been submitted yet' 
                : 'Create a ticket to report an issue or request support'}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create Your First Ticket
            </button>
          </div>
        ) : (
          tickets.map(ticket => (
            <div 
              key={ticket._id} 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 border-l-4 border border-gray-200 dark:border-gray-700 overflow-hidden"
              style={{ borderLeftColor: 
                ticket.priority === 'urgent' ? '#ef4444' :
                ticket.priority === 'high' ? '#f97316' :
                ticket.priority === 'medium' ? '#eab308' : '#22c55e'
              }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-gray-500 dark:text-gray-400">#{ticket.ticketId}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{ticket.title}</h3>
                    {user?.role === 'ADMIN' && ticket.submittedBy && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        <span>Submitted by: <strong>{ticket.submittedBy.name}</strong> ({ticket.submittedBy.email})</span>
                      </div>
                    )}
                  </div>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => openUpdateModal(ticket)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      Update Status
                    </button>
                  )}
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">{ticket.description}</p>
                
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                    {categories.find(c => c.value === ticket.category)?.label || ticket.category}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    {ticket.resolvedAt && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="w-4 h-4" />
                        Resolved: {new Date(ticket.resolvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Update Modal for Admin */}
      {showUpdateModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Update Ticket #{selectedTicket.ticketId}</h2>
            <form onSubmit={handleUpdateTicket}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData({...updateData, status: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  {statuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Admin Response (Optional)</label>
                <textarea
                  value={updateData.response}
                  onChange={(e) => setUpdateData({...updateData, response: e.target.value})}
                  className="w-full p-2 border rounded-lg h-24"
                  placeholder="Add a response or note..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedTicket(null);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketManagement;