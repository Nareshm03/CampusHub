'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/ui/Card';
import { AcademicCapIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import api from '@/lib/axios';

export default function SemesterMarksPage() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [semesterStats, setSemesterStats] = useState({});

  useEffect(() => {
    fetchSemesterMarks();
  }, [selectedSemester]);

  const fetchSemesterMarks = async () => {
    try {
      setLoading(true);
      const url = selectedSemester 
        ? `/marks/my?semester=${selectedSemester}`
        : '/marks/my';
      
      const response = await api.get(url);
      const marksData = response.data.data || [];
      
      // Group marks by subject and merge internal1, 2, 3, and external
      const subjectMarks = {};
      marksData.forEach(mark => {
        const subjectId = mark.subject?._id;
        if (subjectId) {
          if (!subjectMarks[subjectId]) {
            subjectMarks[subjectId] = {
              _id: mark._id,
              subject: mark.subject,
              internal1: 0,
              internal2: 0,
              internal3: 0,
              external: 0,
              externalMax: 100
            };
          }
          if (mark.internal1 > 0) subjectMarks[subjectId].internal1 = mark.internal1;
          if (mark.internal2 > 0) subjectMarks[subjectId].internal2 = mark.internal2;
          if (mark.internal3 > 0) subjectMarks[subjectId].internal3 = mark.internal3;
          if (mark.external > 0) subjectMarks[subjectId].external = mark.external;
          if (mark.externalMax > 0) subjectMarks[subjectId].externalMax = mark.externalMax;
        }
      });
      
      const mergedMarks = Object.values(subjectMarks);
      setMarks(mergedMarks);
      
      // Group marks by semester and calculate stats
      const semStats = {};
      mergedMarks.forEach(mark => {
        const sem = mark.subject?.semester || 'Unknown';
        if (!semStats[sem]) {
          semStats[sem] = { subjects: 0, totalInternal: 0, totalExternal: 0, totalMarks: 0, totalMaxMarks: 0 };
        }
        semStats[sem].subjects++;
        const internalAvg = ((mark.internal1 || 0) + (mark.internal2 || 0) + (mark.internal3 || 0)) / 3;
        const extMax = mark.externalMax || 100;
        semStats[sem].totalInternal += internalAvg;
        semStats[sem].totalExternal += (mark.external || 0);
        semStats[sem].totalMarks += internalAvg + (mark.external || 0);
        semStats[sem].totalMaxMarks += 50 + extMax;
      });
      
      setSemesterStats(semStats);
    } catch (error) {
      console.error('Error fetching marks:', error);
      toast.error('Failed to fetch semester marks');
    } finally {
      setLoading(false);
    }
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'S', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
    if (percentage >= 80) return { grade: 'A', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    if (percentage >= 70) return { grade: 'B', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
    if (percentage >= 60) return { grade: 'C', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    if (percentage >= 50) return { grade: 'D', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
    if (percentage >= 40) return { grade: 'E', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    return { grade: 'F', color: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100' };
  };

  const calculateTotalMarks = (internal1, internal2, internal3, external) => {
    const internalAvg = ((internal1 || 0) + (internal2 || 0) + (internal3 || 0)) / 3;
    return internalAvg + (external || 0);
  };

  const groupedMarks = marks.reduce((acc, mark) => {
    const sem = mark.subject?.semester || 'Unknown';
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(mark);
    return acc;
  }, {});

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold">Semester Examination Marks</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">View your complete semester marks and grades</p>
            </div>
          </div>
          
          <div className="w-48">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600 dark:text-gray-400">Loading marks...</p>
          </div>
        ) : marks.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No marks available for the selected semester</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMarks).sort(([a], [b]) => a - b).map(([semester, semMarks]) => {
              const stats = semesterStats[semester] || {};
              const avgPercentage = stats.subjects > 0
                ? ((stats.totalMarks / stats.totalMaxMarks) * 100).toFixed(2)
                : 0;
              const gradeInfo = getGrade(parseFloat(avgPercentage));

              return (
                <Card key={semester} className="overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Semester {semester}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {stats.subjects} Subjects
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Overall Percentage</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgPercentage}%</p>
                          </div>
                          <span className={`inline-flex items-center px-4 py-2 text-lg font-bold rounded-lg ${gradeInfo.color}`}>
                            {gradeInfo.grade}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Subject
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Internal Avg
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            External
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Total / 150
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Percentage
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Grade
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {semMarks.map((mark) => {
                          const internalAvg = ((mark.internal1 || 0) + (mark.internal2 || 0) + (mark.internal3 || 0)) / 3;
                          const extMax = mark.externalMax || 100;
                          const total = internalAvg + (mark.external || 0);
                          const percentage = (((internalAvg / 50) + ((mark.external || 0) / extMax)) / 2 * 100).toFixed(2);
                          const gradeInfo = getGrade(parseFloat(percentage));

                          return (
                            <tr key={mark._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {mark.subject?.name || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {mark.subject?.subjectCode || ''}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  {internalAvg.toFixed(2)} / 50
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                                  {mark.external || 0} / {extMax}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-base font-bold text-gray-900 dark:text-white">
                                  {total.toFixed(2)} / {(50 + extMax)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                  {percentage}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${gradeInfo.color}`}>
                                  {gradeInfo.grade}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
