'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import PlacementReadiness from '../../../components/PlacementReadiness';
import SkillsManager from '../../../components/SkillsManager';
import api from '../../../lib/axios';

const statusColor = (status) => {
  switch (status) {
    case 'Selected':
    case 'Offer Accepted':
      return 'bg-green-100 text-green-800';
    case 'Shortlisted':
    case 'Interview Scheduled':
    case 'Offer Extended':
      return 'bg-blue-100 text-blue-800';
    case 'Rejected':
    case 'Offer Rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

function JobsBrowser() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async (overrides = {}) => {
    try {
      setError('');
      const params = new URLSearchParams();
      const q = overrides.search !== undefined ? overrides.search : search;
      const t = overrides.jobType !== undefined ? overrides.jobType : jobType;
      if (q.trim()) params.set('search', q.trim());
      if (t) params.set('jobType', t);
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/placements/jobs${query}`);
      setJobs(response.data?.data?.jobs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load job postings');
    } finally {
      setLoading(false);
    }
  };

  const openJob = async (jobId) => {
    setDetailLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.get(`/placements/jobs/${jobId}`);
      setSelectedJob(response.data?.data || null);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load job details' });
    } finally {
      setDetailLoading(false);
    }
  };

  const applyToJob = async () => {
    if (!selectedJob) return;
    setApplying(true);
    setMessage({ type: '', text: '' });
    try {
      await api.post(`/placements/jobs/${selectedJob.job._id}/apply`, {});
      setMessage({ type: 'success', text: 'Application submitted successfully' });
      openJob(selectedJob.job._id);
      fetchJobs();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit application' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">Eligible Job Postings</h3>
      <form
        className="flex flex-col sm:flex-row gap-2 mb-4"
        onSubmit={(e) => { e.preventDefault(); setLoading(true); fetchJobs(); }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or company"
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">All job types</option>
          <option value="Full-time">Full-time</option>
          <option value="Internship">Internship</option>
          <option value="Contract">Contract</option>
          <option value="Part-time">Part-time</option>
        </select>
        <button type="submit" className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-900">
          Search
        </button>
      </form>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
      )}
      {message.text && (
        <div className={`mb-4 p-3 rounded text-sm border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {message.text}
        </div>
      )}
      {!error && jobs.length === 0 && (
        <p className="text-gray-500 text-sm">No open job postings match your department and semester right now.</p>
      )}
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job._id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold">{job.title}</div>
              <div className="text-sm text-gray-600">
                {job.company?.name} • {job.jobType} • {job.location?.city || 'Location TBD'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Apply by {job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'N/A'}
                {job.salary?.max ? ` • Up to ₹${job.salary.max.toLocaleString()}` : ''}
              </div>
            </div>
            <button
              onClick={() => openJob(job._id)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View & Apply
            </button>
          </div>
        ))}
      </div>

      {detailLoading && <p className="text-sm text-gray-500 mt-4">Loading job details…</p>}
      {selectedJob && !detailLoading && (
        <div className="mt-6 border-t pt-4">
          <h4 className="font-bold text-lg">{selectedJob.job.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{selectedJob.job.company?.name} • {selectedJob.job.jobType}</p>
          <p className="text-sm text-gray-700 whitespace-pre-line mb-3">{selectedJob.job.description}</p>
          {selectedJob.job.requiredSkills?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedJob.job.requiredSkills.map((s) => (
                <span key={s} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{s}</span>
              ))}
            </div>
          )}
          <div className={`text-sm mb-3 font-medium ${selectedJob.eligibility?.eligible ? 'text-green-700' : 'text-red-700'}`}>
            {selectedJob.eligibility?.eligible
              ? 'You meet the eligibility criteria for this job.'
              : `Not eligible: ${selectedJob.eligibility?.reason || 'criteria not met'}`}
          </div>
          {selectedJob.userApplication && (
            <div className="text-sm mb-3">
              <span className="text-gray-600">Your application: </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor(selectedJob.userApplication.status)}`}>
                {selectedJob.userApplication.status}
              </span>
            </div>
          )}
          <button
            onClick={applyToJob}
            disabled={applying || !selectedJob.eligibility?.eligible || !!selectedJob.userApplication}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {applying ? 'Submitting…' : selectedJob.userApplication ? 'Already Applied' : 'Apply Now'}
          </button>
        </div>
      )}
    </div>
  );
}

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setError('');
        const response = await api.get('/placements/my-applications');
        setApplications(response.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load your applications');
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse"><div className="h-20 bg-gray-200 rounded"></div></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">My Applications</h3>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
      )}
      {!error && applications.length === 0 && (
        <p className="text-gray-500 text-sm">You have not applied to any jobs yet. Browse the postings above to get started.</p>
      )}
      <div className="space-y-3">
        {applications.map((item) => (
          <div key={item.jobId} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <div className="font-semibold">{item.jobTitle}</div>
              <div className="text-sm text-gray-600">{item.company?.name} • {item.jobType}</div>
              <div className="text-xs text-gray-500 mt-1">
                Applied on {item.application?.appliedAt ? new Date(item.application.appliedAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${statusColor(item.application?.status)}`}>
              {item.application?.status || 'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlacementDashboard() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Placement Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your placement readiness, browse jobs, and follow your applications</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-1">
              <PlacementReadiness />
            </div>
            <div className="lg:col-span-1">
              <SkillsManager />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6">
            <JobsBrowser />
            <MyApplications />
          </div>

          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4">How Placement Readiness is Calculated</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">35%</div>
                <div className="text-gray-600">CGPA</div>
                <div className="text-xs text-gray-500 mt-1">Academic performance weight</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">25%</div>
                <div className="text-gray-600">Attendance</div>
                <div className="text-xs text-gray-500 mt-1">Consistency & discipline</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">20%</div>
                <div className="text-gray-600">Homework</div>
                <div className="text-xs text-gray-500 mt-1">Submission discipline</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">20%</div>
                <div className="text-gray-600">Skills</div>
                <div className="text-xs text-gray-500 mt-1">Technical profile strength</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
