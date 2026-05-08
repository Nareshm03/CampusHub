'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import {
  PlusIcon, ClipboardDocumentListIcon, ChevronDownIcon,
  TrashIcon, EyeIcon, CheckCircleIcon, XMarkIcon, PaperClipIcon
} from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  DRAFT: 'warning', PUBLISHED: 'success', CLOSED: 'danger', GRADED: 'info'
};

export default function FacultyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gradeModal, setGradeModal] = useState(null); // { submissionId, maxMarks }
  const [gradeValue, setGradeValue] = useState('');
  const [feedback, setFeedback] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', subject: '', department: '', semester: '',
    dueDate: '', totalMarks: 100, instructions: '', submissionType: 'FILE',
    allowLateSubmission: false, latePenaltyPercentage: 10, status: 'PUBLISHED'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignRes, subjectRes, deptRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/subjects/faculty').catch(() => ({ data: { data: [] } })),
        api.get('/departments').catch(() => ({ data: { data: [] } }))
      ]);
      setAssignments(assignRes.data.data || []);
      setSubjects(subjectRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    const sub = subjects.find(s => s._id === subjectId);
    setForm(f => ({
      ...f,
      subject: subjectId,
      department: sub?.department?._id || sub?.department || f.department,
      semester: sub?.semester || f.semester
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.department || !form.semester) {
      toast.error('Please select a subject');
      return;
    }
    setSaving(true);
    try {
      await api.post('/assignments', { ...form, semester: Number(form.semester) });
      toast.success('Assignment created');
      setShowForm(false);
      setForm({ title: '', description: '', subject: '', department: '', semester: '', dueDate: '', totalMarks: 100, instructions: '', submissionType: 'FILE', allowLateSubmission: false, latePenaltyPercentage: 10, status: 'PUBLISHED' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      toast.success('Deleted');
      setAssignments(prev => prev.filter(a => a._id !== id));
      if (selectedAssignment?._id === id) setSelectedAssignment(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleClose = async (id) => {
    try {
      await api.put(`/assignments/${id}`, { status: 'CLOSED' });
      toast.success('Assignment closed');
      fetchData();
    } catch {
      toast.error('Failed to close assignment');
    }
  };

  const viewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionsLoading(true);
    try {
      const res = await api.get(`/assignments/${assignment._id}/submissions`);
      setSubmissions(res.data.data || []);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!gradeValue) return;
    try {
      await api.put(`/assignments/submissions/${gradeModal.submissionId}/grade`, {
        marksObtained: Number(gradeValue), feedback
      });
      toast.success('Graded successfully');
      setGradeModal(null);
      setGradeValue('');
      setFeedback('');
      viewSubmissions(selectedAssignment);
    } catch {
      toast.error('Failed to grade');
    }
  };

  const minDate = new Date().toISOString().slice(0, 16);

  if (loading) return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}
        </div>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assignments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage assignments for your students</p>
          </div>
          <Button variant="primary" onClick={() => setShowForm(v => !v)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            New Assignment
          </Button>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Assignment</h2>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                    <textarea required rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                    <select required value={form.subject} onChange={e => handleSubjectChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">-- Select Subject --</option>
                      {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.subjectCode})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                    <input required type="datetime-local" min={minDate} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Marks</label>
                    <input type="number" min={1} value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Submission Type</label>
                    <select value={form.submissionType} onChange={e => setForm(f => ({ ...f, submissionType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="FILE">File Upload</option>
                      <option value="TEXT">Text</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions</label>
                    <textarea rows={2} value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="late" checked={form.allowLateSubmission} onChange={e => setForm(f => ({ ...f, allowLateSubmission: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                    <label htmlFor="late" className="text-sm text-gray-700 dark:text-gray-300">Allow late submission</label>
                    {form.allowLateSubmission && (
                      <input type="number" min={0} max={100} value={form.latePenaltyPercentage} onChange={e => setForm(f => ({ ...f, latePenaltyPercentage: Number(e.target.value) }))}
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white" placeholder="% penalty" />
                    )}
                  </div>
                  <div className="md:col-span-2 flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={saving}>Create Assignment</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignments List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Assignments ({assignments.length})</h2>
            {assignments.length === 0 ? (
              <Card className="p-12 text-center">
                <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No assignments yet. Create your first one!</p>
              </Card>
            ) : assignments.map(a => (
              <motion.div key={a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedAssignment?._id === a._id ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{a.title}</h3>
                        <Badge variant={STATUS_COLORS[a.status] || 'info'}>{a.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{a.subject?.name} · Sem {a.semester}</p>
                      <p className="text-xs text-gray-400 mt-1">Due: {new Date(a.dueDate).toLocaleString()} · {a.totalMarks} marks</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => viewSubmissions(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="View submissions">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {a.status === 'PUBLISHED' && (
                        <button onClick={() => handleClose(a._id)} className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg" title="Close assignment">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(a._id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Submissions Panel */}
          <div>
            {selectedAssignment ? (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Submissions</h2>
                    <p className="text-sm text-gray-500">{selectedAssignment.title}</p>
                  </div>
                  <button onClick={() => setSelectedAssignment(null)} className="p-1 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {submissionsLoading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}</div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <ClipboardDocumentListIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map(sub => (
                      <div key={sub._id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.student?.name || 'Student'}</p>
                            <p className="text-xs text-gray-500">{sub.student?.usn} · {new Date(sub.submittedAt).toLocaleString()}</p>
                            {sub.isLate && <span className="text-xs text-red-500 font-medium">Late</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {sub.status === 'GRADED' ? (
                              <span className="text-sm font-bold text-green-600">{sub.marksObtained}/{selectedAssignment.totalMarks}</span>
                            ) : (
                              <button onClick={() => { setGradeModal({ submissionId: sub._id, maxMarks: selectedAssignment.totalMarks }); setGradeValue(''); setFeedback(''); }}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Grade
                              </button>
                            )}
                            <Badge variant={sub.status === 'GRADED' ? 'success' : sub.isLate ? 'danger' : 'info'}>{sub.status}</Badge>
                          </div>
                        </div>
                        {sub.files?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sub.files.map((f, i) => (
                              <span key={i} className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                <PaperClipIcon className="h-3 w-3" />{f.filename}
                              </span>
                            ))}
                          </div>
                        )}
                        {sub.textSubmission && (
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">{sub.textSubmission}</p>
                        )}
                        {sub.feedback && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Feedback: {sub.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <EyeIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Click the eye icon on an assignment to view submissions</p>
              </Card>
            )}
          </div>
        </div>

        {/* Grade Modal */}
        <AnimatePresence>
          {gradeModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grade Submission</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Marks (out of {gradeModal.maxMarks})
                    </label>
                    <input type="number" min={0} max={gradeModal.maxMarks} value={gradeValue}
                      onChange={e => setGradeValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback (optional)</label>
                    <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => setGradeModal(null)}>Cancel</Button>
                    <Button variant="primary" onClick={handleGrade}>Submit Grade</Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
