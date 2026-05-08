'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/ui/Card';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import api from '@/lib/axios';

const GRADE_COLORS = {
  S: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  A: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  C: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  D: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  E: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  F: 'bg-red-200 text-red-900 dark:bg-red-800/60 dark:text-red-200',
};

const cgpaColor = (cgpa) => {
  if (cgpa >= 9) return 'text-purple-600 dark:text-purple-400';
  if (cgpa >= 8) return 'text-green-600 dark:text-green-400';
  if (cgpa >= 7) return 'text-blue-600 dark:text-blue-400';
  if (cgpa >= 6) return 'text-yellow-600 dark:text-yellow-400';
  if (cgpa >= 5) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

export default function CGPAPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchCGPA(); }, []);

  const fetchCGPA = async () => {
    try {
      setLoading(true);
      const res = await api.get('/grades/calculate/me');
      setData(res.data.data);
    } catch {
      setError('Failed to load CGPA data. Marks may not be available yet.');
    } finally {
      setLoading(false);
    }
  };

  const sortedSemesters = data
    ? Object.entries(data.semesterGrades).sort(([a], [b]) => Number(a) - Number(b))
    : [];

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center gap-3 mb-8">
          <AcademicCapIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CGPA Calculator</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Computed from your semester marks on record</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-12 text-center text-gray-500 dark:text-gray-400">{error}</Card>
        ) : !data || sortedSemesters.length === 0 ? (
          <Card className="p-12 text-center text-gray-500 dark:text-gray-400">
            No marks available to compute CGPA.
          </Card>
        ) : (
          <>
            {/* Summary banner */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Cumulative GPA</p>
                    <p className={`text-6xl font-extrabold ${cgpaColor(data.cgpa)}`}>{data.cgpa.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">out of 10.00</p>
                  </div>
                  <div className="flex gap-8 text-center">
                    <div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.totalCredits}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Credits</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{sortedSemesters.length}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Semesters</p>
                    </div>
                  </div>
                </div>

                {/* SGPA trend bar */}
                <div className="mt-6">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">SGPA per Semester</p>
                  <div className="flex items-end gap-2 h-16">
                    {sortedSemesters.map(([sem, semData]) => {
                      const pct = (semData.sgpa / 10) * 100;
                      return (
                        <div key={sem} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{semData.sgpa}</span>
                          <div className="w-full rounded-t-sm bg-blue-500 dark:bg-blue-400 transition-all" style={{ height: `${Math.max(pct, 4)}%` }} />
                          <span className="text-xs text-gray-400">S{sem}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Per-semester breakdown */}
            <div className="space-y-6">
              {sortedSemesters.map(([sem, semData], idx) => (
                <motion.div key={sem} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className="overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Semester {sem}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{semData.subjects.length} subjects · {semData.credits} credits</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">SGPA</p>
                        <p className={`text-3xl font-extrabold ${cgpaColor(semData.sgpa)}`}>{semData.sgpa.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-white dark:bg-gray-900">
                          <tr className="text-xs uppercase text-gray-500 dark:text-gray-400">
                            <th className="px-6 py-3 text-left">Subject</th>
                            <th className="px-6 py-3 text-center">Credits</th>
                            <th className="px-6 py-3 text-center">Score %</th>
                            <th className="px-6 py-3 text-center">Grade</th>
                            <th className="px-6 py-3 text-center">Grade Point</th>
                            <th className="px-6 py-3 text-center">Credit Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {semData.subjects.map((sub, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                              <td className="px-6 py-3">
                                <p className="font-medium text-gray-900 dark:text-white">{sub.subject}</p>
                                {sub.subjectCode && <p className="text-xs text-gray-400">{sub.subjectCode}</p>}
                              </td>
                              <td className="px-6 py-3 text-center text-gray-700 dark:text-gray-300">{sub.credits}</td>
                              <td className="px-6 py-3 text-center text-gray-700 dark:text-gray-300">{sub.marks.toFixed(1)}%</td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${GRADE_COLORS[sub.grade] || GRADE_COLORS.F}`}>
                                  {sub.grade}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">{sub.gradePoint}</td>
                              <td className="px-6 py-3 text-center text-gray-700 dark:text-gray-300">{(sub.gradePoint * sub.credits).toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-600 dark:text-gray-400">
                          <tr>
                            <td className="px-6 py-2">Total</td>
                            <td className="px-6 py-2 text-center">{semData.credits}</td>
                            <td colSpan={3} />
                            <td className="px-6 py-2 text-center">{semData.gradePoints.toFixed(1)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Grading scale reference */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="p-5 mt-8">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Grading Scale</p>
                <div className="flex flex-wrap gap-2">
                  {[['S', '≥90', 10], ['A', '≥80', 9], ['B', '≥70', 8], ['C', '≥60', 7], ['D', '≥50', 6], ['E', '≥40', 5], ['F', '<40', 0]].map(([g, range, gp]) => (
                    <div key={g} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${GRADE_COLORS[g]}`}>
                      <span className="font-bold">{g}</span>
                      <span className="opacity-70">{range}% · {gp} pts</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
