'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/axios';

const JOB_TYPES = ['Full-time', 'Internship', 'Contract', 'Part-time'];
const JOB_STATUSES = ['Draft', 'Published', 'Closed', 'Cancelled'];
const APP_STATUSES = ['Pending', 'Shortlisted', 'Rejected', 'Interview Scheduled', 'Selected', 'Offer Extended', 'Offer Accepted', 'Offer Rejected'];
const INDUSTRIES = ['IT/Software', 'Finance/Banking', 'Manufacturing', 'Consulting', 'Healthcare', 'E-commerce', 'Automotive', 'Telecommunications', 'Education', 'Other'];

const inputCls = 'w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';
const btnPrimary = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm';
const btnDanger = 'px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm';
const btnGhost = 'px-3 py-1 border rounded hover:bg-gray-100 text-sm';

function Message({ message, onClear }) {
  if (!message.text) return null;
  return (
    <div className={`mb-4 p-3 rounded text-sm border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
      {message.text}
      <button onClick={onClear} className="ml-3 underline">Dismiss</button>
    </div>
  );
}

function JobsTab({ isAdmin, setMessage }) {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', company: '', description: '', jobType: 'Full-time', city: '', salaryMax: '', positions: 1, applicationDeadline: '', status: 'Draft', minimumCGPA: 6, semesters: '', departments: [], requiredSkills: '' });

  const fetchAll = async () => {
    try {
      setError('');
      const [jobsRes, compRes, deptRes] = await Promise.all([
        api.get('/placements/jobs?limit=100'),
        api.get('/placements/companies?limit=100'),
        api.get('/departments').catch(() => ({ data: { data: [] } })),
      ]);
      setJobs(jobsRes.data?.data?.jobs || []);
      setCompanies(compRes.data?.data?.companies || []);
      setDepartments(deptRes.data?.data || deptRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ title: '', company: '', description: '', jobType: 'Full-time', city: '', salaryMax: '', positions: 1, applicationDeadline: '', status: 'Draft', minimumCGPA: 6, semesters: '', departments: [], requiredSkills: '' });
  };

  const startEdit = (job) => {
    setEditing(job._id);
    setForm({
      title: job.title || '',
      company: job.company?._id || job.company || '',
      description: job.description || '',
      jobType: job.jobType || 'Full-time',
      city: job.location?.city || '',
      salaryMax: job.salary?.max || '',
      positions: job.positions || 1,
      applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().slice(0, 10) : '',
      status: job.status || 'Draft',
      minimumCGPA: job.eligibility?.minimumCGPA ?? 6,
      semesters: (job.eligibility?.semesters || []).join(', '),
      departments: (job.eligibility?.departments || []).map((d) => (d._id ? d._id : d)),
      requiredSkills: (job.requiredSkills || []).join(', '),
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        company: form.company,
        description: form.description,
        jobType: form.jobType,
        location: { city: form.city },
        positions: Number(form.positions) || 1,
        applicationDeadline: form.applicationDeadline,
        status: form.status,
        salary: form.salaryMax ? { max: Number(form.salaryMax) } : undefined,
        eligibility: {
          departments: form.departments,
          semesters: form.semesters.split(',').map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= 8),
          minimumCGPA: Number(form.minimumCGPA) || 0,
        },
        requiredSkills: form.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editing) {
        await api.put(`/placements/jobs/${editing}`, payload);
        setMessage({ type: 'success', text: 'Job updated successfully' });
      } else {
        await api.post('/placements/jobs', payload);
        setMessage({ type: 'success', text: 'Job created successfully' });
      }
      resetForm();
      fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save job' });
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this job posting and all its applications?')) return;
    try {
      await api.delete(`/placements/jobs/${id}`);
      setMessage({ type: 'success', text: 'Job deleted successfully' });
      fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete job' });
    }
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-24 bg-gray-200 rounded"></div></div>;
  }

  return (
    <div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <form onSubmit={submit} className="border rounded-lg p-4 mb-6 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-3">
        <h4 className="md:col-span-2 font-bold">{editing ? 'Edit Job Posting' : 'Create Job Posting'}</h4>
        <input className={inputCls} placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <select className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required>
          <option value="">Select company *</option>
          {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <textarea className={`${inputCls} md:col-span-2`} placeholder="Description *" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <select className={inputCls} value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })}>
          {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className={inputCls} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className={inputCls} type="date" value={form.applicationDeadline} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} required />
        <input className={inputCls} type="number" placeholder="Positions" min="1" value={form.positions} onChange={(e) => setForm({ ...form, positions: e.target.value })} />
        <input className={inputCls} type="number" step="0.1" placeholder="Minimum CGPA" value={form.minimumCGPA} onChange={(e) => setForm({ ...form, minimumCGPA: e.target.value })} />
        <input className={inputCls} placeholder="Semesters (comma separated, e.g. 6, 7, 8)" value={form.semesters} onChange={(e) => setForm({ ...form, semesters: e.target.value })} />
        <input className={inputCls} type="number" placeholder="Max salary (annual)" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
        <input className={inputCls} placeholder="Required skills (comma separated)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
        <div className="md:col-span-2">
          <div className="text-sm font-medium mb-1">Eligible departments (empty = all)</div>
          <div className="flex flex-wrap gap-2">
            {departments.map((d) => (
              <label key={d._id} className="text-sm flex items-center gap-1 border rounded px-2 py-1">
                <input
                  type="checkbox"
                  checked={form.departments.includes(d._id)}
                  onChange={(e) => setForm({
                    ...form,
                    departments: e.target.checked
                      ? [...form.departments, d._id]
                      : form.departments.filter((id) => id !== d._id),
                  })}
                />
                {d.name}
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" className={btnPrimary}>{editing ? 'Update Job' : 'Create Job'}</button>
          {editing && <button type="button" onClick={resetForm} className={btnGhost}>Cancel</button>}
        </div>
      </form>

      {jobs.length === 0 && !error && <p className="text-gray-500 text-sm">No job postings yet. Create the first one above.</p>}
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job._id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <div className="font-semibold">{job.title}</div>
              <div className="text-sm text-gray-600">{job.company?.name} • {job.jobType} • {job.status}</div>
              <div className="text-xs text-gray-500">{job.applicationCount ?? job.applications?.length ?? 0} application(s)</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(job)} className={btnGhost}>Edit</button>
              {isAdmin && <button onClick={() => remove(job._id)} className={btnDanger}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompaniesTab({ isAdmin, setMessage }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', industry: 'IT/Software', website: '', description: '', minimumCGPA: 6, acceptBacklogs: false, isActive: true });

  const fetchCompanies = async () => {
    try {
      setError('');
      const response = await api.get('/placements/companies?limit=100');
      setCompanies(response.data?.data?.companies || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', industry: 'IT/Software', website: '', description: '', minimumCGPA: 6, acceptBacklogs: false, isActive: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, minimumCGPA: Number(form.minimumCGPA) || 0 };
      if (editing) {
        await api.put(`/placements/companies/${editing}`, payload);
        setMessage({ type: 'success', text: 'Company updated successfully' });
      } else {
        await api.post('/placements/companies', payload);
        setMessage({ type: 'success', text: 'Company created successfully' });
      }
      resetForm();
      fetchCompanies();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save company' });
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this company?')) return;
    try {
      await api.delete(`/placements/companies/${id}`);
      setMessage({ type: 'success', text: 'Company deleted successfully' });
      fetchCompanies();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete company' });
    }
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-24 bg-gray-200 rounded"></div></div>;
  }

  return (
    <div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <form onSubmit={submit} className="border rounded-lg p-4 mb-6 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-3">
        <h4 className="md:col-span-2 font-bold">{editing ? 'Edit Company' : 'Add Company'}</h4>
        <input className={inputCls} placeholder="Company name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className={inputCls} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <input className={inputCls} placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        <input className={inputCls} type="number" step="0.1" placeholder="Minimum CGPA" value={form.minimumCGPA} onChange={(e) => setForm({ ...form, minimumCGPA: e.target.value })} />
        <textarea className={`${inputCls} md:col-span-2`} placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={form.acceptBacklogs} onChange={(e) => setForm({ ...form, acceptBacklogs: e.target.checked })} />
          Accepts backlogs
        </label>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active
        </label>
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" className={btnPrimary}>{editing ? 'Update Company' : 'Add Company'}</button>
          {editing && <button type="button" onClick={resetForm} className={btnGhost}>Cancel</button>}
        </div>
      </form>

      {companies.length === 0 && !error && <p className="text-gray-500 text-sm">No companies yet. Add the first one above.</p>}
      <div className="space-y-3">
        {companies.map((c) => (
          <div key={c._id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-gray-600">{c.industry}{c.isVerified ? ' • Verified' : ''}{c.isActive ? '' : ' • Inactive'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(c._id); setForm({ name: c.name || '', industry: c.industry || 'IT/Software', website: c.website || '', description: c.description || '', minimumCGPA: c.minimumCGPA ?? 6, acceptBacklogs: !!c.acceptBacklogs, isActive: c.isActive !== false }); }} className={btnGhost}>Edit</button>
              {isAdmin && <button onClick={() => remove(c._id)} className={btnDanger}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationsTab({ setMessage }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await api.get('/placements/jobs?limit=100');
        setJobs(response.data?.data?.jobs || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const fetchApplications = async (jobId, status = '') => {
    if (!jobId) return;
    setDetailLoading(true);
    try {
      const response = await api.get(`/placements/jobs/${jobId}/applications${status ? `?status=${status}` : ''}`);
      setDetail(response.data?.data || null);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load applications' });
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (studentId, status) => {
    if (!selectedJob) return;
    setUpdating(studentId);
    try {
      await api.put(`/placements/jobs/${selectedJob}/applications/${studentId}/status`, { status });
      setMessage({ type: 'success', text: 'Application status updated' });
      fetchApplications(selectedJob, statusFilter);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update status' });
    } finally {
      setUpdating('');
    }
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-24 bg-gray-200 rounded"></div></div>;
  }

  return (
    <div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          className={inputCls}
          value={selectedJob}
          onChange={(e) => { setSelectedJob(e.target.value); setDetail(null); if (e.target.value) fetchApplications(e.target.value, statusFilter); }}
        >
          <option value="">Select a job posting</option>
          {jobs.map((j) => <option key={j._id} value={j._id}>{j.title} — {j.company?.name}</option>)}
        </select>
        <select className={inputCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); if (selectedJob) fetchApplications(selectedJob, e.target.value); }}>
          <option value="">All statuses</option>
          {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {detailLoading && <p className="text-sm text-gray-500">Loading applications…</p>}
      {selectedJob && !detailLoading && detail && (
        <div>
          <div className="flex flex-wrap gap-4 text-sm mb-4">
            <span>Total: <strong>{detail.statistics?.total ?? 0}</strong></span>
            <span>Pending: <strong>{detail.statistics?.pending ?? 0}</strong></span>
            <span>Shortlisted: <strong>{detail.statistics?.shortlisted ?? 0}</strong></span>
            <span>Selected: <strong>{detail.statistics?.selected ?? 0}</strong></span>
            <span>Rejected: <strong>{detail.statistics?.rejected ?? 0}</strong></span>
          </div>
          {(detail.applications || []).length === 0 && (
            <p className="text-gray-500 text-sm">No applications for this filter yet.</p>
          )}
          <div className="space-y-3">
            {(detail.applications || []).map((app, idx) => (
              <div key={app._id || idx} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1">
                  <div className="font-semibold">{app.student?.name || 'Applicant'}</div>
                  <div className="text-sm text-gray-600">{app.student?.email || ''}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Applied on {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <select
                  className={`${inputCls} sm:w-48`}
                  value={app.status}
                  disabled={updating === (app.student?._id || app.student)}
                  onChange={(e) => updateStatus(app.student?._id || app.student, e.target.value)}
                >
                  {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
      {!selectedJob && !error && <p className="text-gray-500 text-sm">Choose a job posting to review its applications.</p>}
    </div>
  );
}

function StatisticsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/placements/statistics');
        setStats(response.data?.data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="animate-pulse"><div className="h-24 bg-gray-200 rounded"></div></div>;
  }
  if (error) {
    return <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>;
  }
  if (!stats) {
    return <p className="text-gray-500 text-sm">No placement statistics available yet.</p>;
  }

  const cards = [
    ['Total Jobs', stats.totalJobs ?? 0],
    ['Applications', stats.totalApplications ?? 0],
    ['Offers', stats.totalOffers ?? 0],
    ['Placements', stats.totalPlacements ?? 0],
    ['Students Placed', stats.uniqueStudentsPlaced ?? 0],
    ['Avg Package', stats.averagePackage ? `₹${Math.round(stats.averagePackage).toLocaleString()}` : '—'],
    ['Highest Package', stats.highestPackage ? `₹${stats.highestPackage.toLocaleString()}` : '—'],
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map(([label, value]) => (
          <div key={label} className="border rounded-lg p-4 text-center bg-gray-50">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-600">{label}</div>
          </div>
        ))}
      </div>
      <h4 className="font-bold mb-2">Company-wise</h4>
      {Object.keys(stats.companyWise || {}).length === 0 && (
        <p className="text-gray-500 text-sm">No company data yet.</p>
      )}
      <div className="space-y-2">
        {Object.entries(stats.companyWise || {}).map(([name, row]) => (
          <div key={name} className="border rounded p-3 flex justify-between text-sm">
            <span className="font-medium">{name}</span>
            <span className="text-gray-600">{row.applications} application(s) • {row.placements} placement(s)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlacementManagePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('jobs');
  const [message, setMessage] = useState({ type: '', text: '' });
  const isAdmin = user?.role === 'ADMIN';

  const tabs = [
    ['jobs', 'Jobs'],
    ['companies', 'Companies'],
    ['applications', 'Applications'],
    ['statistics', 'Statistics'],
  ];

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Placement Management</h1>
          <p className="text-gray-600 mb-6">Manage companies, job postings, applications, and placement statistics</p>

          <Message message={message} onClear={() => setMessage({ type: '', text: '' })} />

          <div className="flex gap-2 mb-6 flex-wrap">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 rounded text-sm font-medium ${tab === key ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-100'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            {tab === 'jobs' && <JobsTab isAdmin={isAdmin} setMessage={setMessage} />}
            {tab === 'companies' && <CompaniesTab isAdmin={isAdmin} setMessage={setMessage} />}
            {tab === 'applications' && <ApplicationsTab setMessage={setMessage} />}
            {tab === 'statistics' && <StatisticsTab />}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
