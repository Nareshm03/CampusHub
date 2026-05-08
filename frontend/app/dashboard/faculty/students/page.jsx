'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

export default function FacultyStudentsPage() {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [search, setSearch] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) fetchStudents(selectedSubject);
    else setStudents([]);
  }, [selectedSubject]);

  async function fetchSubjects() {
    try {
      const { data } = await api.get('/subjects/faculty');
      const list = data.data || [];
      setSubjects(list);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  }

  async function fetchStudents(subjectId) {
    if (!subjectId) return;
    setLoadingStudents(true);
    try {
      const { data } = await api.get(`/subjects/${subjectId}/students`);
      setStudents(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      s.userId?.name?.toLowerCase().includes(q) ||
      s.usn?.toLowerCase().includes(q) ||
      s.userId?.email?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const selectedSubjectData = subjects.find(s => s._id === selectedSubject);

  return (
    <ProtectedRoute allowedRoles={['FACULTY']}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/faculty"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Faculty Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Lists</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View class rosters for your assigned subjects
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative sm:w-72">
            <BookOpenIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              disabled={loadingSubjects}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">
                {loadingSubjects ? 'Loading subjects...' : subjects.length === 0 ? 'No subjects assigned' : 'Select a subject'}
              </option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.subjectCode || s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, USN, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats bar */}
        {selectedSubject && !loadingStudents && students.length > 0 && (
          <div className="flex items-center gap-6 mb-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <UserGroupIcon className="h-4 w-4" />
              <strong className="text-gray-900 dark:text-white">{students.length}</strong> enrolled
            </span>
            {search && (
              <span>
                <strong className="text-gray-900 dark:text-white">{filtered.length}</strong> matching
              </span>
            )}
            {selectedSubjectData && (
              <span className="text-gray-500 dark:text-gray-400">
                {selectedSubjectData.name} · Sem {selectedSubjectData.semester}
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          {!selectedSubject ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpenIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Select a subject to view its student roster</p>
            </div>
          ) : loadingStudents ? (
            <div className="p-6 space-y-3 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AcademicCapIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {students.length === 0 ? 'No students enrolled in this subject' : 'No students match your search'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">USN</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.map((student, idx) => (
                    <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                              {student.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.userId?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                        {student.usn || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {student.userId?.email ? (
                          <a
                            href={`mailto:${student.userId.email}`}
                            className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <EnvelopeIcon className="h-3.5 w-3.5" />
                            {student.userId.email}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                          Sem {student.semester}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
