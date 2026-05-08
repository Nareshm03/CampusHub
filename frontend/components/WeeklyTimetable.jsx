'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TableCellsIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '@/lib/axios';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
const DAY_MAP = { 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };

const PERIOD_COLORS = [
  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300',
  'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300',
  'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
];

function ManageModal({ onClose, onSaved }) {
  const [allSubjects, setAllSubjects] = useState([]);
  const [savedEntries, setSavedEntries] = useState([]);
  const [queue, setQueue] = useState([]);
  const [form, setForm] = useState({ day: 'MON', period: 1, subject: '', semester: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Subjects filtered to the currently selected semester
  const subjects = allSubjects.filter(s => s.semester === form.semester);

  useEffect(() => {
    // Always resolve dept from faculty profile — don't rely on prop timing
    const load = async () => {
      try {
        const profileRes = await api.get('/faculty/me');
        const deptId = profileRes.data?.data?.department?._id || profileRes.data?.data?.department;
        if (!deptId) return;
        const subjectsRes = await api.get(`/subjects/department/${deptId}`);
        setAllSubjects(subjectsRes.data?.data ?? []);
      } catch {
        // fallback: fetch subjects assigned to this faculty
        try {
          const r = await api.get('/subjects/faculty');
          setAllSubjects(r.data?.data ?? []);
        } catch { /* silent */ }
      } finally {
        setLoadingSubjects(false);
      }
    };
    load();
    api.get('/timetable/faculty').then(r => setSavedEntries(r.data?.data ?? [])).catch(() => {});
  }, []);

  const handleQueue = (e) => {
    e.preventDefault();
    if (!form.subject) return setError('Please select a subject');
    if (queue.some(q => q.day === form.day && q.period === form.period && q.semester === form.semester))
      return setError('This slot is already in the queue');
    setError('');
    const subject = subjects.find(s => s._id === form.subject);
    setQueue(prev => [...prev, { ...form, _id: Date.now(), subjectName: subject?.name }]);
    setForm(f => ({ ...f, period: f.period < 8 ? f.period + 1 : 1 }));
  };

  const handleSaveAll = async () => {
    if (!queue.length) return;
    setSaving(true); setError('');
    const failed = [];
    for (const item of queue) {
      try {
        const { _id, subjectName, ...payload } = item;
        const res = await api.post('/timetable/faculty', payload);
        setSavedEntries(prev => [...prev, res.data.data]);
      } catch (err) {
        failed.push({ ...item, err: err.response?.data?.error || 'Failed' });
      }
    }
    setQueue(failed);
    if (!failed.length) { onSaved(); }
    else setError(failed.map(f => `${f.day} P${f.period}: ${f.err}`).join(' | '));
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/timetable/faculty/${id}`);
      setSavedEntries(prev => prev.filter(e => e._id !== id));
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Timetable</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-6">

          {/* Add to queue form */}
          <form onSubmit={handleQueue} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={form.period} onChange={e => setForm(f => ({ ...f, period: Number(e.target.value) }))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>Period {p}</option>)}
            </select>
            <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: Number(e.target.value), subject: '' }))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              <option value="">{loadingSubjects ? 'Loading...' : subjects.length === 0 ? 'No subjects for Sem ' + form.semester : 'Select Subject'}</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            {error && <p className="col-span-4 text-red-500 text-xs">{error}</p>}
            <button type="submit"
              className="col-span-4 flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg py-2 text-sm font-semibold transition-colors">
              <PlusIcon className="h-4 w-4" /> Add to Queue
            </button>
          </form>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Queued ({queue.length}) — not saved yet</p>
                <button onClick={handleSaveAll} disabled={saving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors">
                  {saving ? 'Saving...' : `💾 Save All (${queue.length})`}
                </button>
              </div>
              <div className="space-y-1">
                {queue.map(item => (
                  <div key={item._id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 mr-2">{item.day} · P{item.period} · Sem {item.semester}</span>
                      {item.subjectName}
                    </span>
                    <button onClick={() => setQueue(q => q.filter(x => x._id !== item._id))}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved entries */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Saved Entries</p>
            {savedEntries.length === 0
              ? <p className="text-gray-500 text-sm text-center py-4">No timetable entries yet</p>
              : DAYS.map(day => {
                  const dayEntries = savedEntries.filter(e => e.day === day).sort((a, b) => a.period - b.period);
                  if (!dayEntries.length) return null;
                  return (
                    <div key={day} className="mb-3">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{day}</p>
                      {dayEntries.map(entry => (
                        <div key={entry._id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2 mb-1">
                          <span className="text-sm text-gray-900 dark:text-white">
                            P{entry.period} — {entry.subject?.name ?? '—'} <span className="text-gray-400 text-xs">(Sem {entry.semester})</span>
                          </span>
                          <button onClick={() => handleDelete(entry._id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyTimetable({ role = 'STUDENT' }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const todayKey = DAY_MAP[new Date().getDay()];

  const fetchEntries = async () => {
    try {
      const endpoint = role === 'FACULTY' ? '/timetable/faculty' : '/timetable/student';
      const res = await api.get(endpoint);
      setEntries(res.data?.data ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [role]);

  const maxPeriod = entries.length > 0 ? Math.max(...entries.map(e => e.period)) : 6;
  const periods = Array.from({ length: Math.max(maxPeriod, 6) }, (_, i) => i + 1);

  const getEntry = (day, period) => entries.find(e => e.day === day && e.period === period);

  const activeDays = DAYS.filter(d => entries.some(e => e.day === d));
  const displayDays = activeDays.length > 0 ? activeDays : DAYS.slice(0, 5);

  return (
    <>
      <div className="rounded-2xl mb-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <TableCellsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Weekly Timetable</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {role === 'FACULTY' && (
              <button
                onClick={() => setShowManage(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Manage
              </button>
            )}
            <Link
              href="/timetable"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Full View →
            </Link>
          </div>
        </div>

        {/* Today highlight bar */}
        {DAYS.includes(todayKey) && (
          <div className="px-6 py-2 bg-blue-600 dark:bg-blue-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-semibold text-white">
              Today — {DAY_LABELS[todayKey]} · {entries.filter(e => e.day === todayKey).length} class{entries.filter(e => e.day === todayKey).length !== 1 ? 'es' : ''} scheduled
            </span>
          </div>
        )}

        {/* Timetable Grid */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <TableCellsIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No timetable entries found</p>
              {role === 'FACULTY' && (
                <button
                  onClick={() => setShowManage(true)}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <PlusIcon className="h-4 w-4" /> Add your first class
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-24">Period</th>
                  {displayDays.map(day => (
                    <th
                      key={day}
                      className={`px-3 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                        day === todayKey
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <span className={`inline-block px-2 py-0.5 rounded-lg ${day === todayKey ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
                        {day}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400">
                        P{period}
                      </span>
                    </td>
                    {displayDays.map(day => {
                      const entry = getEntry(day, period);
                      const colorClass = entry ? PERIOD_COLORS[(period - 1) % PERIOD_COLORS.length] : '';
                      const isToday = day === todayKey;
                      return (
                        <td key={day} className={`px-3 py-2 text-center ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
                          {entry ? (
                            <div className={`rounded-lg border px-2 py-1.5 ${colorClass} ${isToday ? 'ring-1 ring-blue-400 dark:ring-blue-600' : ''}`}>
                              <p className="font-semibold text-xs leading-tight truncate max-w-[100px] mx-auto">
                                {entry.subject?.name ?? '—'}
                              </p>
                              {(entry.faculty?.name || entry.department?.name) && (
                                <p className="text-[10px] opacity-70 truncate max-w-[100px] mx-auto mt-0.5">
                                  {role === 'STUDENT' ? entry.faculty?.name : entry.department?.name ?? `Sem ${entry.semester}`}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-200 dark:text-gray-700 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showManage && (
        <ManageModal
          onClose={() => setShowManage(false)}
          onSaved={() => { fetchEntries(); }}
        />
      )}
    </>
  );
}
