'use client';
import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ManageTimetable({ facultyProfile, onSaved }) {
  const isAdmin = !!(facultyProfile?.departments);
  const departments = facultyProfile?.departments || [];

  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedDept, setSelectedDept] = useState('');
  const [form, setForm] = useState({
    day: 'MON',
    period: 1,
    subject: '',
    semester: 1,
    facultyId: ''
  });
  const [loading, setLoading] = useState(!isAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = isAdmin ? deptId : facultyProfile?._id || facultyProfile;
    if (id) fetchInitialData(id);
  }, [facultyProfile, selectedDept]);

  useEffect(() => {
    const id = isAdmin ? selectedDept : facultyProfile?.department?._id || facultyProfile?.department || facultyProfile?.id;
    if (id) fetchClassTimetable(id);
  }, [selectedSemester, facultyProfile, selectedDept]);

  const fetchInitialData = async (deptId) => {
    try {
      setLoading(true);
      // Wait, let's just make it simple

      const [subjectsRes, facultyRes] = await Promise.all([
        isAdmin 
          ? api.get(`/subjects/department/${deptId}`)
          : api.get(`/subjects`), // Actually GET /api/subjects returns all
        api.get(`/users/faculty`) 
      ]);
      const subjectData = subjectsRes.data?.data || [];
      const facultyData = facultyRes.data?.data || [];
      
      if (!isAdmin && deptId) {
        setSubjects(subjectData.filter(s => s.department?._id === deptId || s.department === deptId));
        setFacultyList(facultyData.filter(f => f.department?._id === deptId || f.department === deptId));
      } else {
        setSubjects(subjectData);
        setFacultyList(facultyData);
      }
    } catch (err) {
      console.error('Failed to fetch management data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassTimetable = async (deptId) => {
    try {
      const id = deptId || (facultyProfile?.department?._id || facultyProfile?.department);
      if (!id) return;
      const res = await api.get(`/timetable/class?departmentId=${id}&semester=${selectedSemester}`);
      setAllEntries(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch class timetable', err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.subject) return setError('Please select a subject');
    if (!form.facultyId) return setError('Please select a faculty');
    
    setSaving(true);
    setError('');
    try {
      const id = isAdmin ? deptId : facultyProfile?.department?._id || facultyProfile?.department || facultyProfile?.id || facultyProfile;
      if (!id) return;
      
      const payload = {
        ...form,
        semester: selectedSemester,
        ...(isAdmin ? { department: id } : { department: id, facultyId: form.facultyId || facultyProfile?.userId })
      };
      const res = await api.post('/timetable/faculty', payload);
      setAllEntries(prev => [...prev, res.data.data].sort((a, b) => a.period - b.period));
      if (onSaved) onSaved();
      // Reset some form fields
      setForm(f => ({ ...f, period: f.period < 8 ? f.period + 1 : 1 }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/timetable/faculty/${id}`);
      setAllEntries(prev => prev.filter(e => e._id !== id));
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete entry');
    }
  };

  if (loading) return <div className="text-center py-8">Loading management tools...</div>;

  if (isAdmin && !selectedDept) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select a Department to Manage</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto">
          {departments.map(dept => (
            <button
              key={dept._id}
              onClick={() => setSelectedDept(dept._id)}
              className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
            >
              {dept.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Class Timetable Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Select a semester to manage its timetable.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => { setSelectedDept(''); setAllEntries([]); setSubjects([]); setFacultyList([]); }}
              className="text-xs text-primary-600 dark:text-primary-400 underline"
            >
              Change Department
            </button>
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Semester:</span>
          <select 
            value={selectedSemester} 
            onChange={e => setSelectedSemester(Number(e.target.value))}
            className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
            <h4 className="text-md font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PlusIcon className="h-5 w-5 text-primary-500" />
              Add New Slot
            </h4>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Day</label>
                <select 
                  value={form.day} 
                  onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Period</label>
                <select 
                  value={form.period} 
                  onChange={e => setForm(f => ({ ...f, period: Number(e.target.value) }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  {PERIODS.map(p => <option key={p} value={p}>Period {p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Subject</label>
                <select 
                  value={form.subject} 
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.subjectCode})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Faculty</label>
                <select 
                  value={form.facultyId} 
                  onChange={e => setForm(f => ({ ...f, facultyId: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select Faculty</option>
                  {facultyList.map(f => <option key={f._id || f.id} value={f._id || f.id}>{f.userId?.name || f.name || 'Faculty'}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Faculty</label>
                <select 
                  value={form.facultyId} 
                  onChange={e => setForm(f => ({ ...f, facultyId: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select Faculty</option>
                  {facultyList.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                </select>
              </div>

              {error && <p className="text-red-500 text-xs mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}
              
              <Button 
                type="submit" 
                variant="primary" 
                fullWidth 
                disabled={saving}
                className="mt-4"
              >
                {saving ? 'Adding...' : 'Add Slot'}
              </Button>
            </form>
          </div>
        </div>

        {/* Timetable Preview/List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Semester {selectedSemester} Schedule
              </h4>
            </div>
            <div className="p-6">
              {allEntries.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No slots defined for Semester {selectedSemester} yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {DAYS.map(day => {
                    const dayEntries = allEntries.filter(e => e.day === day).sort((a, b) => a.period - b.period);
                    if (dayEntries.length === 0) return null;
                    return (
                      <div key={day} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">{day}</span>
                          <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {dayEntries.map(entry => (
                            <div 
                              key={entry._id} 
                              className="group flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                                  <span className="text-[10px] font-bold uppercase">P</span>
                                  <span className="text-sm font-bold leading-none">{entry.period}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                    {entry.subject?.name ?? '—'}
                                  </p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    {entry.faculty?.name ?? 'Unassigned'}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDelete(entry._id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
