'use client';
import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import {
  PlusIcon, DocumentArrowUpIcon, TrashIcon, ArrowDownTrayIcon,
  EyeIcon, XMarkIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const CATEGORIES = ['LECTURE_NOTES', 'RESEARCH_PAPER', 'SYLLABUS', 'ASSIGNMENT', 'REFERENCE', 'OTHER'];
const CATEGORY_LABELS = {
  LECTURE_NOTES: 'Lecture Notes', RESEARCH_PAPER: 'Research Paper',
  SYLLABUS: 'Syllabus', ASSIGNMENT: 'Assignment', REFERENCE: 'Reference', OTHER: 'Other'
};
const CATEGORY_COLORS = {
  LECTURE_NOTES: 'info', RESEARCH_PAPER: 'success', SYLLABUS: 'warning',
  ASSIGNMENT: 'danger', REFERENCE: 'default', OTHER: 'default'
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FacultyStudyMaterials() {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', category: 'LECTURE_NOTES', subject: '',
    semester: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    tags: '', accessLevel: 'ALL_STUDENTS'
  });
  const [files, setFiles] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [matRes, subRes, analyticsRes] = await Promise.all([
        api.get('/study-materials'),
        api.get('/subjects/faculty').catch(() => ({ data: { data: [] } })),
        api.get('/study-materials/analytics').catch(() => ({ data: { data: null } }))
      ]);
      setMaterials(matRes.data.data || []);
      setSubjects(subRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
    } catch {
      toast.error('Failed to load study materials');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    const sub = subjects.find(s => s._id === subjectId);
    setForm(f => ({ ...f, subject: subjectId, semester: sub?.semester?.toString() || f.semester }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.subject) { toast.error('Please select a subject'); return; }
    if (files.length === 0) { toast.error('Please select at least one file'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach(f => fd.append('files', f));
      await api.post('/study-materials', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Study material uploaded successfully');
      setShowForm(false);
      setFiles([]);
      setForm({ title: '', description: '', category: 'LECTURE_NOTES', subject: '', semester: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1), tags: '', accessLevel: 'ALL_STUDENTS' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this material and all its files?')) return;
    try {
      await api.delete(`/study-materials/${id}`);
      toast.success('Deleted');
      setMaterials(prev => prev.filter(m => m._id !== id));
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDownload = async (materialId, filename) => {
    try {
      const res = await api.get(`/study-materials/${materialId}/download/${filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const filtered = materials.filter(m => {
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.subject?.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || m.category === filterCategory;
    return matchSearch && matchCat;
  });

  if (loading) return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}
        </div>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Study Materials</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Upload and manage learning resources for your students</p>
          </div>
          <Button variant="primary" onClick={() => setShowForm(v => !v)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Upload Material
          </Button>
        </div>

        {/* Analytics Summary */}
        {analytics?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Materials', value: analytics.summary.totalMaterials, color: 'blue' },
              { label: 'Total Files', value: analytics.summary.totalFiles, color: 'purple' },
              { label: 'Total Views', value: analytics.summary.totalViews, color: 'green' },
              { label: 'Downloads', value: analytics.summary.totalDownloads, color: 'orange' },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <p className={`text-2xl font-bold text-${s.color}-600 dark:text-${s.color}-400`}>{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Study Material</h2>
                <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Year *</label>
                    <input required value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))}
                      placeholder="e.g. 2024-2025"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Level</label>
                    <select value={form.accessLevel} onChange={e => setForm(f => ({ ...f, accessLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="ALL_STUDENTS">All Students</option>
                      <option value="DEPARTMENT_ONLY">Department Only</option>
                      <option value="FACULTY_ONLY">Faculty Only</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
                    <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                      placeholder="e.g. unit1, chapter2, important"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Files * (up to 10)</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                      <DocumentArrowUpIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Click to select files or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, PPT, ZIP, images supported</p>
                      <input ref={fileInputRef} type="file" multiple className="hidden"
                        onChange={e => setFiles(Array.from(e.target.files))} />
                    </div>
                    {files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded">
                            <span className="text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                            <span className="text-gray-400 ml-2 shrink-0">{formatSize(f.size)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setFiles([]); }}>Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={saving}>Upload</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or subject..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>

        {/* Materials Grid */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <DocumentArrowUpIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {materials.length === 0 ? 'No materials uploaded yet. Upload your first one!' : 'No materials match your search.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(m => (
              <motion.div key={m._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{m.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.subject?.name} · Sem {m.semester}</p>
                    </div>
                    <Badge variant={CATEGORY_COLORS[m.category]}>{CATEGORY_LABELS[m.category]}</Badge>
                  </div>
                  {m.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{m.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span>{m.files?.length || 0} file{m.files?.length !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{m.viewCount} views</span>
                    <span>·</span>
                    <span>{m.downloadCount} downloads</span>
                  </div>
                  {m.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {m.tags.slice(0, 4).map(t => (
                        <span key={t} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  {/* Files */}
                  <div className="space-y-1 flex-1">
                    {m.files?.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 px-2 py-1.5 rounded">
                        <span className="truncate text-gray-700 dark:text-gray-300">{f.originalName}</span>
                        <button onClick={() => handleDownload(m._id, f.filename)}
                          className="ml-2 text-blue-600 hover:text-blue-700 shrink-0">
                          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => handleDelete(m._id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
