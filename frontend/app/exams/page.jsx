'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { toast } from 'react-hot-toast';

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState('register');
  const [exams, setExams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, total: 1 });
  const [filters, setFilters] = useState({ semester: '', department: '' });
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [activeTab, pagination.current, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const promises = [];
      
      if (activeTab === 'register') {
        const params = new URLSearchParams({
          page: pagination.current,
          limit: 10,
          ...filters
        });
        promises.push(axios.get(`/exams/available?${params}`));
      }
      
      if (activeTab === 'registrations') {
        promises.push(axios.get(`/exams/my-registrations?page=${pagination.current}&limit=10`));
      }
      
      if (activeTab === 'results') {
        promises.push(axios.get(`/exams/results?page=${pagination.current}&limit=10`));
      }
      
      const responses = await Promise.all(promises);
      
      if (activeTab === 'register') {
        setExams(responses[0].data.exams || []);
        setPagination(responses[0].data.pagination || { current: 1, total: 1 });
      } else if (activeTab === 'registrations') {
        setRegistrations(responses[0].data.registrations || []);
        setPagination(responses[0].data.pagination || { current: 1, total: 1 });
      } else if (activeTab === 'results') {
        setResults(responses[0].data.results || []);
        setPagination(responses[0].data.pagination || { current: 1, total: 1 });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (examId) => {
    router.push(`/exams/register/${examId}`);
  };

  const handlePayFee = async (registrationId, fee) => {
    try {
      // Simulate payment gateway integration
      const confirmed = window.confirm(`Pay ₹${fee} for exam registration?`);
      if (!confirmed) return;
      
      const paymentId = `PAY${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      await axios.post('/exams/pay-fee', { registrationId, paymentId });
      
      toast.success('Payment successful!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment failed!');
    }
  };

  const handleRevaluation = async (resultId) => {
    try {
      const confirmed = window.confirm('Request revaluation for this result? Additional fees may apply.');
      if (!confirmed) return;
      
      await axios.post('/exams/revaluation', { resultId });
      toast.success('Revaluation requested successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request revaluation!');
    }
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Management</h1>
        <p className="text-gray-600">Manage your exam registrations, payments, and results</p>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {['register', 'registrations', 'results'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPagination({ current: 1, total: 1 });
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === tab 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab === 'register' ? 'Available Exams' : 
             tab === 'registrations' ? 'My Registrations' : 'Results'}
          </button>
        ))}
      </div>

      {activeTab === 'register' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={filters.semester}
                onChange={(e) => handleFilterChange('semester', e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6,7,8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Department ID"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          
          <div className="grid gap-6">
            {exams.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No exams available for registration</p>
              </div>
            ) : (
              exams.map((exam) => (
                <div key={exam._id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                      <p className="text-gray-600">Subject: {exam.subject?.name} ({exam.subject?.code})</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {exam.isExternal ? 'External' : 'Internal'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Date:</span>
                      <p className="text-gray-600">{new Date(exam.examDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Venue:</span>
                      <p className="text-gray-600">{exam.venue}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Fee:</span>
                      <p className="text-gray-600">₹{exam.fee}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Deadline:</span>
                      <p className="text-gray-600">{new Date(exam.registrationDeadline).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRegister(exam._id)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Register Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'registrations' && (
        <div className="space-y-6">
          {registrations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No exam registrations found</p>
            </div>
          ) : (
            registrations.map((reg) => (
              <div key={reg._id} className="bg-white border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{reg.exam?.title}</h3>
                    <p className="text-gray-600">Registration: {reg.registrationNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      reg.status === 'fee_pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {reg.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <span className="font-medium">Fee Status:</span>
                    <p className={reg.feeStatus === 'paid' ? 'text-green-600' : 'text-red-600'}>
                      {reg.feeStatus.toUpperCase()}
                    </p>
                  </div>
                  {reg.hallTicketNumber && (
                    <div>
                      <span className="font-medium">Hall Ticket:</span>
                      <p className="text-gray-600">{reg.hallTicketNumber}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Exam Date:</span>
                    <p className="text-gray-600">{new Date(reg.exam?.examDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {reg.feeStatus === 'pending' && (
                    <button
                      onClick={() => handlePayFee(reg._id, reg.exam?.fee)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Pay Fee (₹{reg.exam?.fee})
                    </button>
                  )}
                  
                  {reg.status === 'confirmed' && reg.hallTicketNumber && (
                    <button
                      onClick={() => router.push(`/exams/hall-ticket/${reg._id}`)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Download Hall Ticket
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-6">
          {results.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No exam results available</p>
            </div>
          ) : (
            results.map((result) => (
              <div key={result._id} className="bg-white border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{result.exam?.title}</h3>
                    <p className="text-gray-600">Exam Date: {new Date(result.exam?.examDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.status === 'pass' ? 'bg-green-100 text-green-800' :
                    result.status === 'fail' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="font-medium text-gray-700">Marks:</span>
                    <p className="text-2xl font-bold text-blue-600">{result.marksObtained}/{result.exam?.maxMarks}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Grade:</span>
                    <p className="text-xl font-semibold">{result.grade}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Revaluation:</span>
                    <p className="text-gray-600">{result.revaluationStatus.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  {result.revaluationMarks && (
                    <div>
                      <span className="font-medium text-gray-700">Revaluation Marks:</span>
                      <p className="text-lg font-semibold text-green-600">{result.revaluationMarks}</p>
                    </div>
                  )}
                </div>
                
                {!result.revaluationRequested && result.status === 'pass' && (
                  <button
                    onClick={() => handleRevaluation(result._id)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Request Revaluation
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.current - 1)}
              disabled={pagination.current === 1}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            {Array.from({ length: pagination.total }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 border rounded-lg ${
                  page === pagination.current 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(pagination.current + 1)}
              disabled={pagination.current === pagination.total}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}